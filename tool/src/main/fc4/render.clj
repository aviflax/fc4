(ns fc4.render
  (:require [fc4.integrations.structurizr.express.edit :as se :refer [parse-coords]]
            [clojure.string :refer [includes?]]
            [seesaw.core :as sc]
            [clojure.java.io :as io])
  (:import [java.awt Color]
           [javax.imageio ImageIO]
           [com.mxgraph.view mxGraph]
           [com.mxgraph.swing mxGraphComponent]
           [com.mxgraph.util mxCellRenderer mxPoint]))

(defn new-graph []
  (doto (mxGraph.)
    (.setAllowDanglingEdges false)
    (.setHtmlLabels true)))

(def scale (float 1/5))
(def vertex-width 85)
(def vertex-height 60)

(defn vertex-label-text [{:keys [name description] :as element}]
  (str "<b>" name "</b>"
       (when description
             (str "\n<span style=\"font-size: smaller;\">" description "</span>"))))

(defn add-vertices
  ;; TODO: add shape=actor; if the element is of type Person, and change the dimensions
  [d graph]
  (into {}
    (for [e (:elements d)]
      (let [name (:name e)
            id name
            value (vertex-label-text e)
            root (.getDefaultParent graph)
            [x y] (->> (parse-coords (:position e))
                       (map (partial * scale)))
            style "whiteSpace=wrap;fontSize=8;labelBackgroundColor=#000000;"]
        [name (.insertVertex graph root id value x y vertex-width vertex-height style)]))))

(defn edge-label-text [{:keys [description technology] :as relationship}]
  (str description
       (when technology
             (str "\n[" technology "]"))))

(defn add-edges [d graph vertices]
  (doseq [r (:relationships d)]
    (let [root (.getDefaultParent graph)
          id nil
          value (edge-label-text r)
          source (get vertices (:source r))
          destination (get vertices (:destination r))
          style "fontSize=8;whiteSpace=wrap;labelBackgroundColor=#ffffff;"
          edge (.insertEdge graph root id value source destination style)
          geo (.getGeometry edge)]
      (->> (:vertices r) ; Structurizr Express calls these “vertices” but “control points” or “waypoints” would be less confusing
           (map #(let [[x y] (->> (parse-coords %)
                                  (map (partial * scale)))]
                   (mxPoint. x y)))
           java.util.ArrayList.
           (.setPoints geo)))))

(defn doc->graph [d]
  (let [graph (new-graph)
        root (.getDefaultParent graph)
        vertices (add-vertices d graph)]
    (add-edges d graph vertices)
    graph))

(defn render-image [graph]
  (let [cells nil
        scale 5.0
        background-color Color/WHITE
        anti-alias true
        clip-rect nil]
    (mxCellRenderer/createBufferedImage
       graph cells scale background-color anti-alias clip-rect)))

(defn save-png [image]
  ; Suppress the Java icon from popping up and grabbing focus on MacOS.
  ; Found in a comment to this answer: https://stackoverflow.com/a/17544259/7012
  (System/setProperty "apple.awt.UIElement" "true")
  (ImageIO/write image "PNG" (io/file "/tmp/graph.png")))

(defn render-swing [d]
  (System/setProperty "apple.awt.UIElement" "false")
  (let [graph (doc->graph d)
        {:keys [:type :scope]} d
        title (str type " for " scope)
        frame (sc/frame :title title)]
    (->> (mxGraphComponent. graph)
         sc/scrollable
         (sc/config! frame :content))
    (sc/invoke-later
      (-> frame sc/pack! sc/show!))))

(comment
  (use 'fc4.render)
  (def fc (slurp "examples/internet_banking_context.yaml")) ; fc = file-content
  (-> fc se/process-file ::se/main-processed render-swing)
  (-> fc se/process-file ::se/main-processed doc->graph render-image save-png)
  )
