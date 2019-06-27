(ns fc4.io.watch-test
  (:require [clojure.java.io :refer [copy delete-file file writer]]
            [clojure.string :refer [split-lines]]
            [clojure.test :refer [deftest is testing use-fixtures]]
            [fc4.files :refer [get-extension remove-extension set-extension]]
            [fc4.io.watch :as e]
            [fc4.io.util :as u])
  (:import [java.io File]))

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

(deftest watch
  (testing "changing a single file once"
    ;; ...should trigger a single invocation of the process fn, even though the process fn changes
    ;; the file.
    (let [yaml-file (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
          invocations (atom 0)
          f (fn [fp]
              (swap! invocations inc)
              (when (< @invocations 5) ; failsafe
                ; change the file, which hopefully will not trigger the watch again
                (append fp "ha!\n")))
          watch (delay (e/start f [yaml-file])) ; watch needs to be started inside the with-out-str
          output (with-out-str
                   (force watch)
                   (Thread/sleep 100)
                   (append yaml-file "yo!\n") ; change the file, triggering the watch
                   (Thread/sleep 3000))]
      (e/stop @watch)
      (is (= 1 @invocations))
      (is (= 1 (count-substring (slurp yaml-file) "ha!")))
      (is (= 2 (count (split-lines output))) (str "output: " output))
      (delete-file yaml-file)))
  ;; We had a bug wherein if an exception was thrown while rendering — and the
  ;; current workflow does use exceptions, to my regret — further changes to
  ;; that file would not trigger processing.
  (testing "an error should not break the watch for that file"
    (let [yaml-file (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
          invocations (atom 0)
          f (fn [fp]
              (try
                (if (= @invocations 0)
                  (throw (Exception. "ruh roh"))
                  (print "doing something..."))
                (finally
                  (swap! invocations inc))))
          watch (delay (e/start f [yaml-file])) ; watch needs to be started inside the with-out-str
          output (with-out-str
                   (force watch)
                   (Thread/sleep 100)
                   (append yaml-file "ha!\n")
                   (Thread/sleep 2200)
                   (append yaml-file "ha!\n")
                   (Thread/sleep 300))]
      (e/stop @watch)
      (is (= 2 @invocations))
      (is (= 1 (count-substring output "✅")) (str "output: " output))
      (is (= 1 (count-substring output "🚨")) (str "output: " output))
      (is (= 3 (count (split-lines output))) (str "output: " output))
      (delete-file yaml-file))))
