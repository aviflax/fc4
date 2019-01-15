(ns fc4.dsl
  (:require [clj-yaml.core :as yaml]
            [clojure.set :refer [intersection superset?]]
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [includes? join starts-with?]]
            [cognitect.anomalies :as anom]
            [expound.alpha :as expound :refer [expound-str]]
            [fc4.model :as m]
            [fc4.util :as u :refer [fault fault? qualify-keys]]
            [fc4.yaml :as fy :refer [split-file]]
            [medley.core :refer [map-vals]])
  (:import [org.yaml.snakeyaml.parser ParserException]))

;;;; Keys that may appear at the root of the YAML files:

; Singular — these are unique to the DSL
(s/def ::system     (s/map-of ::m/name ::m/system-map    :min-count 1 :max-count 1))
(s/def ::user       (s/map-of ::m/name ::m/user-map      :min-count 1 :max-count 1))
(s/def ::datastore  (s/map-of ::m/name ::m/datastore-map :min-count 1 :max-count 1))

; Plural — these are nearly identical to the corresponding keys in fc4.model;
; the only differences are cardinalities.
(s/def ::systems    (s/map-of ::m/name ::m/system-map    :min-count 2 :gen-max 3))
(s/def ::users      (s/map-of ::m/name ::m/user-map      :min-count 2 :gen-max 3))
(s/def ::datastores (s/map-of ::m/name ::m/datastore-map :min-count 2 :gen-max 3))

;;;; “Root map” of model YAML files:
(s/def ::file-map
  (s/and (s/keys :req-un [(or (or ::system    ::systems)
                              (or ::user      ::users)
                              (or ::datastore ::datastores))]
                 :opt-un [::system    ::systems
                          ::user      ::users
                          ::datastore ::datastores])
         (fn [v]
           (let [has? (partial contains? v)]
             (and (not-every? has? #{:system    :systems})
                  (not-every? has? #{:user      :users})
                  (not-every? has? #{:datastore :datastores}))))))

(s/def ::file-map-yaml-string
  (s/with-gen
    ;; This spec exists mainly for the use of its generator, so valid inputs can
    ;; be generated and passed to parse-model-file during generative testing.
    ;; That said, the predicate also needs to be able to reject obviously
    ;; invalid values, so as to make the conformance of the generated args
    ;; accurate during generative testing. In other words, the specs in the
    ;; fdef for parse-model-file include an s/or, which will sort of “classify”
    ;; an argument according to the first spec that it validates against, so we
    ;; need values like "" and "foo" to be invalid as per this spec.
    (s/and string?
           (fn [v] (some #(starts-with? v %) ["system" "user" "datastore"])))
    #(gen/fmap yaml/generate-string (s/gen ::file-map))))

(defn parse-model-file
  "Given a YAML model file as a string, parses it, and qualifies all map keys
  except those at the root so that the result has a chance of being a valid
  ::file-map. If a file contains “top matter” then only the main document is
  parsed. Performs very minimal validation. If the file contains malformed YAML,
  or does not contain a map, an anomaly will be returned."
  [file-contents]
  (try
    (let [parsed (-> (split-file file-contents)
                     (::fy/main)
                     (yaml/parse-string))]
      (if (associative? parsed)
        (map-vals #(qualify-keys % "fc4.model") parsed)
        (fault "Root data structure must be a map (mapping).")))
    (catch ParserException e
      (fault (str "YAML could not be parsed: error " e)))))

(s/fdef parse-model-file
  :args (s/cat :v (s/alt :valid-and-well-formed ::file-map-yaml-string
                         :invalid-or-malformed  string?))
  :ret  (s/or :valid-and-well-formed ::file-map
              :invalid-or-malformed  ::anom/anomaly)
  :fn   (fn [{{arg :v} :args, ret :ret}]
          (= (first arg) (first ret))))

(defn validate-parsed-file
  "Returns either an error message as a string or nil."
  [parsed]
  (cond
    (s/valid? ::file-map parsed)
    nil

    (fault? parsed)
    (::anom/message parsed)

    :else
    (expound-str ::file-map parsed)))

(s/fdef validate-parsed-file
  :args (s/cat :parsed (s/alt :valid   ::file-map
                              :invalid map?))
  :ret  (s/or                 :valid   nil?
                              :invalid string?)
  :fn   (fn [{{arg :parsed} :args, ret :ret}]
          (= (first arg) (first ret))))

(def ^:private dsl-to-model-maps-singular
  {:system    ::m/systems
   :user      ::m/users
   :datastore ::m/datastores})

(def ^:private dsl-to-model-maps-plural
  {:systems    ::m/systems
   :users      ::m/users
   :datastores ::m/datastores})

(def ^:private dsl-to-model-maps
  (merge dsl-to-model-maps-singular
         dsl-to-model-maps-plural))

(defn add-file-map
  "Adds the elements from a parsed DSL file to a model. If one of the elements
  is already present (by name) then an anomaly is returned."
  [model file-map]
  (reduce
   (fn [model [src dest]]
     (let [src-map (get file-map src {})
           dest-map (get model dest)
           keys-in-both (intersection (set (keys src-map))
                                      (set (keys dest-map)))]
       (if (seq keys-in-both)
         (reduced (fault (str "Cannot build model because of duplicate names "
                              (join "," keys-in-both))))
         (update model dest merge src-map))))
   model
   dsl-to-model-maps))

(defn ^:private contains-contents?
  "Given a model (or proto-model) and the contents of a parsed model DSL yaml
  file, a ::file-map, returns true if the model contains all the contents of
  the file-map."
  [model file-map]
  (->> (concat
        (for [[src dest] dsl-to-model-maps-singular]
          (when-let [[k v] (first (src file-map))]
            (= v (get-in model [dest k]))))
        (for [[src dest] dsl-to-model-maps-plural]
          (when-let [in (src file-map)]
            (superset? (set (dest model)) (set in)))))
       (flatten)
       (remove nil?)
       (every? true?)))

(s/fdef add-file-map
  :args (s/cat :pmodel   ::m/proto-model
               :file-map ::file-map)
  :ret  (s/or :success ::m/proto-model
              :failure ::anom/anomaly)
  :fn   (fn [{{:keys [pmodel file-map]} :args
              [ret-tag ret-val]         :ret}]
          (and
           ; The :ret spec allows the return value to be either a proto-model
           ; or a valid anomaly. If a value is passed to it that is actually
           ; both a valid proto-model *and* a valid anomaly, it will be
           ; considered valid by the spec, and will be tagged as a :success,
           ; but only because :success is the first spec in the or. So let’s
           ; just ensure this doesn’t happen.
           (not (and (s/valid? ::m/proto-model ret-val)
                     (s/valid? ::anom/anomaly  ret-val)))
           (case ret-tag
             ;; TODO: also validate that ret-val contains the contents of pmodel.
             :success
             (contains-contents? ret-val file-map)

             ;; TODO: also validate that the inputs do indeed have duplicate keys
             :failure
             (includes? (or (::anom/message ret-val) "") "duplicate names")))))

(defn build-model
  "Accepts a sequence of maps read from model YAML files and combines them into
  a single model map. If any name collisions are detected then an anomaly is
  returned. Does not validate the result."
  [file-maps]
  (reduce
   (fn [model file-map]
     (let [result (add-file-map model file-map)]
       (if (fault? result)
         (reduced result)
         result)))
   (m/empty-model)
   file-maps))

(s/fdef build-model
  :args (s/cat :in (s/coll-of ::file-map))
  :ret  (s/or :success ::m/proto-model
              :failure ::anom/anomaly)
  :fn   (fn [{{:keys [in]}      :args
              [ret-tag ret-val] :ret}]
          (and
           ; I saw, at least once, a case wherein the return value was  both a
           ; valid proto-model *and* a valid anomaly. We don’t want this.
           (not (and (s/valid? ::m/proto-model ret-val)
                     (s/valid? ::anom/anomaly  ret-val)))
           (case ret-tag
             :success
             (every? #(contains-contents? ret-val %) in)

             :failure
             (includes? (or (::anom/message ret-val) "") "duplicate names")))))
