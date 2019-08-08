(ns fc4.model-test
  (:require [clojure.test :refer [deftest is]]
            [fc4.model :as m]
            [fc4.test-utils :refer [check]]))

(deftest elements-from-file (check `m/elements-from-file))
(deftest fixup-container    (check `m/fixup-container))
(deftest fixup-element      (check `m/fixup-element))
(deftest to-set-of-keywords (check `m/to-set-of-keywords))
