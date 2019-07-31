(ns fc4.io.watch
  "Functions related to watching paths and invoking functions when those paths change."
  (:require [fc4.io.cli.util :refer [beep]]
            [fc4.io.util :refer [debug print-now]]
            [fc4.io.yaml :refer [yaml-file?]]
            [hawk.core :as hawk])
  (:import [java.io File OutputStreamWriter]
           [java.time LocalTime]
           [java.time.temporal ChronoUnit]
           [java.util.concurrent Executors ExecutorService]))

(defn secs-since
  [inst]
  (.between (ChronoUnit/SECONDS) inst (LocalTime/now)))

(defn ms-since
  [inst]
  (.between (ChronoUnit/MILLIS) inst (LocalTime/now)))

(def ^:private secs-threshold-to-print-event-time 10)
(def ^:private min-ms-between-changes 1200)

(defn process-fs-event?
  [{:keys [active-set recent-set] :as _context}
   {:keys [kind file] :as _event}]
  (let [in-active-set (contains? @active-set file)
        in-recent-set (contains? recent-set file)
        last-processed (get recent-set file)
        since-processed (when in-recent-set (ms-since last-processed))
        process? (and (#{:create :modify} kind)
                      (yaml-file? file)
                      (not in-active-set)
                      (or (not in-recent-set)
                          (>= since-processed min-ms-between-changes)))]
    (debug (.getName file) "\n"
           "  in active set:  " in-active-set "\n"
           "  in recent set:  " in-recent-set "\n"
           "  last-processed: " (str last-processed) "\n"
           "  current time:   " (str (LocalTime/now)) "\n"
           "  since-processed:" since-processed "\n"
           "  process?:       " process?)
    process?))

(def event-kind->past-tense
  {:create "created"
   :modify "modified"
   :delete "deleted"})

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
         (str " at " (remove-nanos event-ts)))))

(defn process-fs-event
  [{:keys [active-set process-fn executor out] :as context}
   {:keys [kind file] :as _event}]
  (swap! active-set conj file)
  (let [event-ts (LocalTime/now)]
    (.execute executor
              (fn []
                (binding [*out* out] ; See comment on :out in start.
                  (try
                    (process-fn file (partial event-preamble event-ts kind))
                    (finally
                      (swap! active-set disj file))))))
    (assoc-in context [:recent-set file] event-ts)))

(defn start
  "Starts a hawk watch and returns the watch object, enriched with a few keys
  specific to this workflow: :executor and :active-set. You can pass the result
  to the function `stop` to stop both the executor and hawk’s background thread,
  after which they should be garbage-collected, if you don’t hold on to a
  reference.

  process-fn must be a single-arity (or variable-arity) function that accepts a
  File object pointing to a file that’s been changed and should be processed. It
  may do I/O and may block. It may change the file. It may throw exceptions. Its
  return value is ignored; it’s invoked for its side effects.

  The watch routine will automatically print (to *out*) the file name before
  invoking the function (followed by a semicolon and a space) but it’s the
  responsibility of process-fn to print anything beyond that: progress, success,
  error, failure, etc — including a newline char (\\n) at the end of its output,
  which it *really* should do."
  [process-fn paths]
  (let [context {:process-fn process-fn

                 ;; The set of files that are being processed or are enqueued to be processed. This
                 ;; is used to discard subsequent file modification events that occur while a file
                 ;; is being processed or is enqueued to be processed — this is crucial because
                 ;; there’s often a subsequent modification event, maybe even multiple events,
                 ;; because the files are modified by process-file 😵!"
                 :active-set (atom #{})

                 ;; Map of File objects to LocalTime objects that are the timestamp of the most
                 ;; recently observed filesystem event.
                 :recent-set {}

                 ;; If *out* has been rebound, we want that rebinding to be propagated to the
                 ;; functions that are run in the threads of the ExecutorService. So we use this to
                 ;; provide the current value of *out* from _this_ thread to the handler function
                 ;; (process-fs-event).
                 ;;
                 ;; This enables us to have multiple instances of this workflow run simultaneously
                 ;; and print to independent writers so that the output can be examined in test
                 ;; assertions without concern of those multiple workflows sharing the same writer.
                 :out *out*

                 ;; The actual event processing has to occur in a different thread than the Hawk
                 ;; background thread, because rendering is blocking and very slow, and we need to
                 ;; process filesystem events quickly with low latency.
                 :executor (. Executors newSingleThreadExecutor)}
        watch (hawk/watch!
               [{:paths   paths
                 :context (constantly context)
                 :filter  process-fs-event?
                 :handler process-fs-event}])]
    (println "📣 Now watching for changes to YAML files under specified paths...")
    (merge watch context)))

(defn stop
  "Useful during development and testing."
  [{:keys [executor] :as watch}]
  (hawk/stop! watch)
  (.shutdownNow executor)
  nil)
