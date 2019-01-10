(ns fc4.dsl
  (:require [clj-yaml.core :as yaml]
            [clojure.spec.alpha :as s]
            [fc4.model :as m]
            [fc4.util :as u :refer [map-vals qualify-keys]]
            [fc4.yaml :as fy :refer [split-file]]))

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

(defn parse-model-file
  [file-contents]
  (let [parsed (-> (split-file file-contents)
                   (::fy/main)
                   (yaml/parse-string))]
    (if (associative? parsed)
      (map-vals #(qualify-keys % "fc4.model") parsed)
      parsed)))
