(ns fc4.io.render-test
  (:require [clojure.java.io      :as jio :refer [delete-file file]]
            [clojure.test         :as ct :refer [deftest is testing]]
            [fc4.integrations.structurizr.express.chromium-renderer :refer [make-renderer]]
            [fc4.io.render        :as r]
            [fc4.io.util          :as iou :refer [binary-slurp]]
            [fc4.test-utils       :as tu :refer [check]]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [fc4.util :as fu]
            [image-resizer.core :refer [resize]]))

;; TODO: the below seems like a smell. It feels like this state change shouldn’t really be here, in
;; this specific test namespace, because it’s a global change that impacts any and all behavior
;; going forward. What happens when someone else working on a different test namespace wants
;; `debug?` to be `true` whenever those tests are run? So this feels like it should probably be
;; higher level, at the test-runner or test suite level.
;; (as pointed out by Jpol here: https://git.io/fjynl )
(reset! iou/debug? false)

(deftest tmp-png-file (check `r/tmp-png-file))

(deftest check-fn
  (binding [fu/*throw-on-fail* false]
    (check `r/check)))

(def max-allowable-image-difference
  ;; This threshold might seem low, but the diffing algorithm is
  ;; giving very low results for some reason. This threshold seems
  ;; to be sufficient to make the random watermark effectively ignored
  ;; while other, more significant changes (to my eye) seem to be
  ;; caught. Still, this is pretty unscientific, so it might be worth
  ;; looking into making this more precise and methodical.
  0.005)

(deftest render-diagram-file
  (with-open [renderer (make-renderer)]
    (let [valid        "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
          invalid_a    "test/data/structurizr/express/se_diagram_invalid_a.yaml"
          invalid_b    "test/data/structurizr/express/se_diagram_invalid_b.yaml"
          non-existant "test/data/does_not_exist"
          not-text     "test/data/structurizr/express/diagram_valid_expected.png"]
      (testing "a YAML file containing a valid SE diagram"
        (let [expected-out-path (r/yaml-path->png-path valid)
              expected-bytes (binary-slurp not-text)
              result (r/render-diagram-file valid renderer)]
          (is (= result expected-out-path))
          (is (.canRead (file result)))
          (let [actual-bytes (binary-slurp result)
                difference (->> [actual-bytes expected-bytes]
                                (map bytes->buffered-image)
                                (map #(resize % 1000 1000))
                                (reduce image-diff))]
            (is (<= difference max-allowable-image-difference)))
          ; cleanup just so as not to leave git status dirty
          (delete-file result :silently)))
      (testing "a YAML file containing a blatantly invalid SE diagram"
        (is (thrown-with-msg? Exception
                              #"invalid because it is missing the root property"
                              (r/render-diagram-file invalid_a renderer))))
      (testing "a YAML file containing a subtly invalid SE diagram"
        (is (thrown-with-msg? Exception
                              #"(?s)errors were found in the diagram definition.+diagram type"
                              (r/render-diagram-file invalid_b renderer))))
      (testing "a input file path that does not exist"
        (is (thrown-with-msg? Exception #"exist" (r/render-diagram-file non-existant renderer))))
      (testing "a input file that does not contain text"
        (is (thrown-with-msg?
             Exception
             #"(?i)Error.+cursory check.+not a valid Structurizr Express diagram definition"
             (r/render-diagram-file not-text renderer)))))))
