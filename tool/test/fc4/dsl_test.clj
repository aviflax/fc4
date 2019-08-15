(ns fc4.dsl-test
  (:require [clojure.test :refer [deftest is testing]]
            [fc4.dsl :as dsl]
            [fc4.model :as m]
            [fc4.test-utils :refer [check]]))

(deftest parse-model-file     (check `dsl/parse-model-file 100))
(deftest validate-parsed-file (check `dsl/validate-parsed-file 100))
(deftest add-file-map         (check `dsl/add-file-map 50))

(deftest build-model
  ;; 10 is a really low number of test cases, but it takes ~45 seconds on my
  ;; laptop. So it might be worth looking into speeding up this test.
  (testing "property tests"
    (check `dsl/build-model 10))
  (testing "example tests"
    (testing "the contents of multiple files are aggregated, even when the root keys in the files vary"
      (let [file-maps [{:systems {"foo" {:description "bar"}
                                  "baz" {:description "quux"}}}
                       {:system {"blargh" {:description "bleergh"}}}]
            result (dsl/build-model file-maps)]
        (is (= #::m{"foo"    {:description "bar"}
                    "baz"    {:description "quux"}
                    "blargh" {:description "bleergh"}}
               (::m/systems result)))))))
