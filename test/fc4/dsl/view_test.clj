(ns fc4.dsl.view-test
  (:require [clojure.test :refer [deftest]]
            [fc4.dsl.view :as v]
            [fc4.test-utils :refer [check]]))

(deftest parse-file (check `v/parse-file 1000))
(deftest fixup-keys (check `v/fixup-keys 1000))
