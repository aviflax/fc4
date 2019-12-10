(ns fc4.integrations.structurizr.express.renderer.png
  (:require [fc4.image-utils :refer [bytes->buffered-image buffered-image->bytes width height]]
            [fc4.io.util :refer [debug]])
  (:import [java.awt Color Font Image RenderingHints]
           [java.awt.image BufferedImage]))

(defn conjoin
  [diagram-image key-image]
  (debug "Conjoining diagram and key...")
  ; There are a few casts to int below; they’re to avoid reflection.
  (let [di (bytes->buffered-image diagram-image)
        ki (bytes->buffered-image key-image)
        ^Image sk (.getScaledInstance ki (/ (width ki) 2) (/ (height ki) 2) Image/SCALE_SMOOTH)
        w (max (width di) (width sk))
        divider-height 2
        gap 1
        key-title-y-offset 0 ; Currently 0 for test-compatibility with prior renderer, but I plan to increase this to ~40.
        key-title-x-offset 35 ; Mainly for test-compatibility with prior renderer, but looks OK.
        ky (+ (.getHeight di) gap)
        kx (- (/ w 2) (/ (width sk) 2))
        h (+ ky (height sk))
        ci (BufferedImage. w h BufferedImage/TYPE_INT_RGB)]
    (doto (.createGraphics ci)
      (.setBackground (Color/white))
      (.clearRect 0 0 w h)

      (.setColor (Color/gray))
      (.fillRect 0 (.getHeight di) w divider-height)

      (.drawImage di 0 0 nil)
      (.drawImage sk (int kx) (int (inc ky)) nil)

      (.setColor (Color/black))
      (.setFont (Font. Font/SANS_SERIF Font/PLAIN 32))
      (.setRenderingHint RenderingHints/KEY_TEXT_ANTIALIASING
                         RenderingHints/VALUE_TEXT_ANTIALIAS_ON)
      (.drawString "Key" (int (+ kx key-title-y-offset)) (int (+ ky key-title-x-offset))))
    (buffered-image->bytes ci)))
