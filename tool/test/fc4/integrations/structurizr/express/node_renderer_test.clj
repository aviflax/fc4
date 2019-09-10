(ns fc4.integrations.structurizr.express.node-renderer-test
  (:require [fc4.integrations.structurizr.express.node-renderer :refer [->NodeRenderer]]
            [fc4.io.util :refer [binary-spit binary-slurp]]
            [fc4.rendering :as r]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [clojure.java.io :refer [copy file input-stream output-stream]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [includes?]]
            [clojure.test :refer [deftest testing is]]
            [cognitect.anomalies :as anom]
            [expound.alpha :as expound :refer [expound-str]]
            [image-resizer.core :refer [resize]]))

(def max-allowable-image-difference
  ;; This threshold might seem low, but the diffing algorithm is
  ;; giving very low results for some reason. This threshold seems
  ;; to be sufficient to make the random watermark effectively ignored
  ;; while other, more significant changes (to my eye) seem to be
  ;; caught. Still, this is pretty unscientific, so it might be worth
  ;; looking into making this more precise and methodical.
  0.005)

(def dir "test/data/structurizr/express/")

(defn temp-png-file
  [basename]
  (java.io.File/createTempFile basename ".png"))

(deftest render
  (testing "happy paths"
    (testing "rendering a Structurizr Express file"
      (let [yaml (slurp (file dir "diagram_valid_formatted_snapped.yaml"))
            {:keys [::r/png-bytes ::r/stderr] :as result} (r/render (->NodeRenderer) yaml)
            actual-bytes png-bytes
            expected-bytes (binary-slurp (file dir "diagram_valid_expected.png"))
            difference (->> [actual-bytes expected-bytes]
                            (map bytes->buffered-image)
                            (map #(resize % 1000 1000))
                            (reduce image-diff))]
        (is (s/valid? ::r/success-result result) (s/explain-str ::r/success-result result))
        (is (<= difference max-allowable-image-difference)
            ;; NB: below in addition to returning a message we write the actual
            ;; bytes out to the file system, to help with debugging. But
            ;; apparently `is` evaluates this `msg` arg eagerly, so it’s
            ;; evaluated even if the assertion is true. This means that even
            ;; when the test passes the “expected” file is written out to the
            ;; filesystem. So TODO: maybe we should do something about this.
            (let [expected-debug-fp (temp-png-file "rendered_expected.png")
                  actual-debug-fp (temp-png-file "rendered_actual.png")]
              (binary-spit expected-debug-fp expected-bytes)
              (binary-spit actual-debug-fp actual-bytes)
              (str stderr
                   "Images are "
                   difference
                   " different, which is higher than the threshold of "
                   max-allowable-image-difference
                   "\n“expected” PNG written to:" (.getPath expected-debug-fp)
                   "\n“actual” PNG written to:" (.getPath actual-debug-fp)))))))
  (testing "sad paths"
    ;; TODO: validate that the ::anom/message contains the required formatting (the two fenced sections)
    (testing "inputs that contain no diagram definition whatsoever"
      (doseq [input [""
                     "this is not empty, but it’s not a diagram!"]]
        (let [{:keys [::anom/message] :as result} (r/render (->NodeRenderer) input)]
          (is (s/valid? ::r/failure-result result)
              (expound-str ::r/failure-result result))
          (is (every? (partial includes? message)
                      ["RENDERING FAILED"
                       "Errors were found in the diagram definition"
                       "No diagram has been defined"]))
          (is (includes? message "Errors were found in the diagram definition")))))
    (testing "inputs that contain invalid diagram definitions"
      (doseq [[fname-suffix expected-strings]
              {"a.yaml" ["Diagram scope" "software system named" "undefined" "could not be found"]
               "b.yaml" ["The diagram type must be" "System Landscape" "Dynamic"]
               "c.yaml" ["relationship destination element named" "Does not exist" "does not exist"]}]
        (let [path (file dir (str "se_diagram_invalid_" fname-suffix))
              input (slurp path)
              {:keys [::anom/message] :as result} (r/render (->NodeRenderer) input)]
          (is (s/valid? ::r/failure-result result)
              (expound-str ::r/failure-result result))
          (is (every? #(includes? message %) expected-strings))))))
  (testing "performance"
    (let [yaml (slurp (file dir "diagram_valid_formatted_snapped.yaml"))
          renderer (->NodeRenderer)
          start-ns (System/nanoTime)
          results (doall (repeatedly 10 #(r/render renderer yaml)))
          elapsed-ms (/ (double (- (System/nanoTime) start-ns)) 1000000.0)]
      ;; This sometimes takes up to 60 seconds in our CI environment ¯\_(ツ)_/¯
      (is (<= elapsed-ms 60000))
      (doseq [result results]
        (is (s/valid? ::r/success-result result))))))
