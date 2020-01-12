(ns fc4.util-test
  (:require [clojure.test :refer [deftest is testing]]
            [fc4.util :as u]
            [fc4.test-utils :refer [check]])
  (:import [clojure.lang ArityException Namespace]
           [java.util.concurrent TimeoutException]))

(deftest add-ns       (check `u/add-ns))
(deftest qualify-keys (check `u/qualify-keys))
(deftest update-all   (check `u/update-all))
(deftest fault?       (check `u/fault?))

(defn- cleanup-namespaces
  "Needed because `namespaces` has stateful side effects."
  []
  (doseq [alias '[f b]]
    (ns-unalias *ns* alias)))

(deftest namespaces
  (testing "happy paths"
    (testing "single arg"
      (cleanup-namespaces)
      (let [aliases-before (ns-aliases *ns*)
            ret            (u/namespaces '[foo :as f])
            aliases-after  (ns-aliases *ns*)]
        (is (nil? ret))
        (is (= (count aliases-after)
               (inc (count aliases-before))))
        (is (contains? aliases-after 'f))
        (is (instance? clojure.lang.Namespace (get aliases-after 'f)))
        (is (= (str (get aliases-after 'f)) "foo")))
      (cleanup-namespaces))

    (testing "two args"
      (cleanup-namespaces)
      (let [aliases-before (ns-aliases *ns*)
            ret            (u/namespaces '[foo :as f] '[bar :as b])
            aliases-after  (ns-aliases *ns*)
            asyms          '[f b]]
        (is (nil? ret))
        (is (= (count aliases-after)
               (+ (count aliases-before) 2)))
        (is (every? (partial contains? aliases-after) asyms))
        (is (every? #(instance? Namespace (get aliases-after %)) asyms))
        (is (= (str (get aliases-after 'f)) "foo"))
        (is (= (str (get aliases-after 'b)) "bar")))
      (cleanup-namespaces)))

  (testing "sad paths"
    (testing "no args"
      (is (thrown? ArityException (u/namespaces))))
    (testing "malformed tuples"
      (doseq [v [:foo
                 ["foo" "as" "bar"]
                 '[foo :as :21]
                 '[foo f]]]
        (is (thrown? AssertionError (u/namespaces v)))))))

(deftest with-timeout
  (testing "a body that finishes executing before the timeout has elapsed"
    (is (true? (u/with-timeout 100
                 (do (Thread/sleep 10) true)))))
  (testing "a body that takes longer than the timeout to finish"
    (is (thrown? TimeoutException
                 (u/with-timeout 100
                   (do (Thread/sleep 200) true))))))
