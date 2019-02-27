(ns fc4.test-runner.runner
  "This works just fine for local dev/test use cases but is also fine-tuned to
  serve our needs when run in this project’s CI service (CircleCI)."
  (:require [clojure.edn            :as edn]
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

(def default-opts
  (let [report-to-file-fn (report-to-file ju/report output-path)
        report-fn (multi-report progress/report report-to-file-fn)]
    {:report report-fn

     ;; Work around a bug in CircleCI; more info here: https://github.com/weavejester/eftest/pull/63
     ;; Note that this value should correspond to that of the resource_class property of the
     ;; CircleCI job tool_test (defined in <repo_root>/.circleci/config.yml) as per the vCPU counts
     ;; listed here: https://circleci.com/docs/2.0/configuration-reference/#resource_class
     ;; NB: I’ve seen the runner get stuck (or seem to be effectively stuck) when this is set to the
     ;; number of cores of the system. I don’t know why this happens, but there’s a good chance it’s
     ;; related to the changes I contributed to eftest with PR 63. Regardless, this is currently set
     ;; to 16 because as per config.yml we are running the tests in CircleCI on containers with 8
     ;; vCPUs, and I didn’t get good results with 8–12 threads.
     ; :thread-count 16
     :thread-count 10

     ;; Our test suite just takes too damn long.
     :fail-fast? true}))

(defn run-tests
  ([]
   (run-tests default-opts))
  ([opts]
   (println "Running tests with options:" opts)
   (runner/run-tests (find-tests test-dir) opts)))

(defn -main [opts & args]
  (let [opts-parsed (if opts (edn/read-string opts) {})
        opts-effective (merge default-opts opts-parsed)
        results (run-tests opts-effective)
        unsuccessful-tests (->> results
                                ((juxt :error :fail))
                                (reduce +))
        exit-code (if (zero? unsuccessful-tests) 0 1)]
    (shutdown-agents)
    (System/exit exit-code)))
