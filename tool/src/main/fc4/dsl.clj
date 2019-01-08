(ns fc4.dsl
  (:require [clojure.spec.alpha :as s]
            [fc4.model :as m]))

;;;; Keys that may appear at the root of the YAML files:

; Singular
(s/def ::system     (s/map-of ::m/name ::m/system-map    :min-count 1 :max-count 1))
(s/def ::user       (s/map-of ::m/name ::m/user-map      :min-count 1 :max-count 1))
(s/def ::datastore  (s/map-of ::m/name ::m/datastore-map :min-count 1 :max-count 1))

; Plural
(s/def ::systems    (s/map-of ::m/name ::m/system-map    :min-count 2 :gen-max 3))
(s/def ::users      (s/map-of ::m/name ::m/user-map      :min-count 2 :gen-max 3))
(s/def ::datastores (s/map-of ::m/name ::m/datastore-map :min-count 2 :gen-max 3))

;;;; “Root map” of model YAML files:

(s/def ::file-map
  (s/and (s/keys :req [(or (or ::system    ::systems)
                           (or ::user      ::users)
                           (or ::datastore ::datastores))]
                 :opt [::system    ::systems
                       ::user      ::users
                       ::datastore ::datastores])
         (fn [v]
           (let [has? (partial contains? v)]
             (and (not-every? has? #{::system    ::systems})
                  (not-every? has? #{::user      ::users})
                  (not-every? has? #{::datastore ::datastores}))))))
