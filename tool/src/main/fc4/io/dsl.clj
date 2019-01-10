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
            [fc4.dsl                 :as dsl :refer [parse-model-file]]
            [fc4.io.yaml             :as ioy :refer [yaml-files]]
            [fc4.model               :as m]
            [fc4.spec                :as fs]
            [fc4.styles              :as st :refer [styles-from-file]]
            [fc4.util                :as u :refer [fault]]
            [fc4.yaml                :as fy :refer [split-file]]
            [fc4.view                :as v :refer [view-from-file]]
            [medley.core                   :refer [map-vals remove-vals]])
  (:import [java.io FileNotFoundException]))

(defn- read-model-files
  "Recursively find, read, and parse YAML files under a directory tree. If a
  file contains “top matter” then only the main document is parsed. Performs
  very minimal validation. Returns a map of file-path-str to value-or-anomaly."
  [root-path]
  (reduce
   (fn [m path]
     (assoc m
            (str path)
            (parse-model-file (slurp path))))
   {}
   (yaml-files root-path)))

(s/def ::file-path string?) ; TODO: use spec from fc4.spec instead

(s/def ::parsed-model-files
  (s/map-of ::file-path
            (s/or :success ::file-content-maps-with-paths
                  :failure ::anom/anomaly)))

(s/fdef read-model-files
  :args (s/cat :root-path ::fs/dir-path)
  :ret  ::parsed-model-files)

(s/def ::details any?)
(s/def ::invalid-result any?)
(s/def ::error
  (s/merge ::anom/anomaly
           (s/keys :opt [::details ::invalid-result])))

(defn- val-or-error
  [v spec]
  (if (s/valid? spec v)
    v
    (assoc (fault (expound-str spec v))
           ::invalid-result v)))

(defn validate-model-files
  "Accepts a map of file paths to parsed file contents (or errors) and returns a
  map of file paths to error messages. If all values are valid, an empty map is
  returned."
  [parsed-file-contents]
  (remove-vals nil?
               (map-vals dsl/validate-model-file parsed-file-contents)))

(defn uber-error-message
  [validation-results]
  (reduce
   (fn [msg [file-path file-msg]]
     (str msg "\n\n»»»»»» " file-path " »»»»»»\n\n" file-msg "\n"))
   "Errors were found in some model files:"
   validation-results))

(defn read-model
  "Pass the path of a dir that contains one or more model YAML files, in any
  number of directories to any depth. Finds all those YAML files, parses them,
  validates them, and combines them together into an FC4 model. If any of the
  files are malformed, throws. If any of the file contents are invalid as per
  the specs in the fc4.dsl namespace, return an anom. Performs basic structural
  validation of the model and will return an anom if that fails, but does not
  perform semantic validation (e.g. are all the relationships resolvable)."
  [root-path]
  (let [model-files (read-model-files root-path)
        validation-results (validate-model-files model-files)]
    (if-not (empty? validation-results)
      (assoc (fault (uber-error-message validation-results))
             ::details validation-results)
      (val-or-error (m/build-model (map second model-files))
                    ::m/model))))

(s/fdef read-model
  :args (s/cat :root-path ::fs/dir-path)
  :ret  (s/or :success ::m/model
              :failure ::error))

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
