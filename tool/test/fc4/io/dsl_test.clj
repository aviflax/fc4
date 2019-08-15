(ns fc4.io.dsl-test
  (:require [clojure.spec.alpha   :as s]
            [clojure.string       :as str :refer [includes?]]
            [clojure.test         :as ct :refer [deftest is testing]]
            [cognitect.anomalies  :as anom]
            [fc4.io.dsl           :as dsl]
            [fc4.model            :as m]
            [fc4.styles           :as st]
            [fc4.view             :as v])
  (:import [java.io FileNotFoundException]))

(deftest read-model
  (testing "happy paths:"
    (testing "valid model (flat)"
      (is (s/valid? ::m/model (dsl/read-model "test/data/models/valid/valid-a-flat"))))
    (testing "valid model (nested)"
      (is (s/valid? ::m/model (dsl/read-model "test/data/models/valid/valid-a-nested"))))
    (testing "valid and nested models should be equal once read"
      (is (= (dsl/read-model "test/data/models/valid/valid-a-flat")
             (dsl/read-model "test/data/models/valid/valid-a-nested")))))

  (testing "sad path:"
    (testing "files on disk contain invalid data as per the specs"
      (let [result (dsl/read-model "test/data/models/invalid/invalid-a")]
        (is (not (s/valid? ::m/model result)))
        (is (s/valid? ::dsl/error result))))

    (testing "a file is malformed (it is not valid YAML)"
      (let [result (dsl/read-model "test/data/models/invalid/malformed")]
        (is (not (s/valid? ::m/model result)))
        (is (s/valid? ::dsl/error result))))

    (testing "dir does not exist:"
      (is (thrown-with-msg? FileNotFoundException
                            #"root"
                            (dsl/read-model "foo/bar/root"))))

    (testing "supplied root path is to a file"
      (is (thrown-with-msg? RuntimeException #"not a dir"
                            (dsl/read-model "test/data/styles (valid).yaml"))))))

(deftest read-view
  (testing "happy path"
    (is (s/valid? ::v/view
                  (dsl/read-view "test/data/views/middle (valid).yaml"))))

  (testing "sad path:"
    (testing "file on disk contains invalid data as per the specs"
      (let [result (dsl/read-view "test/data/views/middle (invalid).yaml")]
        (is (not (s/valid? ::v/view result)))
        (is (s/valid? ::dsl/error result))))

    (testing "file does not exist"
      (is (thrown-with-msg? FileNotFoundException #"foo"
                            (dsl/read-view "foo"))))))

(deftest read-styles
  (testing "happy path"
    (is (s/valid? ::st/styles
                  (dsl/read-styles "test/data/styles (valid).yaml"))))

  (testing "sad path:"
    (testing "file on disk contains invalid data as per the specs"
      (let [result (dsl/read-styles "test/data/styles (invalid).yaml")]
        (is (not (s/valid? ::st/styles result)))
        (is (s/valid? ::dsl/error result))))

    (testing "file does not exist"
      (is (thrown-with-msg? FileNotFoundException #"foo"
                            (dsl/read-styles "foo"))))))
