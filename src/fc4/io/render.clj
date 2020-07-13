(ns fc4.io.render
  "Functions for rendering Structurizr Express diagrams into PNG image files.
  NB: because these functions are specifically intended for implementing CLI
  commands, some of them write to stdout/stderr and may call fc4.cli.util/fail
  (which calls System/exit unless fc4.cli.util/*exit-on-fail* is rebound)."
  (:require [clojure.java.io :as io :refer [file]]
            [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [ends-with? includes? split]]
            [cognitect.anomalies :as anom]
            [fc4.files :refer [remove-extension]]
            [fc4.io.util :refer [binary-spit debug fail read-text-file]]
            [fc4.io.yaml :as yaml]
            [fc4.rendering :as r :refer [render]]
            [fc4.spec :as fs])
  (:import [java.io File]))

(defn- tmp-png-file
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
(def min-valid-image-size 1024)

(defn- check-render-result
  [result path]
  (debug "checking result for errors...")

  ;; In dev/test fail will return an exception rather than throw it (a
  ;; workaround to enable us to use property testing on functions that would
  ;; normally throw) so we use `or` here to ensure the function exits when a
  ;; failure condition is encountered, because we can’t count on fail throwing
  ;; and thus forcing the function to exit at that point.
  (or
   (condp #(contains? %2 %1) result
     ::anom/message (fail path (::anom/message result))
     ::r/images nil ; we cool
     (fail path (str "Internal error: render result invalid (has neither"
                     " ::anom/message nor ::r/images)")))

   (debug "checking image data size...")

   (when-let [png-bytes (get-in result [::r/images ::r/png :fc4.rendering.png/main])]
     (when (< (count png-bytes) min-valid-image-size)
       (let [tmpfile (tmp-png-file path)]
         (binary-spit tmpfile png-bytes)
         (fail path (str "PNG data is <1K so it’s likely invalid. It’s been"
                         " written to " tmpfile " for debugging.")))))

   (when-let [svg (get-in result [::r/images ::r/svg :fc4.rendering.svg/main])]
     (when (< (count svg) min-valid-image-size)
       (fail path (str "SVG data is <1K so it’s likely invalid. Here it is:\n"
                       svg "\n"))))

   (debug "rendering seems to have succeeded!")
   nil))

(s/fdef check-render-result
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
            (case ret-tag
              :success
              (>= (count (or (get-in result-val [::r/images ::r/png :fc4.rendering.png/conjoined])
                             (get-in result-val [::r/images ::r/svg :fc4.rendering.svg/conjoined])))
                  min-valid-image-size)

              :failure
              (and (< (count (::r/png-bytes result-val)) min-valid-image-size)
                   (includes? (.getMessage ret-val) path)))

            false)))

(defn yaml-path->out-path
  [in-path output-format]
  (let [extension (name output-format)] ; output-format might be a (possibly qualified) keyword
    (str/replace in-path #"\.ya?ml$" (str "." extension))))

(defn render-diagram-file
  "Self-contained workflow for reading a YAML file containing a Structurizr Express diagram
  definition, rendering it to one or more images, and writing the image(s) to one or more files in
  the same directory as the YAML file. Blocks. Returns the paths of the files that were written (as
  a non-lazy sequential of Strings) or throws an Exception."
  ([in-path renderer]
   (render-diagram-file in-path renderer {}))
  ([in-path renderer options]
   (let [yaml     (read-text-file in-path)
         _        (yaml/validate yaml in-path)
         result   (render renderer yaml options)
         _        (debug "result of rendering:" result)
                  ;; throws if there’s a problem
         _        (check-render-result result in-path)]
     (mapv
      #(let [[format m] %
             out-path (yaml-path->out-path in-path format)
             format-ns (str "fc4.rendering." (name format))
             k (keyword format-ns "conjoined")
             conjoined (get m k)]
         (debug "processing format" format "with value" m)
         (when-not conjoined (throw (ex-info "WTF" m)))
         (debug "writing conjoined diagram found in" k "to" out-path)
         (binary-spit out-path conjoined)
         out-path)
      (::r/images result)))))
