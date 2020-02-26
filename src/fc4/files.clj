(ns fc4.files
  "These functions assist working with files and file paths; they do NOT do I/O."
  (:require [clojure.string :refer [split]]))

(defn remove-extension
  "fp should be a File object representing a file path or a string containing a
  file path. The path may be relative or absolute. The path is returned as a
  string with the filename extension, if any, removed."
  [fp]
  (-> (str fp)
      (split #"\." 3)
      (first)))
