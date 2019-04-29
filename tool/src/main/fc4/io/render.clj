(ns fc4.io.render
  "Functions for rendering Structurizr Express diagrams into PNG image files.
  NB: because these functions are specifically intended for implementing CLI
  commands, some of them write to stdout/stderr and may call fc4.cli.util/fail
  (which calls System/exit unless fc4.cli.util/*exit-on-fail* is rebound)."
  (:require [cognitect.anomalies :as anom]
            [clojure.java.io :as io :refer [file]]
            [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [ends-with? includes? split]]
            [fc4.files :refer [remove-extension]]
            [fc4.io.util :refer [binary-spit debug err-msg fail read-text-file]]
            [fc4.io.yaml :as yaml]
            [fc4.integrations.structurizr.express.render :as r]
            [fc4.spec :as fs])
  (:import [java.io File FileNotFoundException]))

(defn tmp-png-file
  [path]
  (File/createTempFile (remove-extension path) ".maybe.png"))

(s/fdef tmp-png-file
  :args (s/cat :path (s/and ::fs/file-path-str
                            #(>= (count (.getName (file %))) 3)))
  :ret  (s/and (partial instance? File)
               #(.canWrite %)
               #(ends-with? % ".maybe.png"))
  :fn   (fn [{:keys [args ret]}]
          (includes? (str ret) (-> (:path args)
                                   (file)
                                   (.getName)
                                   (split #"\." 3)
                                   (first)))))

; Arbitrary number is arbitrary. That said, according to my gut, less
; data is likely to be invalid, and more has a chance of being valid.
(def min-valid-png-size 1024)

(defn check
  [result path]
  (debug "checking result for errors...")

  ;; In dev/test fail will return an exception rather than throw it (a
  ;; workaround to enable us to use property testing on functions that would
  ;; normally throw) so we use `or` here to ensure the function exits when a
  ;; failure condition is encountered, because we can’t count on fail throwing
  ;; and thus forcing the function to exit at that point.
  (or
   (condp #(contains? %2 %1) result
     ::anom/message (fail path (::anom/message result) {:data result})
     ::r/png-bytes nil
     (fail path
           (str "Internal error: render result invalid (has neither"
                " ::anom/message nor ::r/png-bytes)")
           {:data {:result result}}))

   (debug "checking PNG data size...")

   (when (< (count (::r/png-bytes result)) min-valid-png-size)
     (let [tmpfile (tmp-png-file path)]
       (binary-spit tmpfile (::r/png-bytes result))
       (fail path (str "PNG data is <1K so it’s likely invalid. It’s been"
                       " written to " tmpfile " for debugging."))))

   (debug "rendering seems to have succeeded!")
   nil))

(s/fdef check
  :args (s/cat :result (s/or :success ::r/success-result
                             :failure ::r/failure-result)
               :path   ::fs/file-path-str)
  :ret  (s/or :success nil?
              :failure (partial instance? Exception))
  :fn   (fn [{{[result-tag result-val] :result
               path                    :path}  :args
              [ret-tag ret-val]                :ret}]
          (case result-tag
            :failure
            (and (= ret-tag :failure)
                 (includes? (.getMessage ret-val) path))

                  ; this case can still fail the check if png-bytes is too small
            :success
            (cond
              (>= (count (::r/png-bytes result-val)) min-valid-png-size)
              (= ret-tag :success)

              (< (count (::r/png-bytes result-val)) min-valid-png-size)
              (and (= ret-tag :failure)
                   (includes? (.getMessage ret-val) path)))

            false)))

(defn yaml-path->png-path
  [in-path]
  (str/replace in-path #"\.ya?ml$" ".png"))

(defn render-diagram-file
  "Self-contained workflow for reading a YAML file containing a Structurizr
  Express diagram definition, rendering it to an image, and writing the image to
  a file in the same directory as the YAML file. Returns the path of the PNG
  file that was written (as a string) or throws an Exception."
  [in-path]
  (let [yaml     (read-text-file in-path)
        _        (yaml/validate yaml in-path)
        renderer (r/start-renderer)]
    (try
      (let [result   (r/render renderer yaml)
            out-path (yaml-path->png-path in-path)]
        (when (::anom/message result) (debug result))
        (check result in-path)
        (binary-spit out-path (::r/png-bytes result))
        out-path)
      (finally
        (r/stop renderer)))))
