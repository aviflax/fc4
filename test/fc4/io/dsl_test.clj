(ns fc4.io.dsl-test
  (:require [clojure.spec.alpha   :as s]
            [clojure.spec.test.alpha :as stest]
            [clojure.test         :as ct :refer [deftest is testing]]
            [cognitect.anomalies  :as anom]
            [expound.alpha        :as expound :refer [expound-str]]
            [fc4.io.dsl           :as dsl]
            [fc4.util             :as u])
  (:import [java.io FileNotFoundException]))

(u/namespaces '[fc4 :as f]
              '[fc4.model :as m])

;; At first I just called instrument with no args, but I ran into trouble with some specs/fns inside
;; clj-chrome-devtools. So I came up with this overwrought approach to instrumenting only the functions in
;; the namespace under test.
(->> (ns-interns 'fc4.io.dsl)
     (vals)
     (map symbol)
     (stest/instrument))
(set! s/*explain-out* expound/printer)

(deftest read-model-files
  (testing "sad paths:"
    (testing "files on disk contain invalid data as per the specs"
      (let [result (#'dsl/read-model-files "test/data/models/invalid/a/")]
        (is (s/valid? ::dsl/read-model-files-result result)
            (s/explain-str ::dsl/read-model-files-result result))))

    (testing "a file is malformed (it is not valid YAML)"
      (let [result (#'dsl/read-model-files "test/data/models/invalid/malformed/")]
        (is (s/valid? ::dsl/read-model-files-result result)
            (s/explain-str ::dsl/read-model-files-result result))))))

(deftest read-model
  (testing "happy paths:"
    (testing "valid models"
      (doseq [dir ["test/data/models/valid/a/flat/"
                   "test/data/models/valid/a/nested/"
                   "test/data/models/valid/b/single-file/"
                   "test/data/models/valid/b/split/"]]
        (let [result (dsl/read-model dir)]
          (is (s/valid? ::f/model result)
              (if-let [msg (::anom/message result)]
                msg
                (expound-str ::f/model result))))))

    (testing "flat and nested models should be equal once read"
      (is (= (dsl/read-model "test/data/models/valid/a/flat/")
             (dsl/read-model "test/data/models/valid/a/nested/"))))

    (testing "a system definition should be identical whether defined in a single file or split
              across multiple files"
      (is (= (dsl/read-model "test/data/models/valid/b/single-file/")
             (dsl/read-model "test/data/models/valid/b/split/"))))

    (testing "some spot checks of models read from disk"
      (is (= "A bank account of some kind."
             (get-in (dsl/read-model "test/data/models/valid/b/single-file/")
                     [::m/systems "Marketplace" ::m/systems "Exchequer" ::m/description])))

      (is (= {"foo" "bar", "baz" "quux"}
             (get-in (dsl/read-model "test/data/models/valid/b/split/")
                     [::m/systems "Marketplace" ::m/tags])))

      (is (= "qBne47S"
             (get-in (dsl/read-model "test/data/models/valid/a/nested/")
                     [::m/systems "Internal" ::m/containers "External" ::m/description])))

      (is (= "Websockets"
             (get-in (dsl/read-model "test/data/models/valid/a/nested/")
                     [::m/systems "Middle" ::m/uses "Front" ::m/protocol])))))

  (testing "sad path:"
    (testing "files on disk contain invalid data as per the specs"
      (let [result (dsl/read-model "test/data/models/invalid/a/")]
        (is (not (s/valid? ::f/model result)))
        (is (s/valid? ::dsl/anomaly result))))

    (testing "a file is malformed (it is not valid YAML)"
      (let [result (dsl/read-model "test/data/models/invalid/malformed/")]
        (is (not (s/valid? ::f/model result)))
        (is (s/valid? ::dsl/anomaly result))))

    (testing "dir does not exist:"
      (is (thrown-with-msg? FileNotFoundException
                            #"root"
                            (dsl/read-model "foo/bar/root/"))))

    (testing "supplied root path is to a file"
      (let [to-unstrument ['fc4.io.dsl/read-model
                           'fc4.io.dsl/read-model-files]]
        ;; The specs for this function and the functions it invokes specify *correct* inputs. So in
        ;; order to test what the fn does with *incorrect* inputs, we need to un-instrument it and
        ;; the functions it invokes.
        (stest/unstrument to-unstrument)

        (is (thrown-with-msg? RuntimeException #"not a dir"
                              (dsl/read-model "test/data/models/valid/a/flat/analyst.yaml")))

        ;; Re-instrument those fns — it just seems like a good idea.
        (stest/instrument to-unstrument)))))

(deftest read-view
  (testing "happy path"
    (let [result (dsl/read-view "test/data/views/middle (valid).yaml")]
      (is (empty? (::anom/message result)) (::anom/message result))
      (is (s/valid? ::f/view result)
          (or (::anom/message result) (expound-str ::f/view result)))))

  (testing "sad path:"
    (let [to-unstrument ['fc4.io.dsl/read-view]]
      ;; The specs for this function and the functions it invokes specify *correct* inputs. So in
      ;; order to test what the fn does with *incorrect* inputs, we need to un-instrument it and
      ;; the functions it invokes.
      (stest/unstrument to-unstrument)

      (testing "file on disk contains invalid data as per the specs"
        (let [result (dsl/read-view "test/data/views/middle (invalid).yaml")]
          (is (not (s/valid? ::f/view result)))
          (is (s/valid? ::dsl/anomaly result))))

      (testing "file does not exist"
        (is (thrown-with-msg? FileNotFoundException #"foo"
                              (dsl/read-view "foo"))))

      ;; Re-instrument those fns — it just seems like a good idea.
      (stest/instrument to-unstrument))))
