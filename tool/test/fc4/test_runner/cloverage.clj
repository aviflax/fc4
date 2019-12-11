(ns fc4.test-runner.cloverage
  "An adapter that enables Cloverage to use this project’s custom test-runner
  (which is really just a test-runner-runner that runs eftest with some
  specific options)."
  (:require [cloverage.coverage :as cov]
            [fc4.test-runner.runner :as runner]))

;; This is based on https://github.com/circleci/circleci.test/blob/master/src/circleci/test/cloverage.clj
;; and the structure of the below function, and the comment that precedes it, come from that file.

;; This is a copy of the clojure.test runner which ships with cloverage
;; but with clojure.test swapped out with fc4.test-runner.runner's run-tests.
(defmethod cov/runner-fn :fc4.test-runner [{}]
  (fn [nses]
    (apply require (map symbol nses))
    {:errors (reduce + ((juxt :error :fail)
                        (runner/run-tests)))}))
