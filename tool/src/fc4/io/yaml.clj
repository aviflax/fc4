(ns fc4.io.yaml
  (:require [clojure.java.io :as io :refer [file output-stream]]
            [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [ends-with? includes?]]
            [cognitect.anomalies :as anom]
            [fc4.integrations.structurizr.express.spec] ; for side-effects
            [fc4.integrations.structurizr.express.yaml :as se-yaml]
            [fc4.io.util :refer [fail read-text-file]]
            [fc4.spec :as fs])
  (:import [java.io File]))

(defn yaml-file?
  [f]
  (and (.isFile (file f))
       (or (ends-with? f ".yaml")
           (ends-with? f ".yml"))))

(defn yaml-files
  "Accepts a directory as a path string or a java.io.File, returns a lazy sequence of java.io.File objects for
  all the YAML files in that dir or in any of its child dirs (recursively) to an unlimited depth."
  [dir]
  (->> (file dir)
       (file-seq)
       (filter yaml-file?)))

(s/fdef yaml-files
  :args (s/cat :dir ::fs/dir-path)
  :ret  (s/coll-of (partial instance? File)))

(defn validate
  "Thin wrapper for se-yaml/valid? that invokes fc4.io.util/fail if the supplied
  yaml is invalid."
  [yaml path]
  (let [result (se-yaml/valid? yaml)]
    (when-not (true? result)
      (fail path (::anom/message result)))))

(s/fdef validate
  :args (s/cat :yaml (s/or :valid :structurizr/diagram-yaml-str
                           :invalid string?)
               :path ::fs/non-blank-simple-str)
  :ret  (s/or :valid   nil?
              :invalid (partial instance? Exception))
  :fn   (fn [{{:keys [yaml path]} :args, ret :ret}]
          (and (= (first yaml) (first ret))
               (or (= (first yaml) :valid)
                   (includes? (.getMessage (second ret)) path)))))
