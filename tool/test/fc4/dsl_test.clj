(ns fc4.dsl-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.dsl :as dsl]
            [fc4.test-utils :refer [check]]))

(deftest parse-model-file (check `m/parse-model-file))
