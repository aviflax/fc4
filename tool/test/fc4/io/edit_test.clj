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
        valid-before   "test/data/structurizr/express/diagram_valid_messy.yaml"
        valid-expected "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
        invalid-a      "test/data/structurizr/express/se_diagram_invalid_a.yaml"
        invalid-b      "test/data/structurizr/express/se_diagram_invalid_b.yaml"]
    (testing "a YAML string containing a valid SE diagram"
      (is (= (slurp valid-expected)
             (f (slurp valid-before)))))
    (testing "a YAML string containing a blatantly invalid SE diagram"
      (let [yaml (slurp invalid-a)]
        (is (= (-> yaml split-file ::fy/main parse-string)
               (-> yaml f split-file ::fy/main parse-string)))))
    (testing "a YAML string containing a subtly invalid SE diagram"
      (let [yaml (slurp invalid-b)]
        (is (= (-> yaml split-file ::fy/main parse-string)
               (-> yaml f split-file ::fy/main parse-string)))))
    (testing "an empty string"
      (is (nil? (f ""))))))

;; The tests below don’t thoroughly check the specific features that are called by the edit workflow
;; (formatting, snapping, and rendering) because those have their own focused tests already.
;; Therefore it’s sufficient for these tests to simply confirm that those features have been
;; invoked.

;; It’s common for tests to be broader than these, and to use `testing` to test
;; various scenarios. These tests are smaller and more specific, using basically
;; one deftest per scenario, because they are very slow, and these test
;; functions are our units of concurrency. By breaking them into multiple
;; top-level deftests, they can run in parallel.

(deftest edit-workflow-single-file-single-change
  (testing "changing a single file once"
    (let [yaml-expected "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
          yaml-input "test/data/structurizr/express/diagram_valid_messy.yaml"
          yaml-file (tmp-copy yaml-input)
          png-file (file (set-extension yaml-file "png"))
          yaml-file-size-before (.length yaml-file)
          _ (is (or (not (.exists png-file))
                    (.delete png-file)))
          watch (atom nil)
          output (with-out-str
                   (reset! watch (e/start (str yaml-file)))
                   (Thread/sleep 100)
                   (append yaml-file "\n")
                   (Thread/sleep 12000))]
      (e/stop @watch)
      (is (.exists png-file))
      (is (not= yaml-file-size-before (.length yaml-file)))
      (is (= (slurp yaml-expected) (slurp yaml-file)))
      (is (<= 50000 (.length png-file)))
      (is (= 3 (count-substring output "✅")))
      (is (= 2 (count (split-lines output))))
      (delete-file yaml-file)
      (delete-file png-file))))

(deftest edit-workflow-error-should-not-break-watch
  ;; We had a bug wherein if an exception was thrown while rendering — and the
  ;; current workflow does use exceptions, to my regret — further changes to
  ;; that file would not trigger processing.
  (testing "a rendering error should not break the watch for that file"
    (let [yaml-file (tmp-copy "test/data/structurizr/express/se_diagram_invalid_c.yaml")
          watch (atom nil)
          output (with-out-str
                   (reset! watch (e/start (str yaml-file)))
                   (Thread/sleep 100)
                   (append yaml-file "\n")
                   (Thread/sleep 5000)
                   (append yaml-file "\n")
                   (Thread/sleep 5000))]
      (e/stop @watch)
      (is (= 4 (count-substring output "✅")))
      (is (= 2 (count-substring output "🚨")))
      (is (= 2 (count-substring output "💀")))
      (is (= 5 (count (split-lines output))))
      (delete-file yaml-file))))

(deftest edit-workflow-two-files-changed-simultaneously
  (testing "changing two files simultaneously"
    (let [yaml-expected "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
          yaml-input "test/data/structurizr/express/diagram_valid_messy.yaml"
          yaml-files (repeatedly 2 #(tmp-copy yaml-input))
          png-files (map #(file (set-extension % "png")) yaml-files)
          yaml-file-size-before (.length (first yaml-files)) ; they’re identical
          _ (doseq [png-file png-files]
              (is (or (not (.exists png-file))
                      (.delete png-file))))
          watch (atom nil)
          output (with-out-str
                   (reset! watch (apply e/start yaml-files))
                   (Thread/sleep 100)
                   (run! #(append % "\n") yaml-files)
                   (Thread/sleep 18000))]
      (e/stop @watch)
      (is (= 6 (count-substring output "✅"))
          (str "Output should have had 6 ✅:\n"
               output
               "\n»» Maybe rendering timed out or just took longer than the sleep above?"))
      (is (= 3 (count (split-lines output))))
      (doseq [png-file png-files]
        (is (.exists png-file))
        (is (<= 50000 (.length png-file)))
        (delete-file png-file))
      (doseq [yaml-file yaml-files]
        (is (not= (.length yaml-file) yaml-file-size-before))
        (is (= (slurp yaml-expected) (slurp yaml-file)))
        (delete-file yaml-file)))))
