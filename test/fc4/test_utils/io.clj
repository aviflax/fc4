(ns fc4.test-utils.io
  (:require [clojure.java.io :refer [copy delete-file file writer]]
            [fc4.files :refer [get-extension remove-extension]])
  (:import [java.io File]))

(defn tmp-copy
  "Creates a new tempfile with a very similar name to the input file/path
  and the same contents as the file/path. Returns a File object pointing to
  the tempfile."
  [source-file]
  (let [source (file source-file) ; just in case the source was a string
        base-name (remove-extension source)
        suffix (str "." (get-extension source))
        dir (.getParentFile source)
        tmp-file (File/createTempFile base-name suffix dir)]
    (copy source tmp-file)
    tmp-file))
