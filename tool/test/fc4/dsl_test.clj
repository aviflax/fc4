(ns fc4.dsl-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.dsl :as dsl]
            [fc4.test-utils :refer [check]]))

(deftest parse-model-file     (check `dsl/parse-model-file 100))
(deftest validate-parsed-file (check `dsl/validate-parsed-file 100))
(deftest add-file-map         (check `dsl/add-file-map 50))

;; 10 is a really low number of test cases, but it takes ~45 seconds on my
;; laptop. So it might be worth looking into speeding up this test.
(deftest build-model          (check `dsl/build-model 10))
