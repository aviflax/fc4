(ns fc4.io.edit
  "CLI action that processes diagram YAML files: the YAML in the file is formatted and snapped, and
  the diagram rendered is to an image file. Intended to be invoked via the watching feature in
  fc4.io.watch."
  (:require [clj-yaml.core :refer [parse-string]]
            [fc4.integrations.structurizr.express.format :as f :refer [reformat]]
            [fc4.integrations.structurizr.express.snap :refer [snap-to-grid]]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.io.render :refer [render-diagram-file]]
            [fc4.io.util :refer [fail print-now read-text-file]]
            [fc4.io.yaml :refer [validate yaml-file?]]
            [fc4.yaml :as fy :refer [assemble split-file]])
  (:import [java.io File OutputStreamWriter]
           [java.time LocalTime]
           [java.time.temporal ChronoUnit]
           [java.util.concurrent Executors ExecutorService]))

(def defaults
  {:snap {:to-closest 100
          :min-margin 50}})

(defn- format-and-snap
  "This function should be fairly short-lived. Right now this edit workflow *always* formats,
  snaps, and renders — but soon it’ll be changed so that those features can be individually
  “activated” or “deactivated” — so we’ll need to make them composable, probably. For now,
  though, this tightly-coupled approach is fine.

  Returns nil on error, which is terrible, so let’s fix that."
  [yaml-file-contents]
  (let [{:keys [::fy/front ::fy/main]} (split-file yaml-file-contents)
        {:keys [to-closest min-margin]} (:snap defaults)]
    (some-> (parse-string main)
            (reformat)
            (snap-to-grid to-closest min-margin)
            (stringify)
            (->> (assemble front)))))

(defn process-file
  [^File file]
  (print-now " reading+parsing...")
  (let [yaml-in (read-text-file file)
        ; optimization opportunity: the YAML is being parsed twice, by both validate & format-and-snap
        _ (validate yaml-in file) ; throws if invalid
        _ (print-now "✅ formatting+snapping...")
        yaml-out (format-and-snap yaml-in)]
    (if (string? yaml-out)
      (spit file yaml-out)
      ;; TODO: this is a really crappy error message — there are no details, no actionable
      ;; info. Fix this!
      (fail file (str "Unknown error; result of processing was:" yaml-out))))
  (print-now "✅ rendering...")
  (render-diagram-file file))
