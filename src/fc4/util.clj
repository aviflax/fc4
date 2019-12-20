(ns fc4.util
  (:require [clojure.walk        :as walk  :refer [postwalk]]
            [clojure.spec.alpha  :as s]
            [cognitect.anomalies :as anom]
            [fc4.spec            :as fs])
  (:import [java.util.concurrent TimeoutException]))

(s/def ::ns-tuples
  (s/+ (s/tuple simple-symbol? #{:as} simple-symbol?)))

;; TODO: consider making this a macro so the ns-symbols won’t have to be quoted
;; when calling them.
(defn namespaces
  "Pass one or more tuples of namespaces to create along with aliases:
  (namespaces '[foo :as f] '[bar :as b])"
  [t & ts] ; At least one tuple is required.
  {:pre [(s/valid? ::ns-tuples (concat [t] ts))]}
  (doseq [[ns-sym _ alias-sym] (concat [t] ts)]
    (create-ns ns-sym)
    (alias alias-sym ns-sym)))

; This spec is here for documentation and instrumentation; don’t do any
; generative testing with this spec because this function has side effects (and
; is mutating the state of the current namespace, and can thus fail in all sorts
; of odd ways).
(s/fdef namespaces
  :args (s/cat :args ::ns-tuples)
  :ret  nil?)

(defn lookup-table-by
  "Given a function and a seqable, returns a map of (f x) to x.

  For example:
  => (lookup-table-by :name [{:name :foo} {:name :bar}])
  {:foo {:name :foo}, :bar {:name :bar}}"
  [f xs]
  (zipmap (map f xs) xs))

(defn add-ns
  [namespace keeword]
  (keyword (name namespace) (name keeword)))

(s/def ::keyword-or-simple-string
  (s/or :keyword keyword?
        :string  ::fs/non-blank-simple-str))

(s/fdef add-ns
  :args (s/cat :namespace ::keyword-or-simple-string
               :keyword   ::keyword-or-simple-string)
  :ret  qualified-keyword?)

(defn update-all
  "Given a map and a function of entry to entry, applies the function recursively to every entry in
  the map, including in nested maps, to infinite depth."
  {:fork-of 'clojure.walk/stringify-keys}
  [f m]
  (postwalk
   (fn [x]
     (if (map? x)
       (into {} (map f x))
       x))
   m))

(s/def ::map-entry
  (s/tuple any? any?))

(s/fdef update-all
  :args (s/cat :fn (s/fspec :args (s/cat :entry ::map-entry)
                            :ret  ::map-entry)
               :map map?)
  :ret  map?)

(defn qualify-keys
  "Given a nested map with keyword keys, qualifies all keys, recursively, with the given namespace."
  [m ns-name]
  (update-all
   (fn [[k v]]
     (if (and (keyword? k)
              (not (qualified-keyword? k)))
       [(add-ns ns-name k) v]
       [k v]))
   m))

(s/fdef qualify-keys
  :args (s/cat :map (s/map-of keyword? any?)
               :ns-name ::fs/non-blank-simple-str)
  :ret  (s/map-of qualified-keyword? any?))

;; TODO: SPEC
(defn qualify-known-keys
  "Qualifies each keyword key using the supplied namespace, then checks if a corresponding spec
  exists for the resulting qualified keyword. If it does, then it replaces the key with the
  qualified key. If it does not, then use the string version of the keyword, because it’s not a
  “keyword” of the DSL, so it’s probably a name or a tag name (key)."
  [the-ns m]
  (update-all
   (fn [[k v]]
     (let [qualified (add-ns (str (name the-ns)) k)]
       (if (s/get-spec qualified)
         [qualified v]
         [(name k) v])))
   m))

; Rebind for testing. See docstring of `fail` below for explanation.
(def ^:dynamic *throw-on-fail* true)

(defn fail
  "Convenience function that makes throwing exceptions more concise in code but also enables
  functions that might throw exceptions at runtime to be tested using property testing by returning
  the exception rather than throwing it, since clojure.spec.test.alpha/check doesn’t currently
  support testing functions that sometimes throw."
  ([msg]
   (fail msg {} nil))
  ([msg data]
   (fail msg data nil))
  ([msg data cause]
   (let [e (if cause
             (ex-info msg data cause)
             (ex-info msg data))]
     (if *throw-on-fail*
       (throw e)
       e))))

(defmacro with-timeout
  "If the timeout elapses before the body has completed, a TimeoutException will be thrown with a
  not-particularly-helpful message."
  ;; To consider: perhaps we should include part of the body in the exception message?
  {:derived-from "https://stackoverflow.com/q/6694530/7012"}
  [ms body]
  `(let [fut# (future ~body)
         ret# (deref fut# ~ms ::timed-out)]
     (when (= ret# ::timed-out)
       (future-cancel fut#)
       (throw (TimeoutException. (format "Timed out after %d millis" ~ms))))
     ret#))

(defn fault
  "Given a message, returns a :cognitect.anomalies/anomaly with :anom/category
  set to ::anom/fault and ::anom/message set to the provided message."
  [msg]
  {::anom/category ::anom/fault
   ::anom/message  msg})

(s/fdef fault
  :args (s/cat :msg string?)
  :ret  ::anom/anomaly)

(defn fault?
  [v]
  (s/valid? ::anom/anomaly v))
