(ns fc4.test-runner.runner
  "This works just fine for local dev/test use cases but is also fine-tuned to
  serve our needs when run in this project’s CI service (CircleCI)."
  (:require [clojure.test]
            [eftest.report          :as report :refer [report-to-file]]
            [eftest.report.progress :as progress]
            [eftest.report.junit    :as ju]
            [eftest.runner          :as runner :refer [find-tests]]))

(def test-dir "test")

(def output-path
  "This is optimized for CircleCI: https://circleci.com/docs/2.0/configuration-reference/#store_test_results"
  "target/test-results/eftest/results.xml")

(defn- multi-report
  "Accepts n reporting functions, returns a reporting function that will call
  them all for their side effects and return nil. I tried to just use juxt but
  it didn’t work. Maybe because some of the reporting functions provided by
  eftest are multimethods, I don’t know."
  [first-fn & rest-fns]
  (fn [event]
    ;; Run the first reporting function normally
    (first-fn event)

    ;; Now bind the clojure.test/*report-counters* to nil and then run the rest
    ;; of the functions, so as to avoid double-counting of the assertions,
    ;; errors, and failures as per https://github.com/weavejester/eftest/issues/23
    (binding [clojure.test/*report-counters* nil]
      (doseq [report rest-fns]
        (report event)))))

(def ^:private thread-count
  ;; Our project has CI test jobs that run on the CircleCI machine executors using the
  ;; “resource class” “large” — which have 4 vCPUs.
  ;;
  ;; In order to optimize for wall-clock time, we want to run the tests across all available vCPUs
  ;; by using that number of threads to run the tests. We wouldn’t want to use many more threads
  ;; than available vCPUs because our tests are heavy on computation and light on I/O.
  ;;
  ;; Normally, we’d just use `java.lang.Runtime/availableProcessors`, and that’s the default used by
  ;; eftest, but we can’t rely on it on CircleCI due to a bug.
  ;;
  ;; The CircleCI docs describe this bug like so:
  ;;
  ;; > Java, Erlang and any other languages that introspect the /proc directory for information
  ;; > about CPU count may require additional configuration to prevent them from slowing down when
  ;; > using the CircleCI 2.0 resource class feature. Programs with this issue may request 32 CPU
  ;; > cores and run slower than they would when requesting one core. Users of languages with this
  ;; > issue should pin their CPU count to their guaranteed CPU resources.
  ;;
  ;; Source: https://circleci.com/docs/2.0/configuration-reference/#resource_class
  4)

(def opts
  (let [report-to-file-fn (report-to-file ju/report output-path)
        report-fn (multi-report progress/report report-to-file-fn)]
    {:report report-fn
     ;; :multithread? supports a few different values; I tested the other supported values
     ;; (:namespaces and `true`) but they caused concurrency problems with rendering. If/when we
     ;; have threadsafe rendering we might want to revisit this setting.
     ;;
     ;; docs: https://github.com/weavejester/eftest/#multithreading
     :multithread? :vars

     :thread-count thread-count

     ;; We have *lots* of tests that take too damn long.
     :test-warn-time 30000 ; millis

     ;; Of course our test suite takes way too damn long.
     :fail-fast? true}))

(defn run-tests
  []
  (runner/run-tests (find-tests test-dir) opts))

(defn -main []
  (let [results (run-tests)
        unsuccessful-tests (->> results
                                ((juxt :error :fail))
                                (reduce +))
        exit-code (if (zero? unsuccessful-tests) 0 1)]
    (shutdown-agents)
    (System/exit exit-code)))
