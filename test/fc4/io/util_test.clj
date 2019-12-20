(ns fc4.io.util-test
  (:require [clojure.string :refer [includes?]]
            [clojure.test :as ct :refer [deftest is]]
            [fc4.io.util :as u]
            [fc4.test-utils :refer [check]]))

(deftest err-msg (check `u/err-msg))

(deftest read-text-file
  (let [existant     "test/data/structurizr/express/diagram_valid_formatted_snapped.yaml"
        non-existant "test/data/does_not_exist"
        not-text     "test/data/structurizr/express/diagram_valid_expected.png"]
    (is (includes? (u/read-text-file existant) "The FC4 Framework"))
    (is (thrown-with-msg? Exception #"(?i)file not found" (u/read-text-file non-existant)))
    ; read-text-file is a thin wrapper for slurp; as such it behaves the same as
    ; slurp when passed the path to a non-text file: reads the contents of the file
    ; as a String and returns that String. The String is non-sensical but so be it.
    (is (string? (u/read-text-file not-text)))))
