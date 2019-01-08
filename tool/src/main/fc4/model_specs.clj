(ns fc4.model
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [fc4.spec               :as fs]
            [fc4.util               :as fu :refer [lookup-table-by]]))

(s/def ::name
  (s/with-gen
    ::fs/short-non-blank-simple-str
    ;; This needs to generate a small and stable set of names so that the
    ;; generated relationships have a chance of being valid — or at least useful.
    #(gen/elements ["A" "B"])))

(s/def ::description ::fs/non-blank-str) ;; Could reasonably have linebreaks.

(s/def ::simple-strings
  (s/coll-of ::fs/short-non-blank-simple-str :gen-max 11))

(s/def ::short-simple-keyword
  (s/with-gen
    (s/and keyword?
           (comp (partial s/valid? ::fs/short-non-blank-simple-str) name))
    #(gen/fmap keyword (s/gen ::fs/short-non-blank-simple-str))))

(s/def ::small-set-of-keywords
  (s/coll-of ::short-simple-keyword
             :distinct true
             :kind set?
             :gen-max 10))

(s/def ::repos ::small-set-of-keywords)

(s/def ::tag
  (s/with-gen ::short-simple-keyword
    #(gen/one-of [(s/gen ::short-simple-keyword)
                  ; The below tags have special meaning so it’s important that
                  ; they’re sometimes generated.
                  (gen/return :external)
                  (gen/return :internal)])))

(s/def ::tags
  (s/coll-of ::tag
             :distinct true
             :kind set?
             :gen-max 10))

(s/def ::system ::name)
(s/def ::container ::name)
(s/def ::technology ::fs/non-blank-simple-str)

(s/def ::sys-ref
  (s/keys :req [::system]
          :opt [::container ::technology ::description]))

(s/def ::uses
  (s/with-gen
    (s/coll-of ::sys-ref :kind set?)
    #(gen/set (s/gen ::sys-ref) {:min-elements 0 :max-elements 2})))

(s/def ::container-map
  (s/keys
   :req [::name]
   :opt [::description ::technology ::uses]))

;;; Order doesn’t really matter here, that’s why it’s a set. Maybe it should be
;;; a map of container names to container-map... that would be consistent with
;;; ::systems.
(s/def ::containers
  (s/coll-of ::container-map :kind set? :gen-max 2))

(s/def ::entity-type #{:system :user})

(s/def ::type ::entity-type)

(s/def ::element
  (s/or :system ::system-map
        :user   ::user))

; (s/def ::element-yaml-string
;   (s/with-gen
;     ::fs/non-blank-str
;     #(gen/fmap yaml/generate-string (s/gen ::element))))
; 
; (s/def ::elements-yaml-string
;   (s/with-gen
;     ::fs/non-blank-str
;     #(gen/fmap yaml/generate-string (s/gen (s/coll-of ::element)))))
; 
; (s/def ::yaml-file-contents
;   (s/with-gen
;     ::fs/non-blank-str
;     #(gen/one-of (map s/gen [::element-yaml-string ::elements-yaml-string]))))

(s/def ::system-map
  (s/and
   (s/keys :req [::description]
           :opt [::containers ::repos ::tags ::uses])
   #(= (::type %) :system)))

(s/def ::systems
  (s/with-gen
    (s/map-of ::name ::system-map :min-count 1)
    #(gen/fmap (partial lookup-table-by ::name)
               (s/gen (s/coll-of ::system-map
                                 ; Really just trying to influence the
                                 ; cardinality of the generated value... this
                                 ; might be a silly way to do it — should
                                 ; probably use a more explicit approach.
                                 :min-count 2 :max-count 2)))))

(s/def ::user-map
  ;; ::uses is required because in FC4 there’s no point in describing a user
  ;; unless they *use* one or more systems.
  ;; TODO: should probably use a different variant of ::uses
  ;; (i.e. :fc4.model.user/uses) that requires at least one element. Right now
  ;; because ::uses is shared between ::user and ::system-map, it has to allow
  ;; empty, because postel’s law.
  (s/keys :req [::description ::uses]
          :opt [::tags]))

(s/def ::user
  (s/map-of ::name ::user-map :min-count 1 :max-count 1))

(s/def ::users
  (s/map-of ::name ::user-map :min-count 2))

(s/def file-root
  (s/and (s/keys :req [(or (or ::system      ::systems)
                           (or ::user        ::users)
                           (or ::data-system ::data-systems))]
                 :opt [::system      ::systems
                       ::user        ::users
                       ::data-system ::data-systems])
         (fn [v]
           (let [has? (partial contains v)]
             (and (not-every? has? #{::system      ::systems})
                  (not-every? has? #{::user        ::users})
                  (not-every? has? #{::data-system ::data-systems}))))))

(s/def ::model
  (let [spec (s/keys :req [::systems ::users])]
    (s/with-gen
      spec
      (fn []
        (gen/fmap
         (fn [m]
             ; let’s make the model make sense
           (let [sys-names (take 2 (keys (::systems m)))]
             (-> (update m ::systems #(select-keys % sys-names))
                 (update-in [::systems (first sys-names) ::uses] empty)
                 (update-in [::systems (second sys-names) ::uses]
                            (fn [_] #{{::system (first sys-names)}})))))
         (s/gen spec))))))
