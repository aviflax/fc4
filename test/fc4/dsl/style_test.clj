(ns fc4.dsl.style-test
  (:require [clojure.test :refer [deftest]]
            [fc4.dsl.style :as st]
            [fc4.test-utils :refer [check]]))

(deftest parse-file (check `st/parse-file 1000))
