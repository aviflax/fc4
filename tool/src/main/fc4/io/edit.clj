(ns fc4.io.edit
  "CLI workflow that watches Structurizr Express diagram files; when changes
  are observed to a YAML file, the YAML in the file is cleaned up and rendered
  to an image file."
  (:require [clj-yaml.core :refer [parse-string]]
            [fc4.integrations.structurizr.express.format :as f :refer [reformat]]
            [fc4.integrations.structurizr.express.snap :refer [snap-to-grid]]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.io.render :refer [render-diagram-file]]
            [fc4.io.util :refer [beep fail print-now read-text-file]]
            [fc4.io.yaml :refer [validate yaml-file?]]
            [fc4.yaml :as fy :refer [assemble split-file]]
            [hawk.core :as hawk])
  (:import [java.io File OutputStreamWriter]
           [java.time LocalTime]
           [java.time.temporal ChronoUnit]
           [java.util.concurrent Executors ExecutorService]))

(defn secs-since
  [inst]
  (.between (ChronoUnit/SECONDS) inst (LocalTime/now)))

(defn process-fs-event?
  [active-set _context {:keys [kind file] :as _event}]
  (and (#{:create :modify} kind)
       (yaml-file? file)
       (not (contains? @active-set file))))

(def event-kind->past-tense
  {:create "created"
   :modify "modified"
   :delete "deleted"})

(def ^:private secs-threshold-to-print-event-time 10)

(def defaults
  {:snap {:to-closest 100
          :min-margin 50}})

(defn ^:private remove-nanos
  [instant]
  (.withNano instant 0))

(defn- event-preamble
  [event-ts event-kind file]
  (str (remove-nanos (LocalTime/now))
       " "
       (.getName file)
       " "
       (event-kind->past-tense event-kind)
       (when (> (secs-since event-ts) secs-threshold-to-print-event-time)
         (str " at " (remove-nanos event-ts)))
       ";"))

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

(defn- process-file
  [active-set event-ts event-kind ^File file]
  (print-now (event-preamble event-ts event-kind file))
  (try
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
    (render-diagram-file file)
    (println "✅")
    (catch Exception e
      (beep) ; good chance the user’s terminal is in the background
      (println "🚨" (or (.getMessage e) e)))
    (finally
      (swap! active-set disj file))))

(defn process-fs-event
  [active-set executor out _context {:keys [kind file] :as _event}]
  (swap! active-set conj file)
  ;; TODO: we should consider invoking the fast+local operations, formatting and snapping,
  ;; right here+now in synchronous blocking fashion, and only enqueuing rendering via the
  ;; executor; that way the user would see the changes from formatting and snapping almost
  ;; instantly. The only challenging aspect of this that I can think of is that it would
  ;; introduce concurrent file processing, which would require refactoring how status/progress
  ;; is written to the user’s terminal. (It’d probably be the best UX if it was stateful.)
  (let [event-ts (LocalTime/now)]
    (.execute executor
              (fn []
                ;; I don’t know why, but for some reason when this function is
                ;; run in the Executor’s thread, *out* appears to be bound to
                ;; some other writer, rather than the default writer that is the
                ;; root binding. This re-binds *out* to the writer passed in as
                ;; out, which enables us to have multiple instances of this
                ;; workflow run simultaneously and print to independent writers
                ;; so that the output can be examined in test assertions without
                ;; concern of those multiple workflows sharing the same writer.
                (binding [*out* out]
                  (process-file active-set event-ts kind file))))))

(defn start
  "Starts a hawk watch and returns the watch object, enriched with a few keys
  specific to this workflow: :executor and :active-set. You can pass the result
  to stop to stop both the executor and hawk’s background thread, after which
  they should be garbage-collected, if you don’t hold on to a reference."
  [& paths]
  (let [; The set of files that are being processed or are enqueued to be processed.
        ; This is used to discard subsequent file modification events that occur while a
        ; file is being processed or is enqueued to be processed — this is crucial
        ; because there’s always _at least_ one subsequent modification event, because
        ; the files are modified by process-file 😵!"
        active-set (atom #{})

        ;; I don’t know why, but for some reason when our handler function is
        ;; run in the Executor’s thread, *out* appears to be bound to some other
        ;; writer, rather than the default writer that is the root binding. So
        ;; we’ll provide that default writer from _this_ thread to the handler
        ;; function (using partial, see below). This enables us to have multiple
        ;; instances of this workflow run simultaneously and print to
        ;; independent writers so that the output can be examined in test
        ;; assertions without concern of those multiple workflows sharing the
        ;; same writer.
        out *out*

        ; The actual event processing has to occur in a different thread than
        ; the Hawk background thread, because rendering is blocking and very
        ; slow, and we need to process filesystem events quickly with low
        ; latency.
        executor   (. Executors newSingleThreadExecutor)
        watch      (hawk/watch!
                    [{:paths   paths
                      :filter  (partial process-fs-event? active-set)
                      :handler (partial process-fs-event active-set executor out)}])
        result     (assoc watch :active-set active-set, :executor executor)]
    (println "📣 Now watching for changes to YAML files under specified paths...")
    result))

(defn stop
  "Useful during development and testing."
  [{:keys [executor] :as watch}]
  (hawk/stop! watch)
  (.shutdownNow executor))
