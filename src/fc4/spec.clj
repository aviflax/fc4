(ns fc4.spec
  "For specs that are used in multiple namespaces."
  (:require [clojure.java.io :as io] ; used to generate File "values" not do IO
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [blank? ends-with? includes? join]]))

(s/def ::blank-str #{""})
(s/def ::non-blank-str (s/and string? (complement blank?)))
(s/def ::no-linebreaks  (s/and string? #(not (includes? % "\n"))))
(s/def ::non-blank-simple-str (s/and ::non-blank-str ::no-linebreaks))
(s/def ::description ::non-blank-str)

(defn- str-gen
  [min-length max-length]
  ;; Technique found here: https://stackoverflow.com/a/35974064/7012
  (gen/fmap (partial apply str)
            (gen/vector (gen/char-alphanumeric) min-length max-length)))

(s/def ::short-non-blank-simple-str
  (let [min 1 max 180] ;; inclusive
    (s/with-gen
      (s/and ::non-blank-simple-str
             #(<= min (count %) max))
      #(str-gen min max))))

(s/def ::unqualified-keyword
  (s/with-gen
    simple-keyword?
    #(gen/fmap keyword (s/gen ::non-blank-simple-str))))

(def max-coord-int 9999) ;; inclusive

(s/def ::coord-int
  ;; The upper-bound arg of int-in is *exclusive* and we want the max value
  ;; specified in max-coord-int to be *inclusive*.
  (s/int-in 0 (inc max-coord-int)))

(s/def ::file-path-str
  (s/with-gen
    (s/and ::non-blank-simple-str #(includes? % "/"))
    #(gen/fmap
      (fn [s] (join "/" (repeat 5 s)))
      (s/gen (s/and ::short-non-blank-simple-str
                    (fn [s] (>= (count s) 3)))))))

(s/def ::file-path-file
  (s/with-gen
    (partial instance? java.io.File)
    #(gen/fmap io/file (s/gen ::file-path-str))))

(s/def ::file-path
  (s/or :str  ::file-path-str
        :file ::file-path-file))

(s/def ::dir-path-str
  (s/with-gen
    (s/and ::file-path-str #(ends-with? % "/"))
    #(gen/fmap
      (fn [file-path] (str file-path "/"))
      (s/gen ::file-path-str))))

(s/def ::dir-path-file
  (s/with-gen
    (partial instance? java.io.File)
    #(gen/fmap io/file (s/gen ::dir-path-str))))

(s/def ::dir-path
  (s/or :str  ::dir-path-str
        :file ::dir-path-file))
