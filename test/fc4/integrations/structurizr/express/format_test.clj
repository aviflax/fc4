(ns fc4.integrations.structurizr.express.format-test
  (:require [fc4.integrations.structurizr.express.format :as f]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.yaml :as fy :refer [assemble default-front-matter split-file]]
            [clj-yaml.core :as yaml]
            [clojure.test :refer [deftest testing is]]
            [clojure.spec.gen.alpha :as gen]
            [clojure.spec.alpha :as s]
            [fc4.test-utils :refer [check]]))

(deftest blank-nil-or-empty? (check `f/blank-nil-or-empty?))
(deftest reformat (check `f/reformat 300))
(deftest reorder (check `f/reorder))
(deftest shrink (check `f/shrink 300))

(defn main-doc
  "We split the YAML files and compare the main documents because our static files contain comments,
  but a side effect of the format feature is that comments are removed from the file. In our static
  files the comments are in the “front matter” — not in the main doc — so by splitting the files and
  comparing the main docs, the comments become irrelevant."
  [yaml-file-contents]
  (::fy/main (split-file yaml-file-contents)))

(defn- reformat-file
  "Accepts a string containing either a single YAML document, or a YAML document and front matter
  (which itself is a YAML document). Returns a map containing:

  * ::main-formatted: the fully formatted main document as an ordered-map
  * ::str-formatted: a string containing first some front matter, then the front
                     matter separator, then the fully formatted main document"
  [s]
  (let [{:keys [::fy/front ::fy/main]} (split-file s)
        main-formatted (f/reformat (yaml/parse-string main))]
    {::main-formatted main-formatted
     ::str-formatted (assemble front (stringify main-formatted))}))

(deftest reformat
  (check `f/reformat 200)

  (testing "happy paths"
    (testing "formatting a file that’s valid but is messy and needs cleanup"
      (let [dir "test/data/structurizr/express/"
            in  (slurp (str dir "diagram_valid_messy.yaml"))
            {out ::f/str-formatted} (reformat-file in)
            expected (slurp (str dir "diagram_valid_formatted.yaml"))]
        (is (= (main-doc expected) (main-doc out))))))

  (testing "when the front matter has an extra newline at the end"
    (let [d (-> (s/gen :structurizr/diagram) gen/generate stringify)
          yf (str default-front-matter "\n\n---\n" d)
          {str-result ::f/str-formatted} (reformat-file yf)]
      (is (not (re-seq #"\n\n---\n" str-result))))))
