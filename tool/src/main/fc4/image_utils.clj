(ns fc4.image-utils
  (:require [clojure.string :refer [starts-with?]])
  (:import [java.io ByteArrayInputStream ByteArrayOutputStream]
           [java.util Base64]
           [javax.imageio ImageIO]))

;; Some of the functions include some type hints or type casts. These are to prevent reflection, but
;; not for the usual reason of improving performance. In this case, some of the reflection leads to
;; classes that violate some kind of boundary introduced in Java 9/10/11 and yield an ominous
;; message printed to stdout (or maybe stderr).

;; Import various Java AWT classes that we need to work with the images — but first set a system
;; property that will prevent the Java app icon from popping up and grabbing focus on MacOS. That is
;; why these imports are here rather that in the ns form.
(System/setProperty "apple.awt.UIElement" "true")
(import '[java.awt Image]
        '[java.awt.image BufferedImage])

(defn bytes->buffered-image ^BufferedImage [bytes]
  (ImageIO/read (ByteArrayInputStream. bytes)))

(defn buffered-image->bytes
  [^BufferedImage img]
  (let [baos (ByteArrayOutputStream.)]
    (ImageIO/write img "png" baos)
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
