(ns fc4.image-utils
  (:require [clojure.string :refer [starts-with?]])
  (:import [java.awt Image]
           [java.awt.image BufferedImage]
           [java.io ByteArrayInputStream ByteArrayOutputStream IOException]
           [java.util Base64]
           [javax.imageio ImageIO]))

;; Some of the functions include some type hints or type casts. These are to prevent reflection, but
;; not for the usual reason of improving performance. In this case, some of the reflection violates
;; the module boundary rules introduced in Java 9/10/11(?) and yield an ominous message printed to
;; stdout (or maybe stderr).

(defn bytes->buffered-image ^BufferedImage [bytes]
  (ImageIO/read (ByteArrayInputStream. bytes)))

(defn buffered-image->bytes
  [^BufferedImage img]
  (let [baos (ByteArrayOutputStream.)]
    (or (ImageIO/write img "png" baos)
        (throw (IOException. "No appropriate writer could be found.")))
    (.toByteArray baos)))

(def ^:private png-data-uri-prefix "data:image/png;base64,")

(defn png-data-uri->bytes
  [data-uri]
  {:pre [(string? data-uri)
         (starts-with? data-uri png-data-uri-prefix)]}
  (.decode (Base64/getDecoder)
           (subs data-uri (count png-data-uri-prefix))))

(defn width
  "Get the width of a java.awt.Image concisely and without reflection."
  [^Image image]
  (.getWidth image nil))

(defn height
  "Get the height of a java.awt.Image concisely and without reflection."
  [^Image image]
  (.getHeight image nil))
