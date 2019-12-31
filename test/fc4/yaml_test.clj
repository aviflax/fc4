(ns fc4.yaml-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.test-utils :refer [check]]
            [fc4.yaml :as y]))

(deftest split-file (check `y/split-file))
