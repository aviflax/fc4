(ns fc4.test-runner.runner
  "This works just fine for local dev/test use cases but is also fine-tuned to
  serve our needs when run in this project’s CI service (CircleCI)."
  (:require [eftest.report          :as report :refer [report-to-file]]
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

(def opts
  (let [report-to-file-fn (report-to-file ju/report output-path)
        report-fn (multi-report progress/report report-to-file-fn)]
    {:report report-fn

     ;; Work around a bug in CircleCI; more info here: https://github.com/weavejester/eftest/pull/63
     ;; Note that this value should correspond to that of the resource_class property of the
     ;; CircleCI job tool_test (defined in <repo_root>/.circleci/config.yml) as per the vCPU counts
     ;; listed here: https://circleci.com/docs/2.0/configuration-reference/#resource_class
     ;; NB: I’ve seen the runner get stuck when this is set to 2 or 4 threads. I haven’t tested 6,
     ;; 8, or 10, but 12+ seems to generally work. I don’t know why it sometimes gets stuck, but
     ;; there’s a good chance it’s due to a bug I introduced into eftest with PR 63.
     :thread-count 12

     ;; Our test suite just takes too damn long.
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
