(ns fc4.view
  (:require [clojure.spec.alpha :as s]
            ; This ns is required solely for the side fx of loading the file:
            ; registering the desired specs in the spec registry.
            [fc4.integrations.structurizr.express.spec]
            [fc4.spec :as fs]
            [fc4.util :refer [namespaces]]))

(namespaces '[structurizr :as st])

;; You might ask: why copy specs over from a different namespace? It’s because
;; when the views are parsed from YAML files and we end up with non-namespaced
;; keyword keys, and we then post-process them to qualify them with namespaces,
;; it’s impractical to qualify them with _different_ namespaces, so we’re going
;; to qualify them all with _the same_ namespace. Thus, that namespace needs to
;; include definitions for -all- the keys that appear in the YAML files.
(s/def ::name ::st/name)
(s/def ::system ::st/name)
(s/def ::description ::st/description)
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
