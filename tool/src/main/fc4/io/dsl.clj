(ns fc4.io.dsl
  "Provides all I/O facilities so that the other namespaces can be pure. The
  function specs are provided as a form of documentation and for instrumentation
  during development. They should not be used for generative testing."
  (:require [clj-yaml.core           :as yaml]
            [clojure.java.io         :refer [file]]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [clojure.string          :as str :refer [ends-with?]]
            [cognitect.anomalies     :as anom]
            [expound.alpha           :as expound :refer [expound-str]]
            [fc4.dsl                 :as dsl]
            [fc4.io.yaml             :as ioy :refer [yaml-files]]
            [fc4.model               :as m :refer [elements-from-file]]
            [fc4.spec                :as fs]
            [fc4.styles              :as st :refer [styles-from-file]]
            [fc4.util                :as u :refer [lookup-table-by]]
            [fc4.yaml                :as fy :refer [split-file]]
            [fc4.view                :as v :refer [view-from-file]])
  (:import [java.io FileNotFoundException]))

(defn- read-model-files
  "Recursively find, read, and parse YAML files under a directory tree. If a
  file contains “top matter” then only the main document is parsed. Performs
  no validation. If a file contains malformed YAML, throws."
  [root-path]
  (map #(-> (slurp %)
            (split-file)
            (::fy/main)
            (yaml/parse-string))
       (yaml-files root-path)))

(s/fdef read-model-files
  :args (s/cat :root-path ::fs/dir-path)
  :ret  (s/coll-of ::dsl/file-map))

(s/def ::invalid-result any?)

(s/def ::error
  (s/merge ::anom/anomaly (s/keys :req [::invalid-result])))

(defn- val-or-error
  [v spec]
  (if (s/valid? spec v)
    v
    {::anom/category ::anom/fault
     ::anom/message (expound-str spec v)
     ::invalid-result v}))

(defn read-model
  "Pass the path of a dir that contains one or more model YAML files, in any
  number of directories to any depth. Finds all those YAML files, parses them,
  validates them, and combines them together into an FC4 model. If any of the
  files are malformed, throws. If any of the file contents are invalid as per
  the specs in the fc4.dsl namespace, return an anom. Performs basic structural
  validation of the model and will return an anom if that fails, but does not
  perform semantic validation (e.g. are all the relationships resolvable)."
  [root-path]
  (let [model (m/build-model (read-model-files root-path))]
    (val-or-error model ::m/model)))

(s/fdef read-model
  :args (s/cat :root-path ::fs/dir-path)
  :ret  (s/or :success ::m/model
              :error   ::error))

(defn read-view
  [file-path]
  (-> (slurp file-path)
      (split-file)
      (get ::fy/main)
      (view-from-file)
      (val-or-error ::v/view)))

(s/fdef read-view
  :args (s/cat :file-path ::fs/file-path-str)
  :ret  (s/or :success ::v/view
              :error   ::error))

(defn read-styles
  [file-path]
  (-> (slurp file-path)
      (split-file)
      (get ::fy/main)
      (st/styles-from-file)
      (val-or-error ::st/styles)))

(s/fdef read-styles
  :args (s/cat :file-path ::fs/file-path-str)
  :ret  (s/or :success ::st/styles
              :error   ::error))

(comment
  (->> (yaml-files "test/data/model (valid)/users") (map str))
  (read-model-files "test/data/model (valid)"))
