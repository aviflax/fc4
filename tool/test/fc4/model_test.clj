(ns fc4.model-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.model :as m]
            [fc4.test-utils :refer [check]]))

(deftest empty-model       (check `m/empty-model))
(deftest add-file-contents (check `m/add-file-contents))
(deftest build-model       (check `m/build-model))
