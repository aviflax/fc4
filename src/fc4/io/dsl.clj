(ns fc4.io.dsl
  "Provides all I/O facilities so that the other namespaces can be pure. The
  function specs are provided as a form of documentation and for instrumentation
  during development. They should not be used for generative testing."
  (:require [clojure.spec.alpha      :as s]
            [clojure.string          :as str]
            [cognitect.anomalies     :as anom]
            [expound.alpha           :as expound :refer [expound-str]]
            [fc4.dsl.model           :as m]
            [fc4.dsl.style           :as st]
            [fc4.dsl.view            :as v]
            [fc4.io.yaml             :as fiy]
            [fc4.spec                :as fs]
            [fc4.util                :as u   :refer [fault]]
            [medley.core                     :refer [map-vals remove-vals]]))

(u/namespaces '[fc4 :as f])

(defn- read-model-files
  "Recursively find, read, and parse YAML files under a directory tree. If a
  file contains “front matter” then only the main document is parsed. Performs
  very minimal validation. Returns a map of file-path-str to values that are maps that might be
  valid :fc4.dsl.model/files or instances of :cognitect.anomalies/anomaly."
  [root-path]
  (reduce
   (fn [results path]
     (assoc results
            (str path)
            (m/parse-file (slurp path))))
   {}
   (fiy/yaml-files root-path)))

(s/def ::read-model-files-result
  (s/map-of ::fs/file-path-str ::m/parse-file-result
            :gen-max 2))

(s/fdef read-model-files
  :args (s/cat :root-path ::fs/dir-path)
  :ret  ::read-model-files-result)

(defn uber-error-message
  [errs]
  (str/join
   (reduce
    (fn [msgs [file-path file-msg]]
      (conj msgs (format "\n\n»»»»»» %s »»»»»»\n\n%s\n" file-path file-msg)))
    ["Errors were found in some model files:"]
    errs)))

(defn read-model
  "Pass the path of a dir that contains one or more model YAML files, in any
  number of directories to any depth. Finds all those YAML files, parses them,
  validates them, and combines them together into an FC4 model. If any of the
  files are malformed, throws. If any of the file contents are invalid as per
  the specs in the fc4.model.dsl namespace, return an anom. Performs basic structural
  validation of the model and will return an anom if that fails, but does not
  perform semantic validation (e.g. are all the relationships resolvable).
  If the supplied path does not exist or is not a directory, throws."
  [root-path]
  (let [model-files (read-model-files root-path)
        errs (->> (map-vals m/validate-parsed-file model-files)
                  (remove-vals nil?))
        model (when (empty? errs)
                (m/build-model (vals model-files)))]
    (cond
      (seq errs)
      (fault (uber-error-message errs) ::file-errors errs)

      (not (s/valid? ::f/model model))
      (fault (expound-str ::f/model model) ::invalid-model model)

      :else model)))

(s/def ::file-errors (s/map-of ::fs/file-path-str ::m/err-msg))
(s/def ::invalid-model #(not (s/valid? ::m/model %)))
(s/def ::anomaly
  (s/merge ::anom/anomaly
           (s/keys :req [(or ::file-errors ::invalid-model)])))

(s/fdef read-model
  :args (s/cat :root-path ::fs/dir-path)
  :ret  (s/or :success ::f/model
              :failure ::anomaly))

(defn- val-or-error
  "Accepts a value and a spec. If the value is valid as per the spec, returns the value. Otherwise
  returns a :cognitect.anomalies/anomaly with an error message, and with the additional key
  ::invalid-result associated with the invalid value."
  [v spec]
  (if (s/valid? spec v)
    v
    (assoc (fault (expound-str spec v))
           ::invalid-result v)))

(defn read-view
  [file-path]
  (-> (slurp file-path)
      (fiy/split-file)
      (get ::fy/main)
      (v/parse-file)
      (val-or-error ::f/view)))

(s/fdef read-view
  :args (s/cat :file-path ::fs/file-path-str)
  :ret  (s/or :success ::f/view
              :error   ::error))

(defn read-styles
  [file-path]
  (-> (slurp file-path)
      (fiy/split-file)
      (get ::fy/main)
      (st/parse-file)
      (val-or-error ::f/styles)))

(s/fdef read-styles
  :args (s/cat :file-path ::fs/file-path-str)
  :ret  (s/or :success ::f/styles
              :error   ::error))

(comment
  (->> "test/data/model (valid)/users"
       (fiy/yaml-files)
       (map str))
  (read-model-files "test/data/model (valid)"))
