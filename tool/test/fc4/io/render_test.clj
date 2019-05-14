(ns fc4.io.render-test
  (:require [clojure.java.io      :as jio :refer [delete-file file]]
            [clojure.test         :as ct :refer [deftest is testing]]
            [fc4.io.render        :as r]
            [fc4.io.util          :as iou :refer [binary-slurp]]
            [fc4.test-utils       :as tu :refer [check]]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [fc4.util :as fu]))

; Require image-resizer.core while preventing the Java app icon from popping up
; and grabbing focus on MacOS.
; Approach found here: https://stackoverflow.com/questions/17460777/stop-java-coffee-cup-icon-from-appearing-in-the-dock-on-mac-osx/17544259#comment48475681_17544259
; This require is here rather than in the ns form at the top of the file because
; if I include this ns in the require list in the ns form, then the only way to
; suppress the app icon from popping up and grabbing focus would be to place the
; System/setProperty call at the top of the file, before the ns form, and that’d
; violate Clojure idioms. When people open a clj file, they expect to see a ns
; form right at the top declaring which namespace the file defines and
; populates.
; To be clear, calling the `require` function in a clj file, to require a
; dependency, outside of the ns form, is *also* non-idiomatic; people expect all
; of the dependencies of a file to be listed in the ns form. So I had to choose
; between two non-idiomatic solutions; I chose this one because it seems to me
; to be slightly less jarring for Clojurists.
(do
  (System/setProperty "apple.awt.UIElement" "true")
  (require '[image-resizer.core :refer [resize]]))

(reset! iou/debug? true)

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
  (let [valid        "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
        invalid_a    "test/data/structurizr/express/se_diagram_invalid_a.yaml"
        invalid_b    "test/data/structurizr/express/se_diagram_invalid_b.yaml"
        non-existant "test/data/does_not_exist"
        not-text     "test/data/structurizr/express/diagram_valid_expected.png"]
    (testing "a YAML file containing a valid SE diagram"
      (let [expected-out-path (r/yaml-path->png-path valid)
            expected-bytes (binary-slurp not-text)
            result (r/render-diagram-file valid)]
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
                            (r/render-diagram-file invalid_a))))
    (testing "a YAML file containing a subtly invalid SE diagram"
      (is (thrown-with-msg? Exception
                            #"(?s)Errors were found in the diagram definition.+diagram type"
                            (r/render-diagram-file invalid_b))))
    (testing "a input file path that does not exist"
      (is (thrown-with-msg? Exception #"exist" (r/render-diagram-file non-existant))))
    (testing "a input file that does not contain text"
      (is (thrown-with-msg?
           Exception
           #"(?i)Error.+cursory check.+not a valid Structurizr Express diagram definition"
           (r/render-diagram-file not-text))))))
