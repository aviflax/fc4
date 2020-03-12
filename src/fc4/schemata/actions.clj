(ns fc4.schemata.actions
  (:require [clojure.spec.alpha :as s]
            [fc4.schemata.core] ; for side-fx
            [fc4.util :as u]))

(u/namespaces '[fc4 :as f]
              '[fc4.decision :as fd]
              '[fc4.recommendation :as fr])

(s/def ::f/recommendation
  (s/keys :req [::f/id ::fr/type ::f/technology]
          :opt [::f/comments]))

(s/def ::fr/type
  #{;; A recommendation to use the subject.
    "adopt"

    ;; For subjects that we are actively using in production, but which we aren't yet ready to
    ;; recommend for wholesale adoption.
    "trial"

    ;; For subjects that we are investigating, perhaps as part of a spike or other effort. We use
    ;; this ring to show what we are actively considering, to collaborate with others, and to seek
    ;; feedback.
    "assess"

    ;; For subjects that we do not recommend for anything new. We may already be using these in
    ;; production, and in these cases usage is acceptable, but by placing a subject in this ring, we
    ;; require strong and compelling reasons for any further adoption.
    "hold"})

(s/def ::f/decision
  (s/keys :req [::fd/type ::fr/ref]
          :opt [::f/comments]))

(s/def ::fr/ref ::f/id) ;; A reference to a recommendation by ID.
