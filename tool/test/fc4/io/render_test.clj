(ns fc4.io.render-test
  (:require [clojure.java.io      :as jio :refer [delete-file file]]
            [clojure.string :refer [ends-with?]]
            [clojure.test         :as ct :refer [deftest is testing]]
            [fc4.integrations.structurizr.express.renderer :refer [make-renderer]]
            [fc4.io.render        :as r]
            [fc4.io.util          :as iou :refer [binary-slurp]]
            [fc4.test-utils       :as tu :refer [check]]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [fc4.util :as fu]
            [image-resizer.core :refer [resize]])
  (:import [info.debatty.java.stringsimilarity NormalizedLevenshtein]))

;; TODO: the below seems like a smell. It feels like this state change shouldn’t really be here, in
;; this specific test namespace, because it’s a global change that impacts any and all behavior
;; going forward. What happens when someone else working on a different test namespace wants
;; `debug?` to be `true` whenever those tests are run? So this feels like it should probably be
;; higher level, at the test-runner or test suite level.
;; (as pointed out by Jpol here: https://git.io/fjynl )
(reset! iou/debug? false)

(deftest tmp-png-file (check `r/tmp-png-file))

(deftest check-render-result
  (binding [fu/*throw-on-fail* false]
    (check `r/check-render-result)))

(def max-allowable-image-differences
  {:svg 0.05
   ;; The PNG threshold might seem low, but the diffing algorithm is
   ;; giving very low results for some reason. This threshold seems
   ;; to be sufficient to make the random watermark effectively ignored
   ;; while other, more significant changes (to my eye) seem to be
   ;; caught. Still, this is pretty unscientific, so it might be worth
   ;; looking into making this more precise and methodical.
   :png 0.005})

(defn- png-diff [a b]
  (->> (map bytes->buffered-image [a b])
       (map #(resize % 1000 1000))
       (reduce image-diff)))

(defn- image-file-diff
  "Given two file paths, returns the difference between the two files as a decimal representing a
  percentage. Can handle SVG or PNG files. Both files must be of the same type."
  [a b]
  (condp #(ends-with? %2 %1) (str a)
    ".png"
    (apply png-diff (map binary-slurp [a b]))

    ".html"
    (.distance (NormalizedLevenshtein.) (slurp a) (slurp b))))

(deftest render-diagram-file
  (with-open [renderer (make-renderer)]
    (let [valid        "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
          expected-paths {:svg "test/data/structurizr/express/diagram_valid_expected.html"
                          :png "test/data/structurizr/express/diagram_valid_expected.png"}
          invalid_a    "test/data/structurizr/express/se_diagram_invalid_a.yaml"
          invalid_b    "test/data/structurizr/express/se_diagram_invalid_b.yaml"
          non-existant "test/data/does_not_exist"
          not-text     "test/data/structurizr/express/diagram_valid_expected.png"]
      (testing "happy paths"
        (testing "a YAML file containing a valid SE diagram; no options"
          (let [expected-out-path (r/yaml-path->out-path valid :png)
                expected-bytes (binary-slurp not-text)
                result (r/render-diagram-file valid renderer)
                png-file-path (first result)]
            (is (= png-file-path expected-out-path))
            (is (.canRead (file png-file-path)))
            (let [actual-bytes (binary-slurp png-file-path)
                  difference (png-diff actual-bytes expected-bytes)]
              (is (<= difference (:png max-allowable-image-differences))))
            ; cleanup just so as not to leave git status dirty
            (delete-file png-file-path :silently)))
        (testing "a YAML file containing a valid SE diagram; options specifying PNG output"
          (let [expected-out-path (r/yaml-path->out-path valid :png)
                expected-bytes (binary-slurp not-text)
                options {:output-formats #{:png}}
                result (r/render-diagram-file valid renderer options)
                png-file-path (first result)]
            (is (= png-file-path expected-out-path))
            (is (.canRead (file png-file-path)))
            (let [actual-bytes (binary-slurp png-file-path)
                  difference (png-diff actual-bytes expected-bytes)]
              (is (<= difference (:png max-allowable-image-differences))))
            ; cleanup just so as not to leave git status dirty
            (delete-file png-file-path :silently)))
        (testing "a YAML file containing a valid SE diagram; options specifying SVG output"
          (let [expected-out-path (r/yaml-path->out-path valid :svg)
                result (r/render-diagram-file valid renderer {:output-formats #{:svg}})
                actual-fp (first result)]
            (is (= actual-fp expected-out-path))
            (is (.canRead (file actual-fp)))
            (let [[actual expected] (map slurp [actual-fp (:svg expected-paths)])
                  difference (.distance (NormalizedLevenshtein.) actual expected)]
              (is (<= difference (:svg max-allowable-image-differences))))
            ; cleanup just so as not to leave git status dirty
            (delete-file actual-fp :silently)))
        (testing "a YAML file containing a valid SE diagram; options specifying PNG+SVG output"
          (let [output-formats #{:png :svg}
                result (r/render-diagram-file valid renderer {:output-formats output-formats})]
            (doseq [format output-formats
                    :let [actual-fp (r/yaml-path->out-path valid format)
                          expected-fp (get expected-paths format)
                          _ (is (contains? (set result) actual-fp))
                          _ (is (.canRead (file actual-fp)))
                          difference (image-file-diff actual-fp expected-fp)]]
              (is (<= difference (get max-allowable-image-differences format)))
              ; cleanup just so as not to leave git status dirty
              (delete-file actual-fp :silently)))))
      (testing "sad paths"
        (testing "a YAML file containing a blatantly invalid SE diagram"
          (is (thrown-with-msg? Exception
                                #"invalid because it is missing the root property"
                                (r/render-diagram-file invalid_a renderer))))
        (testing "a YAML file containing a subtly invalid SE diagram"
          (is (thrown-with-msg? Exception
                                #"(?s)errors were found in the diagram definition.+diagram type"
                                (r/render-diagram-file invalid_b renderer))))
        (testing "an input file path that does not exist"
          (is (thrown-with-msg? Exception #"exist" (r/render-diagram-file non-existant renderer))))
        (testing "an input file that does not contain text"
          (is (thrown-with-msg?
               Exception
               #"(?i)Error.+cursory check.+not a valid Structurizr Express diagram definition"
               (r/render-diagram-file not-text renderer))))))))
