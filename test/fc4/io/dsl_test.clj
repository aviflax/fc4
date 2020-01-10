(ns fc4.io.dsl-test
  (:require [clojure.spec.alpha   :as s]
            [clojure.test         :as ct :refer [deftest is testing]]
            [cognitect.anomalies  :as anom]
            [expound.alpha        :as ex :refer [expound-str]]
            [fc4.io.dsl           :as dsl]
            [fc4.util             :as u])
  (:import [java.io FileNotFoundException]))

(u/namespaces '[fc4 :as f])

(deftest read-model
  (testing "happy paths:"
    (testing "valid models"
      (doseq [dir ["test/data/models/valid/a/flat"
                   "test/data/models/valid/a/nested"
                   "test/data/models/valid/b/split"]]
        (let [result (dsl/read-model dir)]
          (is (s/valid? ::f/model result)
              (if-let [msg (::anom/message result)]
                msg
                (expound-str ::f/model result))))))

    (testing "valid and nested models should be equal once read"
      (is (= (dsl/read-model "test/data/models/valid/a/flat")
             (dsl/read-model "test/data/models/valid/a/nested")))))

  (testing "sad path:"
    (testing "files on disk contain invalid data as per the specs"
      (let [result (dsl/read-model "test/data/models/invalid/a")]
        (is (not (s/valid? ::f/model result)))
        (is (s/valid? ::dsl/error result))))

    (testing "a file is malformed (it is not valid YAML)"
      (let [result (dsl/read-model "test/data/models/invalid/malformed")]
        (is (not (s/valid? ::f/model result)))
        (is (s/valid? ::dsl/error result))))

    (testing "dir does not exist:"
      (is (thrown-with-msg? FileNotFoundException
                            #"root"
                            (dsl/read-model "foo/bar/root"))))

    (testing "supplied root path is to a file"
      (is (thrown-with-msg? RuntimeException #"not a dir"
                            (dsl/read-model "test/data/models/valid/a/flat/analyst.yaml"))))))
