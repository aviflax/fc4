(ns fc4.dsl.view
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [fc4.spec                :as fs]
            [fc4.util                :as u]))

(u/namespaces '[fc4 :as f]
              '[fc4.view :as v])

;; You might ask: why copy specs over from a different namespace, rather than just use them as-is,
;; i.e. compose together various specs from various namespaces? It’s because when the views are
;; parsed from YAML files and we end up with non-namespaced keyword keys, and we then post-process
;; them to qualify them with namespaces, it’s impractical to qualify them with _different_
;; namespaces, so we’re going to qualify them all with _the same_ namespace. Thus, that namespace
;; needs to include definitions for -all- the keys that appear in the YAML files.
(s/def ::v/name ::fs/short-non-blank-simple-str)
(s/def ::v/ref ::v/name)

;; References to elements
(s/def ::v/system ::v/ref)
(s/def ::v/service ::v/ref)
(s/def ::v/people ::v/ref)
(s/def ::v/datastore ::v/ref)
(s/def ::v/datatype ::v/ref)

(s/def ::v/description ::fs/description)

(s/def ::v/coord-pair (s/coll-of ::fs/coord-int :count 2))

(s/def ::v/position-map (s/map-of ::v/ref ::v/coord-pair))
(s/def ::v/people ::v/position-map)
(s/def ::v/containers ::v/position-map)
(s/def ::v/services ::v/position-map)
(s/def ::v/systems ::v/position-map)
(s/def ::v/datastores ::v/position-map)
(s/def ::v/datatypes ::v/position-map)

(s/def ::v/positions
  (s/keys
  ; You might look at this and think that the keys in the `or` are mutually
  ; exclusive — that a valid value may contain only *one* of those keys. I tested
  ; this though, and that’s not the case. This merely states that in order to
  ; be considered valid, a value must contain at least one of the keys specified
  ; in the `or` — containing more than one, or all of them, is also valid. (I
  ; suppose it might be handy if s/keys supported `not` but in this case that’s
  ; not needed.) (Another possible useful feature for s/keys could be something
  ; like `one-of` as in “only one of”.)
   :req [(or ::v/people ::v/containers ::v/systems ::v/services ::v/datastores ::v/datatypes)]
   :opt [::v/people ::v/containers ::v/systems ::v/services ::v/datastores ::v/datatypes]))

(s/def ::v/control-point-groups
  (s/map-of ::v/ref
            (s/map-of ::v/ref
                      (s/coll-of ::v/coord-pair :min-count 1)
                      :min-count 1)))

(s/def ::v/context ::v/control-point-groups) ;; for System Context diagrams
(s/def ::v/container ::v/control-point-groups) ;; For Container diagrams

(s/def ::v/control-points
  (s/keys
   :req [(or ::v/context ::v/container)]
   :opt [::v/context ::v/container]))

(s/def ::v/size any?) ;; TODO!

(s/def ::f/view
  (s/keys
   :req [(or ::v/system ::v/service ::v/datastore ::v/datatype)
         ::v/positions ::v/control-points ::v/size]
   :opt [::v/description]))

(defn parse-file
  "Parses the contents of a YAML file, then processes those contents such that
  the result conforms to ::f/view."
  [file-contents]
  (->> (yaml/parse-string file-contents)
       (u/qualify-known-keys 'fc4.view)))

(s/def ::v/yaml-file-string
  (s/with-gen
    ::fs/non-blank-str
    #(gen/fmap yaml/generate-string (s/gen ::f/view))))

(s/fdef parse-file
  :args (s/cat :file-contents ::v/yaml-file-string)
  :ret  ::f/view)
