(ns fc4.test-utils
  "Utility functions to integrate clojure.spec.test/check and expound with
  clojure.test. Originally inspired by
  https://gist.github.com/Risto-Stevcev/dc628109abd840c7553de1c5d7d55608"
  (:require [clojure.test             :as t :refer [is]]
            [clojure.spec.alpha       :as s]
            [clojure.spec.test.alpha  :as st]
            [expound.alpha            :as expound]))

(defn make-opts
  "Helper to construct options to be passed to st/check.
  See https://clojure.github.io/spec.alpha/clojure.spec.test.alpha-api.html#clojure.spec.test.alpha/check"
  [num-tests gen]
  {:gen gen
   :clojure.spec.test.check/opts {:num-tests num-tests}})

;; TODO: maybe this should be a macro; might improve stack traces (which
;; currently show the `is` as being in this file, in this fn, because it
;; is.)
(defn check
  "Helper fn to integrate clojure.spec.test/check with clojure.test. The third
  (optional) arg is a map of generator overrides, e.g.
  `{:foo/bar #(s/gen string?)}`"
  ([sym]
   (check sym 1000 {}))
  ([sym num-tests]
   (check sym num-tests {}))
  ([sym num-tests gen]
   (let [results (st/check sym (make-opts num-tests gen))]
     (is (nil? (-> results first :failure))
         (binding [s/*explain-out* expound/printer]
           (expound/explain-results-str results))))))
