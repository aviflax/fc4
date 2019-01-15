(ns fc4.dsl-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.dsl :as dsl]
            [fc4.test-utils :refer [check]]))

(deftest parse-model-file   (check `dsl/parse-model-file 100))
(deftest validate-file-map  (check `dsl/validate-file-map 100))
(deftest add-file-map       (check `dsl/add-file-map 50))
(deftest build-model        (check `dsl/build-model 10))
