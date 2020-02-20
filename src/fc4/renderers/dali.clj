(ns fc4.renderers.dali
  (:require [clojure.spec.alpha :as s]
            [clojure.string :as str]
            [cognitect.anomalies :as anom]
            [dali.io :as dio]
            [dali.layout.align] ; for side-fx
            [dali.layout.stack] ; for side-fx
            [dali.prefab :as dp]
            [dali.syntax :as ds]
            [fc4.io.dsl :as fid]
            [fc4.rendering :as r]
            [fc4.util :as u]))

(u/namespaces '[fc4 :as f]
              '[fc4.model :as m]
              '[fc4.view :as v])

(def elem-width 200)
(def elem-height 100)
(def font-family "Fira Sans")
(def font-size 20)
(def canvas-sizes
  "Map of canvas sizes to dimensions."
  {"2000" [2000 2000]})
(def center-pos [900 900])
(def elem-margin 50)
(def corner-radius 10)

(defn- text-stack [texts]
  (into [:dali/stack {:direction :down :gap 6}]
        (map #(vector :text {:font-family font-family :font-size font-size} %) texts)))

(defn- system-boundary
  "Given a view, compute the boundaries needed for the system by examining the containers included
  in the diagram. Returns a dali rect vector."
  [view]
  (let [container-positions (vals (get-in view [::v/positions ::v/containers]))
        container-xs (map first container-positions)
        container-ys (map second container-positions)
        ; each container position represents the x,y of the upper-left hand corner of the container.
        ; so first we just need to find the leftmost container pos and the topmost pos to find the x and
        ; y we will return.
        lx (- (apply min container-xs) elem-margin)
        ly (- (apply min container-ys) elem-margin)

        ; now we need the rightmost and the bottom-most.
        rx (+ (apply max container-xs) elem-width elem-margin)
        w (- rx lx)
        ry (+ (apply max container-ys) elem-height elem-margin)
        h (- ry ly)]
     [:rect {:fill :none :stroke "#777777"} [lx ly] [w h] corner-radius]))

(defn- get-elem
  "Gets the named element from the model, or nil if not found."
  [elem-name model]
  (some #(get-in model [% elem-name])
        [::m/systems ::m/services ::m/datatypes ::m/datasets ::m/people]))

(defn- description
  "Gets the description for the named element from the model."
  [elem-name model]
  (if-let [elem (get-elem elem-name model)]
    (::m/description elem)
    "ELEMENT NOT FOUND"))

(defn- element
  [id text cl pos]
   [:g {}
    [:dali/align {:axis :center}
     [:rect {:id id :class [cl :box-text] :filter "url(#ds)" :fill "#bf9af2" :stroke "#777777"}
            pos
            [elem-width elem-height]
            corner-radius]
     (text-stack (str/split-lines text))]])

(defn- elements
  "Given a view and a model, returns a sequable of dali SVG vectors representing all the elements
  referenced in the view."
  [view model]
  (map (fn [[elem-name pos]]
         (element elem-name (str elem-name "\n" (description elem-name model)) :system (vec pos)))
       (merge
         ; {(get view ::v/system) center-pos} ; only for context diagrams
         (get-in view [::v/positions ::v/containers])
         (get-in view [::v/positions ::v/systems]))))

(defn render
  "Renders an FC4 view on an FC4 model. Returns either an fc4.rendering/failure-result (which is a
  cognitect.anomalies/anomaly) or an fc4.rendering/success-result."
  [view model _opts]
  (into [:dali/page
          [:defs (dp/drop-shadow-effect :ds {:opacity 0.3 :offset [5 5] :radius 6})]]
    (cons (system-boundary view)
      (elements view model))))

(s/def ::options map?)

(s/fdef render
  :args (s/cat :view  ::f/view
               :model ::f/model
               :opts  ::options)
  :ret  (s/or :success ::r/success-result
              :failure ::r/failure-result))


(comment

  ; (require :reload '[dali.io :as dio]
  ;                  'fc4.dsl.model
  ;                  '[fc4.io.dsl :as fid])


  (do
    (def view (fid/read-view "test/data/views/middle (valid).yaml"))
    (def model (fid/read-model "test/data/models/valid/a/flat"))
    (let [doc (render view model nil)]
      ; (clojure.pprint/pprint doc)
      ; (dio/render-svg doc "test.svg")
      (dio/render-png doc "test.png")))
      )
