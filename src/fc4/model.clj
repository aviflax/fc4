(ns fc4.model
  (:require [clj-yaml.core :as yaml]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [includes?]]
            [cognitect.anomalies :as anom]
            [expound.alpha :as expound :refer [expound-str]]
            [fc4.schemata.core] ; for side-fx
            [fc4.util :as u :refer [fault fault?]]
            [fc4.yaml :as fy :refer [split-file]]
            [medley.core :refer [deep-merge]])
  (:import [org.yaml.snakeyaml.parser ParserException]))


(defn parse-file
  "Given a YAML model file as a string, parses it, and qualifies all map keys so that the result has
  a chance of being a valid ::file. If a file contains “top matter” then only the main document is
  parsed. Performs very minimal validation. If the file contains malformed YAML, or does not contain
  a map, an anomaly will be returned."
  [file-contents]
  (try
    (let [parsed (-> (split-file file-contents)
                     (::fy/main)
                     (yaml/parse-string))]
      (if (associative? parsed)
        (u/qualify-known-keys 'fc4.model parsed)
        (fault "Root data structure must be a map (mapping).")))
    (catch ParserException e
      (fault (str "YAML could not be parsed: error " e)))))

;; NB: this is used in at least one other namespace.
(s/def ::parse-file-result
  (s/or :invalid-or-malformed  ::anom/anomaly
        :valid-and-well-formed map?))

(s/fdef parse-file
  :args (s/cat :v (s/alt :valid-and-well-formed ::file-yaml-string
                         :invalid-or-malformed  string?))
  :ret  ::parse-file-result
  :fn   (fn [{{arg :v} :args, ret :ret}]
          (= (first arg) (first ret))))

(defn validate-parsed-file
  "Returns either an error message as a string or nil."
  [parsed]
  (cond
    (s/valid? ::file parsed)
    nil

    (fault? parsed)
    (::anom/message parsed)

    :else
    (expound-str ::file parsed {:print-specs? false})))

(s/def ::err-msg string?)

(s/fdef validate-parsed-file
  :args (s/cat :parsed (s/alt :valid   ::file
                              :invalid (s/and map? #(not (s/valid? ::file %)))))
  :ret  (s/or :valid   nil?
              :invalid ::err-msg)
  :fn   (fn [{{arg :parsed} :args, ret :ret}]
          (= (first arg) (first ret))))

(def empty-model
  #::m{:systems {} :services {} :people {} :datastores {} :datatypes {}})

(defn build-model
  "Accepts a sequence of maps read from model YAML files and combines them into
  a single model map. Does not validate the result."
  [model-file-maps]
  (reduce deep-merge empty-model model-file-maps))

(defn ^:private contains-contents?
  "Given a model and the contents of a parsed model DSL yaml file, a ::file-map, returns true if the
  model contains all the contents of the file-map."
  [model file-map]
  ;; Ideally the below would validate *fully* that each element in the file is fully contained in
  ;; the model. However, because an element can be defined in multiple files and therefore the
  ;; resulting element in the model is a composite (a result of deeply merging the various
  ;; definitions) I don’t know how to validate this. I guess I’m just not smart enough. I mean, I
  ;; suspect I could figure it out eventually given enough time — it’d probably have to do with
  ;; depth-first walking the file element and then confirming that the model contains the same value
  ;; at the same path. But I don’t have the time or energy to figure that out right now.
  ;; TODO: figure this out.
  (->> (for [[tk tm] file-map]
         (for [[k _v] tm]
           (contains? (get model tk {}) k)))
       (flatten)
       (every? true?)))

(s/fdef build-model
  :args (s/cat :in (s/coll-of ::file :gen-max 10))
  :ret  (s/or :success ::f/model
              :failure ::anom/anomaly)
  :fn   (fn [{{:keys [in]}      :args
              [ret-tag ret-val] :ret}]
          (and
           ; I saw, at least once, a case wherein the return value was both a valid model *and* a
           ; valid anomaly. We don’t want this.
           (not (and (s/valid? ::f/model ret-val)
                     (s/valid? ::anom/anomaly  ret-val)))
           (case ret-tag
             :success
             (every? #(contains-contents? ret-val %) in)

             :failure
             (includes? (or (::anom/message ret-val) "") "duplicate names")))))
