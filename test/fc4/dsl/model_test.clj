(ns fc4.dsl.model-test
  (:require [clojure.test :refer [deftest]]
            [fc4.dsl.model :as dm]
            [fc4.test-utils :refer [check]]))

(deftest parse-file (check `dm/parse-file 100))
(deftest validate-parsed-file (check `dm/validate-parsed-file 100))

;; 20 is a really low number of test cases, but it takes ~33 seconds on my laptop. So it might be
;; worth looking into speeding up this test.
(deftest build-model (check `dm/build-model 20))
