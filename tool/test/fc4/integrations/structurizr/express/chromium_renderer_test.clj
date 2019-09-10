(ns fc4.integrations.structurizr.express.chromium-renderer-test
  (:require [fc4.integrations.structurizr.express.chromium-renderer :as cr :refer [make-renderer]]
            [fc4.io.util :refer [binary-spit binary-slurp debug debug?]]
            [fc4.rendering :as r :refer [render]]
            [fc4.test-utils :refer [check]]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [clojure.java.io :refer [copy file input-stream output-stream]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [includes?]]
            [clojure.test :refer [deftest testing is]]
            [cognitect.anomalies :as anom]
            [expound.alpha :as expound :refer [expound-str]]
            [image-resizer.core :refer [resize]]

            ; I’d prefer to use Orchestra but it’s not quite working right now. TODO.
            ;[orchestra.spec.test :as stest]
            [clojure.spec.test.alpha :as stest]))

;; TODO: maybe add this to the project’s custom test runner runner.
(set! *warn-on-reflection* true)

;; At first I just called instrument with no args, but I ran into trouble with some specs/fns inside
;; clj-chrome-devtools. So I came up with this overwrought approach to instrumenting only the functions in
;; the namespace under test.
(->> (ns-interns 'fc4.integrations.structurizr.express.chromium-renderer)
     (vals)
     (map symbol)
     (stest/instrument))
(set! s/*explain-out* expound/printer)

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

(deftest rendering
  (with-open [renderer (make-renderer)]
    (testing "happy paths"
      (testing "rendering a small Structurizr Express file"
        (let [yaml (slurp (file dir "diagram_valid_formatted_snapped.yaml"))
              result (render renderer yaml)
              _ (is (s/valid? ::r/success-result result)
                    (expound-str ::r/success-result result))
              actual-bytes (::r/png-bytes result)
              expected-bytes (binary-slurp (file dir "diagram_valid_expected.png"))
              _ (debug "computing difference between images") ; show progress
              difference (->> [actual-bytes expected-bytes]
                              (map bytes->buffered-image)
                              (map #(resize % 1000 1000))
                              (reduce image-diff))]
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
                (str "Images are "
                     difference
                     " different, which is higher than the threshold of "
                     max-allowable-image-difference
                     "\n“expected” PNG written to:" (.getPath expected-debug-fp)
                     "\n“actual” PNG written to:" (.getPath actual-debug-fp))))))
      (testing "rendering a large Structurizr Express file"
        (let [yaml (slurp (file dir "se_diagram_large_a2.yaml"))
              result (render renderer yaml)
              _ (is (s/valid? ::r/success-result result)
                    (expound-str ::r/success-result result))
              actual-bytes (::r/png-bytes result)
              expected-bytes (binary-slurp (file dir "se_diagram_large_a2.png"))
              expected-debug-fp (temp-png-file "rendered_expected.png")
              actual-debug-fp (temp-png-file "rendered_actual.png")
              _ (do ; Write the image files out to assist with debugging:
                  (binary-spit expected-debug-fp expected-bytes)
                  (binary-spit actual-debug-fp actual-bytes)
                  (debug "Wrote files to:" expected-debug-fp actual-debug-fp))
              difference (->> [actual-bytes expected-bytes]
                              (map bytes->buffered-image)
                              (map #(resize % 1000 1000))
                              (reduce image-diff))]
          (is (<= difference max-allowable-image-difference)
              (str "Images are "
                   difference
                   " different, which is higher than the threshold of "
                   max-allowable-image-difference
                   "\n“expected” PNG written to:" (.getPath expected-debug-fp)
                   "\n“actual” PNG written to:" (.getPath actual-debug-fp))))))
    (testing "sad path:"
      ;; The specs for some functions specify *correct* inputs. So in order to test what they do
      ;; with *incorrect* inputs, we need to un-instrument them.
      (->> ["do-render" "set-yaml-and-update-diagram"]
           (map #(str "fc4.integrations.structurizr.express.chromium-renderer/" %))
           (map symbol)
           (stest/unstrument))
      (testing "inputs that contain no diagram definition whatsoever"
        (doseq [input [""
                       "this is not empty, but it’s not a diagram!"]]
          (let [{:keys [::anom/message] :as result} (render renderer input)]
            (is (s/valid? ::r/failure-result result)
                (expound-str ::r/failure-result result))
            (is (includes? message "errors were found in the diagram definition"))
            (is (includes? message "No diagram has been defined")))))
      (testing "inputs that contain invalid diagram definitions"
        (doseq [[fname-suffix expected-strings]
                {"a.yaml" ["Diagram scope" "software system named" "undefined" "could not be found"]
                 "b.yaml" ["The diagram type must be" "System Landscape" "Dynamic"]
                 "c.yaml" ["relationship destination element named" "Does not exist" "does not exist"]}]
          (testing fname-suffix
            (let [path (file dir (str "se_diagram_invalid_" fname-suffix))
                  input (slurp path)
                  {:keys [::anom/message] :as result} (render renderer input)]
              (when (::r/png-bytes result)
                (let [png-bytes (::r/png-bytes result)
                      tmp-file  (temp-png-file "unexpected")]
                  (binary-spit tmp-file png-bytes)
                  (println "Wrote unexpected diagram image to" tmp-file)))
              (is (s/valid? ::r/failure-result result)
                  (expound-str ::r/failure-result result))
              (is (every? #(includes? message %) expected-strings))
              (is (includes? message "errors were found in the diagram definition")))))))
    (testing "performance"
      (let [yaml (slurp (file dir "diagram_valid_formatted_snapped.yaml"))
            start-ns (System/nanoTime)
            results (doall (repeatedly 10 #(render renderer yaml)))
            elapsed-ms (/ (double (- (System/nanoTime) start-ns)) 1000000.0)]
        (is (<= elapsed-ms 15000))
        (doseq [result results]
          (is (s/valid? ::r/success-result result)))))))

(deftest prep-yaml (check `cr/prep-yaml))
