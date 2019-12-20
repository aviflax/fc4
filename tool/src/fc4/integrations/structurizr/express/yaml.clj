(ns fc4.integrations.structurizr.express.yaml
  (:require [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [includes?]]
            [cognitect.anomalies :as anom]
            [expound.alpha :refer [expound-str]]
            [fc4.util :refer [namespaces]]
            [fc4.yaml :as fy]))

;; This file refers to specs in the spec namespace `structurizr` that are
;; defined in the clojure file/ns that defines the namespace
;; fc4.integrations.structurizr.express.spec. *This* file/ns *cannot* require
;; *that* namespace because *that* file/ns requires this one, and that’d be
;; a dreaded cyclical dependency error. So this file/ns uses this spec namespace
;; by *reference* -- those specs may not actually exist (be registered) at
;; compile time, but they *must* have been registered at runtime.
;;
;; I know this is brittle; I’m open to suggestions.
(namespaces '[structurizr :as st])

(defn- wrap-coord-strings
  "If an entire value looks like a coordinate, wrap it in single quotes so as to
  force it to a string, because otherwise it might be parsed by Structurizr
  Express as a number, and therefore an invalid coordinate. e.g. `82,34` is a
  valid number in European locales, and some YAML parsers will therefore parse
  something like that as a number rather than a string."
  [s]
  (str/replace s #"([: '])(\d+,\d+)(['\s])" "$1'$2'$3"))

(defn fixup
  "Accepts a diagram as a YAML string and applies some custom formatting rules."
  [s]
  (-> s
      (wrap-coord-strings)
      (str/replace #"(elements|relationships|styles|size):" "\n$1:")
      (str/replace #"(description): Uses\n" "$1: uses\n")))

(def stringify (comp fixup fy/stringify))

(defn probably-diagram?
  "A fast and efficient but cursory check of whether a string seems likely to
  contain a Structurizr Express diagram definition."
  [s]
  (and (includes? s "type")
       (includes? s "scope")))

(s/fdef probably-diagram?
  :args (s/cat :v (s/or :is-diagram     :structurizr/diagram-yaml-str
                        :is-not-diagram string?))
  :ret  boolean?)

(defn valid?
  "Returns true if s is a valid Structurizr Express diagram specification in YAML format, otherwise
  return a :cognitect.anomalies/anomaly."
  [s]
  (if-not (probably-diagram? s)
    {::anom/category ::anom/fault
     ::anom/message  (str "A cursory check indicated that this is almost certainly not a valid"
                          " Structurizr Express diagram definition, as it doesn’t contain some"
                          " crucial keywords.")}
    (or (s/valid? ::st/diagram-yaml-str s)
        {::anom/category ::anom/fault
         ::anom/message  (expound-str ::st/diagram-yaml-str s)})))

(s/fdef valid?
  :args (s/cat :v (s/or :valid   ::st/diagram-yaml-str
                        :invalid string?))
  :ret  (s/or :valid   true?
              :invalid ::anom/anomaly)
  :fn   (fn [{{arg :v} :args, ret :ret}]
          (= (first arg) (first ret))))
