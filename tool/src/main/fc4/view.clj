(ns fc4.view
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [fc4.model               :as m]
            [fc4.spec               :as fs]
            [fc4.util               :as util]))

(load "/fc4/integrations/structurizr/express/spec")

(s/def ::description ::fs/non-blank-str) ;; Could reasonably have linebreaks.

;; We need that generator! See comment in definition of ::m/name.
(s/def ::name ::m/name)
(s/def ::system ::m/name)

;; You might ask: why copy specs over from a different namespace? It’s because
;; when the views are parsed from YAML files and we end up with non-namespaced
;; keyword keys, and we then post-process them to qualify them with namespaces,
;; it’s impractical to qualify them with _different_ namespaces, so we’re going
;; to qualify them all with _the same_ namespace. Thus, that namespace needs to
;; include definitions for -all- the keys that appear in the YAML files.
(s/def ::coord-string ::fs/coord-string)

(s/def ::subject ::coord-string)
(s/def ::position-map (s/map-of ::name ::coord-string :gen-max 2))
(s/def ::users ::position-map)
(s/def ::containers ::position-map)
(s/def ::other-systems ::position-map)

(s/def ::positions
  (s/keys
  ; You might look at this and think that the keys in the `or` are mutually
  ; exclusive — that a valid value may contain only *one* of those keys. I tested
  ; this though, and that’s not the case. This merely states that in order to
  ; be considered valid, a value must contain at least one of the keys specified
  ; in the `or` — containing more than one, or all of them, is also valid. (I
  ; suppose it might be handy if s/keys supported `not` but in this case that’s
  ; not needed.) (Another possible useful feature for s/keys could be something
  ; like `one-of` as in “only one of”.)
   :req [(and ::subject (or ::users ::containers ::other-systems))]
   :opt [::users ::containers ::other-systems]))

(s/def ::control-point-seqs
  (s/coll-of (s/coll-of ::coord-string :min-count 1 :gen-max 3)
             :min-count 1
             :gen-max 3))

(s/def ::control-point-group
  (s/map-of ::name ::control-point-seqs
            :min-count 1
            :gen-max 3))

(s/def ::system-context ::control-point-group)
(s/def ::container (s/map-of ::name ::control-point-group))

(s/def ::control-points
  (s/keys
   :req [::system-context]
   :opt [::container]))

(s/def ::size :structurizr.diagram/size)

(s/def ::view
  (s/keys
   :req [::system ::positions ::control-points ::size]
   :opt [::description]))

(defn- fixup-keys
  "Finds any keyword keys that contain spaces and/or capital letters and
  replaces them with their string versions, because any such value is likely to
  be an element name, and we need those to be strings."
  [view]
  (util/update-all
   (fn [[k v]]
     (if (and (keyword? k)
              (re-seq #"[A-Z ]" (name k)))
       [(name k) v]
       [k v]))
   view))

(s/fdef fixup-keys
  :args (s/cat :m (s/map-of ::fs/unqualified-keyword any?))
  :ret  (s/map-of (s/or :keyword keyword? :string string?) any?)
  :fn   (fn [{{m :m} :args, ret :ret}]
          (and (= (count m) (count ret))
               (empty? (->> (keys ret)
                            (filter keyword?)
                            (map name)
                            (filter #(re-seq #"[A-Z ]" %)))))))

; We have to capture this at compile time in order for it to have the value we
; want it to; if we referred to *ns* in the body of a function then, because it
; is dynamically bound, it would return the namespace at the top of the stack,
; the “currently active namespace” rather than what we want, which is the
; namespace of this file, because that’s the namespace all our keywords are
; qualified with.
(def ^:private this-ns-name (str *ns*))

(defn view-from-file
  "Parses the contents of a YAML file, then processes those contents such that
  each element conforms to ::view."
  [file-contents]
  (-> (yaml/parse-string file-contents)
      ;; Both the below functions do a walk through the view; this is
      ;; redundant, duplicative, inefficient, and possibly slow. So this right
      ;; here is a potential spot for optimization.
      (fixup-keys)
      (util/qualify-keys this-ns-name)))

(s/def ::yaml-file-contents
  (s/with-gen
    ::fs/non-blank-str
    #(gen/fmap yaml/generate-string (s/gen ::view))))

(s/fdef view-from-file
  :args (s/cat :file-contents ::yaml-file-contents)
  :ret  ::view
  :fn   (fn [{{:keys [file-contents]} :args, ret :ret}]
          (= file-contents
             (yaml/generate-string ret))))
