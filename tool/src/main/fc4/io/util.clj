(ns fc4.io.util
  "Most of these functions don’t actually do I/O, but they are in this namespace anyway because they
  support *other* namespaces that *do* actually do I/O."
  (:require [clojure.java.io :as io :refer [copy file output-stream]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [includes?]]
            [fc4.spec :as fs]
            [fc4.util :as fu])
  (:import [java.io ByteArrayOutputStream FileNotFoundException]))

; Feel free to change for development or whatever.
; This is an atom rather than a dynamic var because the functions in this
; namespace are often called from background threads (e.g. a filesystem
; watching thread) and it’s quite annoying to rebind it in such a situation.
(def debug? (atom false))

(defn debug
  [& vs]
  (when @debug?
    (apply println vs)))

(defn err-msg
  [file-path msg]
  (str "Error processing [" file-path "]: " msg))

(s/fdef err-msg
  :args (s/cat :file ::fs/non-blank-str
               :msg  ::fs/non-blank-str)
  :ret  ::fs/non-blank-str
  :fn   (fn [{:keys [args ret]}]
          (every? (partial includes? ret)
                  (vals args))))

(defn fail
  "Thin wrapper for `fu/fail` that accepts a path and adds it to the message
  using `err-msg`."
  ([path msg]
   (fail path msg {}))
  ([path msg opts]
   (fu/fail (err-msg path msg) opts)))

(defn binary-slurp
  "fp should be either a java.io.File or something coercable to such by
  clojure.java.io/file."
  [fp]
  (let [f (file fp)]
    (with-open [out (ByteArrayOutputStream. (.length f))]
      (copy f out)
      (.toByteArray out))))

(defn binary-spit
  "fp must be a java.io.File or something coercable to such via
  clojure.java.io/file"
  [fp data]
  (with-open [out (output-stream (file fp))]
    (copy data out)))

(defn read-text-file
  "Thin wrapper for slurp that will call `fu/fail` if an exception is
  thrown. Provides slight convenience in making calling code a little more
  concise, given that fail will sometimes return the exception rather than
  throw it, depending on a flag. Also attempts to provide more user-friendly
  error messages than just exception class names."
  [path]
  (try (slurp path)
       (catch FileNotFoundException _ (fu/fail (str "File not found at path: "
                                                    path)))
       (catch Exception e (fu/fail (str "Error reading "
                                        path
                                        ": "
                                        (.getMessage e))
                                   {}
                                   e))))

(defn beep
  "Prints a beep character (7) to stdout and then flushes stdout."
  []
  (print (char 7))
  (flush))

(defn print-now
  "Concatenates args with str, prints the result to stdout using print, then
   flushes stdout."
  [& args]
  (print (apply str args))
  (flush))
