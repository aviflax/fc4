(ns fc4.dsl.view-test
  (:require [clojure.spec.alpha :as s]
            [clojure.test :refer [deftest is testing]]
            [cognitect.anomalies :as anom]
            [fc4.dsl.view :as v]
            [fc4.test-utils :refer [check]]))

(deftest parse-file
  (testing "happy path"
    (check `v/parse-file 100))

  (testing "sad paths"
    (is (s/valid? ::anom/anomaly (v/parse-file "[")))
    (is (not (s/valid? :fc4/view (v/parse-file "["))))))
