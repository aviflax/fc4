(ns fc4.dsl-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.dsl :as dsl]
            [fc4.test-utils :refer [check]]))

(deftest parse-model-file (check `dsl/parse-model-file 50))
(deftest validate-model-file (check `dsl/validate-model-file 50))
