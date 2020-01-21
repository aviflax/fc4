(ns fc4.renderers.dali
  (:require [clojure.spec.alpha :as s]
            [cognitect.anomalies :as anom]
            [dali.io :as dali]
            [fc4.rendering :as r]))

(u/namespaces '[fc4 :as f])

(def canvas-sizes
  "Map of canvas sizes to dimensions."
  {"A4_Landscape" [600 400]})

(defn- text-stack [texts]
  (vec (concat [:dali/stack {:direction :down :gap 6}]
               (map #(vector :text {:font-family "Verdana" :font-size 14} %) texts))))


(defn- element
  [id text cl pos]
   [:g {}
    [:dali/align {:axis :center}
     [:rect {:id id :class [cl :box-text] :filter "url(#ds)"} pos [80 80] 10]
     (text-stack (string/split-lines text))]])


(defn- elements
  [view model]
  (cons
     )
  )

(defn render
  "Renders an FC4 view on an FC4 model. Returns either an fc4.rendering/failure-result (which is a
  cognitect.anomalies/anomaly) or an fc4.rendering/success-result."
  [view model opts]
  [:dali/page
    [:circle [50 50] 40]]
  )

(s/def ::options map?)

(s/defn render
  :args (s/cat :view  ::f/view
               :model ::f/model
               :opts  ::options)
  :ret  (s/or :success ::r/success-result
              :failure ::r/failure-result))
