(ns fc4.schemata.core
  "For basic specs that are used in multiple namespaces."
  (:require [clojure.java.io :as io] ; used to generate File "values" not do IO
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [blank? ends-with? includes? join]]
            [com.gfredericks.test.chuck.generators :as gen']
            [fc4.util :as u]))

(u/namespaces '[fc4 :as f])

(s/def ::f/blank-str #{""})
(s/def ::f/non-blank-str (s/and string? (complement blank?)))
(s/def ::f/no-linebreaks  (s/and string? #(not (includes? % "\n"))))
(s/def ::f/non-blank-simple-str (s/and ::f/non-blank-str ::f/no-linebreaks))
(s/def ::f/description ::f/non-blank-str)

(defn- str-gen
  [min-length max-length]
  ;; Technique found here: https://stackoverflow.com/a/35974064/7012
  (gen/fmap (partial apply str)
            (gen/vector (gen/char-alphanumeric) min-length max-length)))

(s/def ::f/short-non-blank-simple-str
  (let [min 1 max 180] ;; inclusive
    (s/with-gen
      (s/and ::f/non-blank-simple-str
             #(<= min (count %) max))
      #(str-gen min max))))

(s/def ::f/unqualified-keyword
  (s/with-gen
    simple-keyword?
    #(gen/fmap keyword (s/gen ::f/non-blank-simple-str))))

(def max-coord-int 9999) ;; inclusive

(s/def ::f/coord-int
  ;; The upper-bound arg of int-in is *exclusive* and we want the max value
  ;; specified in max-coord-int to be *inclusive*.
  (s/int-in 0 (inc max-coord-int)))

;; The number of digits specified herein needs to be in sync with max-coord-int.
(def coord-pattern-base "(\\d{1,4}), ?(\\d{1,4})")
(def coord-pattern (re-pattern coord-pattern-base))

(s/def ::f/coord-string
  (s/with-gen (s/and string? (partial re-matches coord-pattern))
    #(gen'/string-from-regex coord-pattern)))

(s/def ::f/file-path-str
  (s/with-gen
    (s/and ::f/non-blank-simple-str #(includes? % "/"))
    #(gen/fmap
      (fn [s] (join "/" (repeat 5 s)))
      (s/gen (s/and ::f/short-non-blank-simple-str
                    (fn [s] (>= (count s) 3)))))))

(s/def ::f/file-path-file
  (s/with-gen
    (partial instance? java.io.File)
    #(gen/fmap io/file (s/gen ::f/file-path-str))))

(s/def ::f/file-path
  (s/or :str  ::f/file-path-str
        :file ::f/file-path-file))

(s/def ::f/dir-path-str
  (s/with-gen
    (s/and ::f/file-path-str #(ends-with? % "/"))
    #(gen/fmap
      (fn [file-path] (str file-path "/"))
      (s/gen ::f/file-path-str))))

(s/def ::f/dir-path-file
  (s/with-gen
    (partial instance? java.io.File)
    #(gen/fmap io/file (s/gen ::f/dir-path-str))))

(s/def ::f/dir-path
  (s/or :str  ::f/dir-path-str
        :file ::f/dir-path-file))
