(ns fc4.integrations.structurizr.express.yaml-test
  (:require [clojure.spec.alpha :as s]
            [clojure.string :refer [includes?]]
            [clojure.test :refer [deftest testing is]]
            [cognitect.anomalies :as anom]
            [fc4.integrations.structurizr.express.yaml :as y]
            [fc4.test-utils :refer [check]]))

(deftest probably-diagram? (check `y/probably-diagram?))

(deftest valid?
  (testing "example test"
    (let [result (y/valid? "this is not YAML? Or I guess maybe it is?")]
      (is (s/valid? ::anom/anomaly result))
      (is (every? #(includes? (::anom/message result) %)
                  ["A cursory check"
                   "almost certainly not"
                   "valid Structurizr Express diagram definition"
                   "contain some crucial keywords"]))))
  (testing "property tests"
    (check `y/valid? 300)))
