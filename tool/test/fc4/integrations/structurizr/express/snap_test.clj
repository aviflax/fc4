(ns fc4.integrations.structurizr.express.snap-test
  (:require [fc4.integrations.structurizr.express.snap :as s]
            [clojure.test :refer [deftest testing is]]
            [fc4.test-utils :refer [check]]))

(deftest parse-coords (check `s/parse-coords))
(deftest round-to-closest (check `s/round-to-closest 2000))
(deftest snap-coords (check `s/snap-coords))
(deftest snap-elem-to-grid (check `s/snap-elem-to-grid))
(deftest snap-to-grid (check `s/snap-to-grid 300))
