(ns fc4c.test
  "This works just fine for local dev/test use cases but is also fine-tuned to
  serve our needs when run in this project’s CI service (CircleCI)."
  (:require [eftest.report          :as report :refer [report-to-file]]
            [eftest.report.progress :as progress]
            [eftest.report.junit    :as ju]
            [eftest.runner          :as runner :refer [find-tests run-tests]]))

;; TODO add an option to measure coverage with Cloverage.
;;    see: https://github.com/weavejester/eftest/issues/50

(def test-dir "test")

(def output-path
  "This is optimized for CircleCI: https://circleci.com/docs/2.0/configuration-reference/#store_test_results"
  "target/test-results/eftest/results.xml")

(defn- multi-report
  "Accepts n reporting functions, returns a reporting function that will call
  them all for their side effects and return nil. I tried to just use juxt but
  it didn’t work. Maybe because some of the reporting functions provided by
  eftest are multimethods, I don’t know."
  [& fs]
  (fn [event]
    (doseq [f fs]
      (f event))))

(def opts
  (let [report-to-file-fn (report-to-file ju/report output-path)
        report-fn (multi-report progress/report report-to-file-fn)]
    {:report report-fn
     ;; Specifying a constraint on the multithreading behavior because without
     ;; this the XML output of the JUnit reporter is malformed, as per this bug:
     ;; https://github.com/weavejester/eftest/issues/47
     ;; I tested the other supported value (:namespaces) and it was
     ;; significantly slower.
     :multithread? :vars}))

(defn -main []
  (let [tests (find-tests test-dir)
        results (run-tests tests opts)
        unsuccessful-tests (->> (select-keys results [:fail :error])
                                (vals)
                                (reduce +))
        exit-code (if (zero? unsuccessful-tests) 0 1)]
    (shutdown-agents)
    (System/exit exit-code)))
