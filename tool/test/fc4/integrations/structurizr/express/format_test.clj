(ns fc4.integrations.structurizr.express.format-test
  (:require [fc4.integrations.structurizr.express.format :as f]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.yaml :refer [default-front-matter]]
            [clojure.test :refer [deftest testing is]]
            [clojure.spec.gen.alpha :as gen]
            [clojure.spec.alpha :as s]
            [fc4.test-utils :refer [check]]))

(deftest blank-nil-or-empty? (check `f/blank-nil-or-empty?))
(deftest reformat (check `f/reformat 300))
(deftest reorder (check `f/reorder))
(deftest shrink (check `f/shrink 300))

(deftest format-file
  (check `f/reformat-file 200)

  (testing "happy paths"
    (testing "formatting a file that’s valid but is messy and needs cleanup"
      (let [dir "test/data/structurizr/express/"
            in  (slurp (str dir "diagram_valid_messy.yaml"))
            {out ::f/str-formatted} (f/reformat-file in)
            expected (slurp (str dir "diagram_valid_formatted.yaml"))]
        (is (= expected out)))))

  (testing "when the front matter has an extra newline at the end"
    (let [d (-> (s/gen :structurizr/diagram) gen/generate stringify)
          yf (str default-front-matter "\n\n---\n" d)
          {str-result ::f/str-formatted} (f/reformat-file yf)]
      (is (not (re-seq #"\n\n---\n" str-result))))))
