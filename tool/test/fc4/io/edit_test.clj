(ns fc4.io.edit-test
  (:require [clj-yaml.core :refer [parse-string]]
            [clojure.java.io :refer [copy delete-file file writer]]
            [clojure.string :refer [split-lines]]
            [clojure.test :refer [deftest is testing use-fixtures]]
            [fc4.files :refer [get-extension remove-extension set-extension]]
            [fc4.io.edit :as e]
            [fc4.io.util :as u]
            [fc4.yaml :as fy :refer [split-file]])
  (:import [java.io ByteArrayOutputStream File OutputStreamWriter PrintStream]))

(defn count-substring
  {:source "https://rosettacode.org/wiki/Count_occurrences_of_a_substring#Clojure"}
  [txt sub]
  (count (re-seq (re-pattern sub) txt)))

(defn append
  [f v]
  (with-open [w (writer f :append true)]
    (.write w v)))

(defn tmp-copy
  "Creates a new tempfile with a very similar name to the input file/path
  and the same contents as the file/path. Returns a File object pointing to
  the tempfile."
  [source-file]
  (let [source (file source-file) ; just in case the source was a string
        base-name (remove-extension source)
        suffix (str "." (get-extension source))
        dir (.getParentFile source)
        tmp-file (File/createTempFile base-name suffix dir)]
    (copy source tmp-file)
    tmp-file))

(defn no-debug
  "Ensure that debug messages don’t get printed, so we can make assertions about
  the output of the functions under test."
  [f]
  (reset! u/debug? false)
  (f))

(use-fixtures :each no-debug)

(deftest format-and-snap
  (let [f #'e/format-and-snap
        valid-before       "test/data/structurizr/express/diagram_valid_messy.yaml"
        valid-expected     "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
        invalid-a          "test/data/structurizr/express/se_diagram_invalid_a.yaml"
        invalid-b          "test/data/structurizr/express/se_diagram_invalid_b.yaml"
        invalid-b-expected "test/data/structurizr/express/se_diagram_invalid_b_formatted_snapped.yaml"]
    (testing "a YAML string containing a valid SE diagram"
      (is (= (slurp valid-expected)
             (f (slurp valid-before)))))
    (testing "a YAML string containing a blatantly invalid SE diagram"
      (let [yaml (slurp invalid-a)]
        ; We compare the main documents only so we can ignore the comments at the top of the files.
        (is (= (-> yaml split-file ::fy/main parse-string)
               (-> yaml f split-file ::fy/main parse-string)))))
    (testing "a YAML string containing a subtly invalid SE diagram"
      ; ...invalid to Structurizr Express but not to this tool.
      ; We compare the main documents only so we can ignore the comments at the top of the files.
      (is (= (-> invalid-b-expected slurp   split-file ::fy/main)
             (-> invalid-b          slurp f split-file ::fy/main))))
    (testing "an empty string"
      (is (nil? (f ""))))))

(deftest process-file
  ;; These tests don’t thoroughly check the specific features that are called by the edit workflow
  ;; (formatting, snapping, and rendering) because those have their own focused tests already.
  ;; Therefore it’s sufficient for these tests to simply confirm that those features have been
  ;; invoked.
  (testing "simple happy path"
    (let [yaml-file (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
          yaml-expected "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
          png-file (file (set-extension yaml-file "png"))
          yaml-file-size-before (.length yaml-file)
          _ (is (or (not (.exists png-file))
                    (.delete png-file)))
          output (with-out-str
                   (e/process-file yaml-file))]
      (is (.exists png-file))
      (is (not= yaml-file-size-before (.length yaml-file)))
      (is (= (slurp yaml-expected) (slurp yaml-file)))
      (is (<= 50000 (.length png-file)))
      (is (= 2 (count-substring output "✅")))
      (is (= 0 (count-substring output "🚨")))
      (is (= 1 (count (split-lines output))))
      (delete-file yaml-file)
      (delete-file png-file)))
  (testing "sad path: formatting+snapping succeeds, but rendering fails"
    (let [yaml-file (tmp-copy "test/data/structurizr/express/se_diagram_invalid_b.yaml")
          yaml-expected "test/data/structurizr/express/se_diagram_invalid_b_formatted_snapped.yaml"
          png-file (file (set-extension yaml-file "png"))
          yaml-file-size-before (.length yaml-file)
          _ (is (or (not (.exists png-file))
                    (.delete png-file)))
          output (with-out-str
                   (is (thrown-with-msg?
                        Exception
                        #"(?s)Error processing.+RENDERING FAILED.+Errors were found in the diagram definition.+diagram type must be"
                        (e/process-file yaml-file))))]
      (is (not (.exists png-file)))
      (is (not= yaml-file-size-before (.length yaml-file)))
      ; We compare the main documents only so we can ignore the comments at the top of the files.
      (is (= (-> yaml-expected slurp split-file ::fy/main)
             (-> yaml-file     slurp split-file ::fy/main)))
      (is (= 2 (count-substring output "✅")))
      (is (= 0 (count-substring output "🚨")))
      (is (= 1 (count (split-lines output))))
      (delete-file yaml-file)))
  (testing "sad path: file contents are subtly invalid, so validation passes, but
           formatting/snapping fails"
    (let [original-file "test/data/structurizr/express/se_diagram_invalid_d.yaml"
          yaml-file (tmp-copy original-file)
          png-file (file (set-extension yaml-file "png"))
          yaml-file-size-before (.length yaml-file)
          _ (is (or (not (.exists png-file))
                    (.delete png-file)))
          output (with-out-str
                   (is (thrown? Exception
                                (e/process-file yaml-file))))]
      (is (not (.exists png-file)))
      (is (= yaml-file-size-before (.length yaml-file)))
      (is (= (slurp original-file) (slurp yaml-file)))
      (is (= 1 (count-substring output "✅")))
      (is (= 0 (count-substring output "🚨")))
      (is (= 1 (count (split-lines output))))
      (delete-file yaml-file)))
  (testing "sad path: file contents are blatantly invalid, so validation should throw, and no
           formatting, snapping or rendering should occur"
    (let [yaml-file (tmp-copy "test/data/structurizr/express/se_diagram_invalid_a.yaml")
          png-file (file (set-extension yaml-file "png"))
          yaml-file-size-before (.length yaml-file)
          _ (is (or (not (.exists png-file))
                    (.delete png-file)))
          output (with-out-str
                   (is (thrown-with-msg?
                        Exception
                        #"(?s)Error processing.+Spec failed.+invalid because it is missing the root property.+scope"
                        (e/process-file yaml-file))))]
      (is (not (.exists png-file)))
      (is (= yaml-file-size-before (.length yaml-file)))
      (is (= 0 (count-substring output "✅")))
      (is (= 0 (count-substring output "🚨")))
      (is (= 1 (count (split-lines output))))
      (delete-file yaml-file))))
