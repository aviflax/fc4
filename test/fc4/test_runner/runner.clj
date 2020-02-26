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

(defn- macos?
  []
  (->> (System/getProperty "os.name" "")
       (re-seq #"(?i)mac")
       (boolean)))

(defn- thread-count
  ""
  []
  ;; Our project has CI test jobs that run in medium CircleCI containers that have 2 (Linux) or 4
  ;; (MacOS) vCPUs.
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
  ;;
  ;; Since we can’t rely on `availableProcessors` we check the OS to determine how many threads to
  ;; use for running the tests, since we know that CircleCI medium Linux containers have 2 vCPUs and
  ;; medium MacOS containers have 4 vCPUs. This might be a little brittle… e.g. if we change the
  ;; hardware resources available to our CI containers by modifying `config.xml` then we would
  ;; probably expect to see the tests use all available vCPUs and run faster — but they won’t,
  ;; because of the logic here.
  ;;
  ;; When I first implemented this, I first checked if this was running on CircleCI, and used the
  ;; logic below if so, but if not, then used `Runtime/availableProcessors`, assuming we could rely
  ;; on it. But then I decided to remove that for two reasons: (1) it was too complicated; (2) this
  ;; simpler approach also has the advantage of making local testing more similar to testing on
  ;; CircleCI. This way if the tests will run slowly on CircleCI, we’ll see that when running them
  ;; locally as well, and feel that pain in both contexts.
  (if (macos?) 4 2))

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

     :thread-count (thread-count)

     ;; We have *lots* of tests that take too damn long.
     :test-warn-time 30000 ; millis

     ;; Of course our test suite takes way too damn long.
     :fail-fast? true}))

(defn run-tests
  []
  (runner/run-tests (find-tests test-dir) opts))
