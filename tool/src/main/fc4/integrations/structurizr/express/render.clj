(ns fc4.integrations.structurizr.express.render
  (:require [clj-chrome-devtools.automation :as a :refer [automation?]]
            [clj-chrome-devtools.core :as chrome]
            [clj-chrome-devtools.impl.connection :refer [connection?]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [ends-with? includes? split starts-with? trim]]
            [cognitect.anomalies :as anom]
            [fc4.util :refer [namespaces]]
            [fc4.yaml :as yaml])
  (:import [java.util Base64]))

(namespaces '[structurizr :as st])

(def structurizr-express-url "https://structurizr.com/express")

(s/def ::browser #(instance? Process %))
(s/def ::conn connection?)
(s/def ::automation automation?)
(s/def ::renderer (s/keys :req [::browser ::conn ::automation]))

; TEMP TEMP
; Not sure if maybe this would be a better approach?
;
; (defprotocol Renderer
;   (start [])
;   (render [diagram-yaml]))
;
; (defrecord TheRenderer [browser conn automation])

(defn start-renderer
  "Creates and starts a renderer."
  []
  (let [conn (chrome/connect "localhost" 9222)]
    {::browser nil ;; TODO!!!!
     ::conn conn
     ::automation (a/create-automation conn)}))

(s/fdef start-renderer
  :args nil
  :ret  ::renderer)

(defn stop-renderer
  "Stops (shuts down) a renderer."
  [renderer]
  "TODO")

(s/fdef stop-renderer
  :args (s/cat :renderer ::renderer)
  :ret  nil?)

(defn prep-yaml
  "Structurizr Express will only recognize the YAML as YAML and parse it if
  it begins with the YAML document separator. If this isn’t present, it will
  assume that the diagram definition string is JSON and will fail."
  [the-yaml]
  (str "---\n" (::yaml/main (yaml/split-file the-yaml))))

(defn load-structurizr-express
  [automation]
  (a/to automation structurizr-express-url)
  ; (visible ) TODO
  nil)

(defn set-yaml-and-update-diagram
  [automation yaml]
  (a/evaluate automation (str "const diagramYaml = `" yaml "`;\n"
                              "structurizr.scripting.renderExpressDefinition(diagramYaml);")))

(def png-data-uri-prefix "data:image/png;base64,")

(defn- data-uri-to-bytes
  [data-uri]
  {:pre [(starts-with? data-uri png-data-uri-prefix)]}
  (let [decoder (Base64/getDecoder)]
    (->> (subs data-uri (count png-data-uri-prefix))
         (.decode decoder))))

(defn extract-diagram
  "Returns, as a String, a data URI containing the diagram as a PNG image."
  [automation]
  (a/evaluate automation "structurizr.scripting.exportCurrentDiagramToPNG({crop: false});"))

(s/def ::stderr string?)
(s/def ::human-output string?)
(s/def ::message string?)
(s/def ::errors (s/coll-of ::error))
(s/def ::error (s/keys :req [::message]
                       :opt [::errors]))

(defn render
  "Renders a Structurizr Express diagram as a PNG file, returning a PNG
  bytearray on success. Not entirely pure; communicates with a child process to perform the
  rendering."
  [renderer diagram-yaml]
  ;; Protect developers from themselves
  {:pre [(not (ends-with? diagram-yaml ".yaml"))
         (not (ends-with? diagram-yaml ".yml"))]}
  (let [prepped-yaml (prep-yaml diagram-yaml)
        automation (::automation renderer)
        _ (load-structurizr-express automation)
        _ (set-yaml-and-update-diagram automation prepped-yaml)
        _ (Thread/sleep 500) ;; TODO: optimize!
        image-data-uri (extract-diagram automation)
        image-bytes (data-uri-to-bytes image-data-uri)]
    {::png-bytes image-bytes}))

(s/def ::png-bytes (s/and bytes? #(> (count %) 0)))
(s/def ::result (s/keys :req [::png-bytes]))

(s/def ::failure
  (s/merge ::anom/anomaly (s/keys :req [::stderr ::error])))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative testing, mainly because rendering is
; currently quite slow (~2s on my system).
(s/fdef render
  :args (s/cat :diagram ::st/diagram-yaml-str)
  :ret  (s/or :success ::result
              :failure ::failure))

(comment
  (use 'clojure.java.io 'fc4.io.util)
  (require :reload '[fc4.integrations.structurizr.express.render :as r])
  (in-ns 'fc4.integrations.structurizr.express.render)

  ; diagram-yaml
  (def dy (slurp "test/data/structurizr/express/diagram_valid_cleaned.yaml"))

  (def renderer (start-renderer))

  ; png-bytes
  (def result (render renderer dy))
  (def pngb (or (::png-bytes result)
                (::anom/message result)
                "WTF"))

  (binary-spit "/tmp/diagram.png" pngb))
