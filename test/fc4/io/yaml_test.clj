(ns fc4.io.yaml-test
  (:require [clojure.test :as ct :refer [deftest is testing]]
            [fc4.io.yaml :as y]
            [fc4.test-utils :as tu :refer [check]]
            [fc4.util :as fu]))

(deftest validate
  (binding [fu/*throw-on-fail* false]
    (check `y/validate)))
