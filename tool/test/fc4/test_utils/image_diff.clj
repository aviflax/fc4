(ns fc4.test-utils.image-diff
  (:import  [java.awt Color]
            [java.awt.image BufferedImage]
            [java.io ByteArrayInputStream DataInputStream]
            [javax.imageio ImageIO]))

(defn bytes->buffered-image [bytes]
  (ImageIO/read (ByteArrayInputStream. bytes)))

(defn pixel-diff
  "Ported from https://rosettacode.org/wiki/Percentage_difference_between_images#Java"
  [a b]
  (let [a-color-components (.getRGBColorComponents (Color. a) nil)
        b-color-components (.getRGBColorComponents (Color. b) nil)]
    (->> (map - a-color-components b-color-components)
         (map #(Math/abs %))
         (reduce +))))

(defn image-pixels
  [^BufferedImage img]
  (-> img (.getRaster) (.getDataBuffer) (.getData)))

(defn round-dec
  "Rounds up, e.g. 0.001 rounded to two places will yield 0.01."
  [places d]
  (-> (bigdec d)
      (.setScale places BigDecimal/ROUND_CEILING)
      (double)))

(defn image-diff
  "Ported from https://rosettacode.org/wiki/Percentage_difference_between_images#Java"
  [^BufferedImage a ^BufferedImage b]
  (let [width   (.getWidth a)
        height  (.getHeight a)
        max-diff (* 3 255 width height)]
    (when (or (not= width (.getWidth b))
              (not= height (.getHeight b)))
      (throw (Exception. "Images must have the same dimensions!")))
    (as-> (map pixel-diff (image-pixels a) (image-pixels b)) it
      (reduce + it)
      (/ (* 100.0 it) max-diff)
      (round-dec 4 it))))
