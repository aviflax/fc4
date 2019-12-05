(ns fc4.integrations.structurizr.express.renderer.svg
  (:require [clojure.data.xml :as xml :refer [element]]
            [clojure.string :as str :refer [join split]]))

(defn cleanup
  "Accepts an SVG document generated by Structurizr Express as a String; cleans up the SVG to make
  it more likely to be valid and more likely to render as expected."
  [s]
  (-> s
      (str/replace "&nbsp;" " ") ; HTML entities are not available in SVG
      (str/replace "xml:space=\"preserve\"" ""))) ; was causing rendering issues

(defn- parse-viewbox
  "Accepts an SVG root elem; returns a map like {:min-x 0 :min-y 0 :height 10 :width 10}"
  [e]
  (-> (get-in e [:attrs :viewBox])
      (split #" ")
      (->> (map #(Integer/parseInt %))
           (interleave [:min-x :min-y :width :height])
           (apply hash-map))))

(defn- viewbox->str
  [vb]
  (join " " (map vb [:min-x :min-y :width :height])))

(def svg-ns-uri "http://www.w3.org/2000/svg")
(xml/alias-uri 'svg svg-ns-uri)

(defn conjoin
  [diagram key]
  (let [[de ke] (map xml/parse-str [diagram key])
        d-viewbox (parse-viewbox de)
        [dh kh] (map :height [d-viewbox (parse-viewbox ke)])
        new-height (+ dh kh)
        new-viewbox (assoc d-viewbox :height new-height)
        ky dh]
    (xml/indent-str
     (element ::svg/svg (assoc (:attrs de) :xmlns svg-ns-uri :viewBox (viewbox->str new-viewbox))
              (element ::svg/g {} (:content de))
              (element ::svg/g
                       {:transform (format "translate(0, %d) scale(0.5, 0.5)" ky)}
                       (:content ke))))))
