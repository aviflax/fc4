(ns fc4.model
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [fc4.spec                :as fs]))

(s/def ::description ::fs/non-blank-str) ;; Could reasonably have linebreaks.

(s/def ::simple-strings
  (s/coll-of ::fs/short-non-blank-simple-str :gen-max 11))

(s/def ::short-simple-keyword
  (s/with-gen
    (s/and keyword?
           (comp (partial s/valid? ::fs/short-non-blank-simple-str) name))
    #(gen/fmap keyword (s/gen ::fs/short-non-blank-simple-str))))

(s/def ::name
  (s/with-gen
    (s/or :string  ::fs/short-non-blank-simple-str
          :keyword ::short-simple-keyword)
    ;; This needs to generate a small and stable set of names so that the
    ;; generated relationships have a chance of being valid — or at least useful.
    #(gen/elements [:A :B :C :D :E :F])))

(s/def ::small-set-of-keywords
  (s/coll-of ::short-simple-keyword
             :distinct true
             :kind set?
             :gen-max 10))

(s/def ::repos (s/coll-of ::fs/short-non-blank-simple-str :gen-max 3))

(s/def ::tag
  (s/with-gen ::short-simple-keyword
    #(gen/one-of [(s/gen ::short-simple-keyword)
                  ; The below tags have special meaning so it’s important that
                  ; they’re sometimes generated.
                  (gen/return :external)
                  (gen/return :internal)])))

(s/def ::tags
  (s/map-of ::tag
            (s/or :string  ::fs/short-non-blank-simple-str
                  :boolean boolean?)
            :distinct true
            :gen-max 5))

(s/def ::system ::name)
(s/def ::container ::name)
(s/def ::protocol ::fs/non-blank-simple-str)

(s/def ::relationship-purpose ::fs/non-blank-str)
(s/def ::to   ::relationship-purpose)
(s/def ::for  ::relationship-purpose)
(s/def ::what ::relationship-purpose)

(s/def ::uses
  (s/map-of ::name
            (s/keys :req [::to] :opt [::container ::protocol])
            :min-elements 1 :max-gen 2))

(s/def ::depends-on
  (s/map-of ::name
            (s/keys :req [::for] :opt [::container ::protocol])
            :min-elements 1 :max-gen 2))

(s/def ::reads-from
  (s/map-of ::name
            (s/keys :req [::what] :opt [::protocol])
            :min-elements 1 :max-gen 2))

(s/def ::writes-to
  (s/map-of ::name
            (s/keys :req [::what] :opt [::protocol])
            :min-elements 1 :max-gen 2))

(s/def ::all-relationships
  (s/keys :opt [::uses ::depends-on ::reads-from ::writes-to]))

(s/def ::element
  (s/keys :req [::description]
          :opt [::tags]))

(s/def ::container-map
  (s/merge ::element
           ::all-relationships
           (s/keys :opt [::repos])))

(s/def ::containers
  (s/map-of ::name ::container-map :min-count 1 :gen-max 2))

(s/def ::system-map
  (s/merge ::element
           ::all-relationships
           (s/keys :opt [::containers ::repos])))

(s/def ::user-map
  (s/merge ::element
           ; I could maybe be convinced that the other kinds of relationships
           ; are valid for users, but we’ll see.
           (s/keys :opt [::uses])))

(s/def ::datastore-map
  ; I guess *maybe* a datastore could have a depends-on relationship? Not sure;
  ; I’d prefer to start by modeling datastores as fundamentally passive.
  (s/merge ::element
           (s/keys :opt [::repos])))

(s/def ::systems    (s/map-of ::name ::system-map    :gen-max 3))
(s/def ::users      (s/map-of ::name ::user-map      :gen-max 3))
(s/def ::datastores (s/map-of ::name ::datastore-map :gen-max 3))

;;; TODO: EXPLAIN
(s/def ::proto-model
  (s/keys :req [::systems ::users ::datastores]))

(s/def ::model
  (s/and ::proto-model
         ; A valid model must have at least one system and at least one user.
         #(seq (::systems %))
         #(seq (::users %))))
  ;; THIS WAS USED to make the relationships in the model valid. We might need this.
    ; ]
    ; (s/with-gen
    ;   spec
    ;   (fn []
    ;     (gen/fmap
    ;      (fn [m]
    ;          ; let’s make the relationships in the model valid
    ;        (let [sys-names (take 2 (keys (::systems m)))]
    ;          (-> (update m ::systems #(select-keys % sys-names))
    ;              (update-in [::systems (first sys-names) ::uses] empty)
    ;              (update-in [::systems (second sys-names) ::uses]
    ;                         (fn [_] #{{::system (first sys-names)}})))))
    ;      (s/gen spec))))))
