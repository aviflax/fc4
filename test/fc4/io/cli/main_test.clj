(ns fc4.io.cli.main-test
  (:require [clj-yaml.core :refer [parse-string]]
            [clojure.java.io :refer [delete-file file]]
            [clojure.string :refer [includes? split-lines]]
            [clojure.test :refer [deftest is testing]]
            [clojure.tools.cli :refer [parse-opts]]
            [fc4.io.cli.main :as main]
            [fc4.io.cli.util :refer [exit-on-exit? exit-on-fail?]]
            [fc4.io.render :as r :refer [yaml-path->out-path]]
            [fc4.io.util :as iou :refer [binary-slurp]]
            [fc4.test-utils.image-diff :refer [bytes->buffered-image image-diff]]
            [fc4.test-utils.io :refer [tmp-copy]]
            [fc4.yaml :as fy :refer [split-file]]
            [image-resizer.core :refer [resize]])
  (:import [info.debatty.java.stringsimilarity NormalizedLevenshtein]))

(defmacro with-err-str
  "Evaluates exprs in a context in which *err* is bound to a fresh
  StringWriter.  Returns the string created by any nested printing
  calls."
  {:fork-of 'clojure.core/with-out-str}
  [& body]
  `(let [s# (new java.io.StringWriter)]
     (binding [*err* s#]
       ~@body
       (str s#))))

(defmacro with-out-err-str
  "Evaluates exprs in a context in which *out* and *err* are bound to fresh
  StringWriters. Returns the strings created by any nested printing
  calls as a tuple (vector out-string err-string)."
  {:fork-of 'clojure.core/with-out-str}
  [& body]
  `(let [os# (new java.io.StringWriter)
         es# (new java.io.StringWriter)]
     (binding [*out* os#
               *err* es#]
       ~@body
       (mapv str [os# es#]))))

(deftest check-opts
  (reset! exit-on-exit? false)
  (reset! exit-on-fail? false)
  (let [f #'main/check-opts
        ff #(f (parse-opts % main/options-spec))
        cases {:no-throw
               [["-f" "."]
                ["-s" "."]
                ["-r" "."]
                ["-fs" "."]
                ["-sr" "."]
                ["-fsr" "."]
                ["-rsf" "."]
                ["-sfr" "."]
                ["-fw" "."]
                ["-sw" "."]
                ["-rw" "."]
                ["-fsw" "."]
                ["-srw" "."]
                ["-r" "-o" "png" "."]
                ["-r" "-o" "svg" "."]
                ["-r" "-o" "png+svg" "."]
                ["-ro png+svg" "."]
                ["-ro svg,png" "."]
                ["-r" "--output-formats=png" "."]
                ["-r" "--output-formats=svg" "."]
                ["-r" "--output-formats=png+svg" "."]
                ["-r" "--output-formats=png,svg" "."]
                ["-r" "--output-formats=svg+png" "."]
                ["-r" "--output-formats=svg,png" "."]
                ["-fsrw" "."]]
               :throw ; because of our reset! calls above, the function will throw rather than exit
               {["--help"] 0 ; user asks for help
                [] 1 ; no args whatsoever
                [""] 1 ; blank string arg; no path and no core feature
                ["-f"] 1  ; no path supplied
                ["--foo"] 1 ; unknown option
                ["."] 1 ; no “core feature” specified
                ["-w" "."] 1 ; no “core feature” specified
                ["-f" "-o" "png" "."] 1 ; -o requires -r
                ["--output-formats" "jpg"] 1 ; not supported
                ["--output-formats" "png;svg"] 1 ; bad delimiter; result not supported
                ["edit" "."] 1 ; legacy command
                ["format" "."] 1 ; legacy command
                ["render" "."] 1 ; legacy command
                }
               :stderr-must-include
               {["-f"] "At least one path MUST be specified"
                ["-fs"] "At least one path MUST be specified"
                ["-fsr"] "At least one path MUST be specified"
                ["-fsrw"] "At least one path MUST be specified"
                ["-f" "-o" "png" "."] "formats is allowed only when -r"
                ["-f" "-o" "jpg" "."] "Supported formats are"
                ["--help"] #"(?ms)Usage.+Options.+Full documentation"
                ["edit" "."] "subcommand `edit` is no longer supported"
                ["format" "."] "subcommand `format` is no longer supported"
                ["render" "."] "subcommand `render` is no longer supported"}}]
    (doseq [opts (cases :no-throw)]
      (is (nil? (ff opts))))
    (doseq [[opts expected-exit] (cases :throw)]
      (with-err-str ; suppress error messages
        (is (thrown? Exception (ff opts))))
      (with-err-str ; suppress error messages
        (let [e (try (ff opts) (catch Exception e (str e)))
              actual-exit (Integer/parseInt (str (last e)))]
          (is (= expected-exit actual-exit)))))
    (doseq [[opts msg] (cases :stderr-must-include)]
      (let [stderr (with-err-str
                     (try (ff opts) (catch Exception e (str e))))]
        (is (re-seq (re-pattern msg) stderr)
            (str "The options " opts " should have led to '" msg "' being printed"
                 " to stderr, but didn’t. Contents of stderr:\n" stderr
                 "\nOpts, parsed:\n" (parse-opts opts main/options-spec)))))))

(def max-allowable-image-differences
  {:svg 0.10
   ;; The PNG threshold might seem low, but the diffing algorithm is
   ;; giving very low results for some reason. This threshold seems
   ;; to be sufficient to make the random watermark effectively ignored
   ;; while other, more significant changes (to my eye) seem to be
   ;; caught. Still, this is pretty unscientific, so it might be worth
   ;; looking into making this more precise and methodical.
   :png 0.01})

(defn count-substring
  {:source "https://rosettacode.org/wiki/Count_occurrences_of_a_substring#Clojure"}
  [txt sub]
  (count (re-seq (re-pattern sub) txt)))

(defn main-doc
  "We split the YAML files and compare the main documents because our static files contain comments,
  but a side effect of the format and snap features is that comments are removed from the file. In
  our static files the comments are in the “front matter” — not in the main doc — so by splitting
  the files and comparing the main docs, the comments become irrelevant."
  [fp]
  (-> fp slurp split-file ::fy/main))

(def se "http://structurizr:8080/express")

(deftest ^:eftest/synchronized -main
  (reset! iou/debug? false)
  (reset! exit-on-exit? false)
  (reset! exit-on-fail? false)

  (testing "all features, no watch, single diagram:"
    (testing "happy paths"
      (let [yaml-fp (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
            yaml-expected "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
            expected-png-path "test/data/structurizr/express/diagram_valid_expected.png"
            actual-png-path (yaml-path->out-path yaml-fp :png)
            yaml-file-size-before (.length yaml-fp)
            output (with-out-str
                     (is (thrown-with-msg?
                          Exception
                          #"Normally the program would have exited at this point with status 0"
                          (main/-main "-fsr" "-u" se (str yaml-fp)))))
            _ (is (.canRead (file actual-png-path)))
            difference (->> (map binary-slurp [expected-png-path actual-png-path])
                            (map bytes->buffered-image)
                            (map #(resize % 1000 1000))
                            (reduce image-diff))]
        (is (not= yaml-file-size-before (.length yaml-fp)))
        (is (= (main-doc yaml-expected) (main-doc yaml-fp)))
        (is (<= difference (:png max-allowable-image-differences)))
        (is (= 4 (count-substring output "✅")) output)
        (is (zero? (count-substring output "🚨")) output)
        (is (= 1 (count (split-lines output))) output)
        ; cleanup just so as not to leave git status dirty
        (delete-file yaml-fp :silently)
        (delete-file actual-png-path :silently)))
    (testing "sad paths"
      (testing "blatantly invalid YAML"
        (let [yaml-fp (file "test/data/structurizr/express/se_diagram_invalid_a.yaml")
              yaml-file-size-before (.length yaml-fp)
              png-path (yaml-path->out-path yaml-fp :png)
              output (with-out-str
                       (is (thrown-with-msg?
                            Exception
                            #"Normally the program would have exited at this point with status 0"
                            (main/-main "-fsr" "-u" se (str yaml-fp)))))]
          (is (not (.exists (file png-path))))
          (is (= yaml-file-size-before (.length yaml-fp)))
          (is (zero? (count-substring output "✅")) output)
          (is (= 1 (count-substring output "🚨")) output)
          (is (<= 40 (count (split-lines output)) 50) output)))))

  (testing "render only, with --output-formats"
    (testing "png"
      (let [yaml-fp (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
            expected-png-path "test/data/structurizr/express/diagram_valid_expected.png"
            actual-png-path (yaml-path->out-path yaml-fp :png)
            output (with-out-str
                     (is (thrown-with-msg?
                          Exception
                          #"Normally the program would have exited at this point with status 0"
                          (main/-main "-r" "-u" se "--output-formats=png" (str yaml-fp)))))
            _ (is (.canRead (file actual-png-path)))
            difference (->> (map binary-slurp [expected-png-path actual-png-path])
                            (map bytes->buffered-image)
                            (map #(resize % 1000 1000))
                            (reduce image-diff))]
        (is (<= difference (:png max-allowable-image-differences)))
        (is (= 2 (count-substring output "✅")) output)
        (is (zero? (count-substring output "🚨")) output)
        (is (= 1 (count (split-lines output))) output)
        ; cleanup just so as not to leave git status dirty
        (delete-file yaml-fp :silently)
        (delete-file actual-png-path :silently)))
    (testing "svg"
      (let [yaml-fp (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
            expected-output-path "test/data/structurizr/express/diagram_valid_expected.svg"
            actual-fp (yaml-path->out-path yaml-fp :svg)
            _ (println actual-fp)
            output (with-out-str
                     (is (thrown-with-msg?
                          Exception
                          #"Normally the program would have exited at this point with status 0"
                          (main/-main "-r" "-u" se "--output-formats=svg" (str yaml-fp)))))
            _ (is (.canRead (file actual-fp)))
            [expected actual] (map slurp [expected-output-path actual-fp])
            distance-percentage (.distance (NormalizedLevenshtein.) actual expected)]
        (is (<= distance-percentage (:svg max-allowable-image-differences)))
        (is (= 2 (count-substring output "✅")) output)
        (is (zero? (count-substring output "🚨")) output)
        (is (= 1 (count (split-lines output))) output)
        ; cleanup just so as not to leave git status dirty
        (delete-file yaml-fp :silently)
        (delete-file actual-fp :silently))))

  (testing "format only, no watch, single diagram"
    (let [yaml-fp (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
          yaml-expected "test/data/structurizr/express/diagram_valid_formatted.yaml"
          png-path (yaml-path->out-path yaml-fp :png)
          yaml-file-size-before (.length yaml-fp)
          output (with-out-str
                   (is (thrown-with-msg?
                        Exception
                        #"Normally the program would have exited at this point with status 0"
                        (main/-main "-f" (str yaml-fp)))))]
      (is (not (.exists (file png-path))))
      (is (not= yaml-file-size-before (.length yaml-fp)))
      (is (= (main-doc yaml-expected) (main-doc yaml-fp)))
      (is (= 2 (count-substring output "✅")) output)
      (is (zero? (count-substring output "🚨")) output)
      (is (= 1 (count (split-lines output))) output)
      ; cleanup just so as not to leave git status dirty
      (delete-file yaml-fp :silently)))

  (testing "snap only, no watch, single diagram"
    (testing "happy paths"
      (let [yaml-fp (tmp-copy "test/data/structurizr/express/diagram_valid_messy.yaml")
            yaml-expected "test/data/structurizr/express/diagram_valid_snapped.yaml"
            png-path (yaml-path->out-path yaml-fp :png)
            yaml-file-size-before (.length yaml-fp)
            output (with-out-str
                     (is (thrown-with-msg?
                          Exception
                          #"Normally the program would have exited at this point with status 0"
                          (main/-main "-s" (str yaml-fp)))))]
        (is (not (.exists (file png-path))))
        (is (not= yaml-file-size-before (.length yaml-fp)))
        (is (= (parse-string (main-doc yaml-expected))
               (parse-string (main-doc yaml-fp))))
        (is (= 2 (count-substring output "✅")) output)
        (is (zero? (count-substring output "🚨")) output)
        (is (= 1 (count (split-lines output))) output)
        ; cleanup just so as not to leave git status dirty
        (delete-file yaml-fp :silently))))

  (testing "debug flag"
    (let [[out _err] (with-out-err-str
                       (try (main/-main "--debug" "--help")
                            (catch Exception _ nil)))]
      (is (includes? out "*DEBUG*\nParsed Command Line"))
      (is (includes? out "help"))
      (is (includes? out "debug")))))
