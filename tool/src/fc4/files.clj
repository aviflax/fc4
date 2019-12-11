(ns fc4.files
  "These functions assist working with files and file paths; they do NOT do I/O."
  (:require [clojure.spec.alpha :as s]
            [clojure.string :refer [ends-with? split starts-with?]]
            [fc4.spec :as fs]))

(defn relativize
  "Accepts two absolute paths. If the first is a “child” of the second, the
  first is relativized to the second and returned as a string. If it is not,
  returns nil."
  [path parent-path]
  (let [[p pp]
        (map str [path parent-path])] ; coerce to strings in case they’re Files
    (when (starts-with? p pp)
      (subs p (if (ends-with? pp "/")
                (count pp)
                (inc (count pp)))))))

(s/fdef relativize
  :args (s/cat :path ::fs/file-path
               :parent-path ::fs/dir-path)
  :ret  ::fs/file-path-str)

(defn get-extension
  "fp should be a File object representing a file path or a string containing a
  file path. The path may be relative or absolute. Returns the extension as a
  string _without_ a prefixed period/dot."
  [fp]
  (-> (str fp)
      (split #"\.")
      (last)))

(defn remove-extension
  "fp should be a File object representing a file path or a string containing a
  file path. The path may be relative or absolute. The path is returned as a
  string with the filename extension, if any, removed."
  [fp]
  (-> (str fp)
      (split #"\." 3)
      (first)))

(defn set-extension
  "Sets the extension part of a filename, overwriting the existing extension, if
  any. fp should be a File object representing a file path or a string
  containing a file path. The path may be relative or absolute. Returns the new
  path as a string."
  [fp ext]
  (str (remove-extension fp) "." ext))
