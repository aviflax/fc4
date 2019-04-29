(ns fc4.integrations.structurizr.express.render
  (:require [clj-chrome-devtools.automation :as a :refer [automation?]]
            [clj-chrome-devtools.core :as chrome]
            [clj-chrome-devtools.impl.connection :refer [connection?]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [ends-with? includes? split starts-with? trim]]
            [cognitect.anomalies :as anom]
            [fc4.util :refer [namespaces]]
            [fc4.yaml :as yaml])
  (:import [java.io ByteArrayInputStream ByteArrayOutputStream]
           [java.util Base64]
           [javax.imageio ImageIO]))

;; Import various Java AWT classes that we need to work with the images — but first set a system
;; property that will prevent the Java app icon from popping up and grabbing focus on MacOS. That is
;; why these imports are here rather that in the ns form.
(System/setProperty "apple.awt.UIElement" "true")
(import '[java.awt Color Font Image RenderingHints]
        '[java.awt.image BufferedImage])

;; The private functions that accept a clj-chrome-devtools automation context
;; are stateful in that they expect the page to be in a certain state before they are called.
;;
;; Therefore these functions must be called in a specific order:
;;
;; 1. load-structurizr-express
;; 2. set-yaml-and-update-diagram
;; 3. extract-diagram

(namespaces '[structurizr :as st])

(def structurizr-express-url "https://structurizr.com/express")

(s/def ::browser #(instance? Process %))
(s/def ::conn connection?)
(s/def ::automation automation?)
(s/def ::renderer (s/keys :req [::browser ::conn ::automation]))
(s/def ::message string?)
(s/def ::line any?)  ;; TODO: FIX
(s/def ::line-num any?) ;; TODO: FIX
(s/def ::error (s/keys :req [::message] :opt [::line ::line-num]))
(s/def ::errors (s/coll-of ::error))

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

(defn- prep-yaml
  "Structurizr Express will only recognize the YAML as YAML and parse it if
  it begins with the YAML document separator. If this isn’t present, it will
  assume that the diagram definition string is JSON and will fail."
  [the-yaml]
  (str "---\n" (::yaml/main (yaml/split-file the-yaml))))

(defn- load-structurizr-express
  [automation]
  (a/to automation structurizr-express-url)
  ; (visible ) TODO
  nil)

(defn- set-yaml-and-update-diagram
  [automation yaml]
  ;; I’m not 100% sure but I suspect it’s important to call hasErrorMessages() after
  ;; renderExpressDefinition so that the JS runtime finishes the execution of
  ;; renderExpressDefinition before this (clj) function returns. Before I added the hasErrorMessages
  ;; call, I was getting errors when subsequently calling exportCurrentDiagramToPNG, and I think
  ;; they were due to the YAML not actually being fully “set” yet. Honestly I’m not entirely sure.
  (a/evaluate automation (str "const diagramYaml = `" yaml "`;\n"
                              "structurizr.scripting.renderExpressDefinition(diagramYaml);"))
  (when (a/evaluate automation "structurizrExpress.hasErrorMessages();")
    (throw (ex-info "Errors!" {:errors
                               (a/evaluate automation "structurizrExpress.getErrorMessages();")}))))

(s/fdef set-yaml-and-update-diagram
  :args (s/cat :automation   ::automation
               :diagram-yaml ::st/diagram-yaml-str) ; TODO: maybe create a spec for prepped-yaml
  :ret  (s/or :success nil?
              :failure ::errors))

(def png-data-uri-prefix "data:image/png;base64,")

(defn- data-uri-to-bytes
  [data-uri]
  {:pre [(starts-with? data-uri png-data-uri-prefix)]}
  (let [decoder (Base64/getDecoder)]
    (->> (subs data-uri (count png-data-uri-prefix))
         (.decode decoder))))

(defn- extract-diagram
  "Returns, as a bytearray, a PNG image of the current diagram. set-yaml-and-update-diagram must
  have already been called."
  [automation]
  (->> "structurizr.scripting.exportCurrentDiagramToPNG({crop: false});"
       (a/evaluate automation)
       (data-uri-to-bytes)))

(defn- extract-key
  "Returns, as a bytearray, a PNG image of the current diagram’s key. set-yaml-and-update-diagram
  must have already been called."
  [automation]
  (->> "structurizr.scripting.exportCurrentDiagramKeyToPNG();"
       (a/evaluate automation)
       (data-uri-to-bytes)))

(defn- bytes->buffered-image [bytes]
  (ImageIO/read (ByteArrayInputStream. bytes)))

(defn- buffered-image->bytes
  [^BufferedImage img]
  (let [baos (ByteArrayOutputStream.)]
    (ImageIO/write img "png" baos)
    (.toByteArray baos)))

(defn- conjoin
  [diagram-image key-image]
  (let [di (bytes->buffered-image diagram-image)
        ki (bytes->buffered-image key-image)
        sk (.getScaledInstance ki (/ (.getWidth ki) 2) (/ (.getHeight ki) 2) Image/SCALE_SMOOTH)
        w (max (.getWidth di) (.getWidth sk))
        divider-height 2
        gap 8
        ky (+ (.getHeight di) gap)
        kx (- (/ w 2) (/ (.getWidth sk) 2))
        h (+ ky (.getHeight sk))
        ci (BufferedImage. w h BufferedImage/TYPE_INT_RGB)]
    (doto (.createGraphics ci)
      (.setBackground (Color/white))
      (.clearRect 0 0 w h)

      (.setColor (Color/gray))
      (.fillRect 0 (.getHeight di) w divider-height)

      (.drawImage di 0 0 nil)
      (.drawImage sk kx ky nil)

      (.setColor (Color/black))
      (.setFont (Font. Font/SANS_SERIF Font/BOLD 32))
      (.setRenderingHint RenderingHints/KEY_TEXT_ANTIALIASING
                         RenderingHints/VALUE_TEXT_ANTIALIAS_ON)
      (.drawString "Key" (- kx 40) (+ ky (* gap 4))))
    (buffered-image->bytes ci)))

(defn render
  "Renders a Structurizr Express diagram as a PNG file, returning a PNG bytearray on success. Not
  entirely pure; communicates with a child process to perform the rendering."
  [renderer diagram-yaml]
  ;; Protect developers from themselves
  {:pre [(not (ends-with? diagram-yaml ".yaml"))
         (not (ends-with? diagram-yaml ".yml"))]}
  (let [prepped-yaml (prep-yaml diagram-yaml)
        automation (::automation renderer)
        _ (load-structurizr-express automation)
        errors (set-yaml-and-update-diagram automation prepped-yaml)]
    (if errors
      {::anom/message "Errors occurred while rendering."
       ::errors errors}
      (let [diagram-image (extract-diagram automation)
            key-image (extract-key automation)
            final-image (conjoin diagram-image key-image)]
        {::png-bytes final-image}))))

(s/def ::png-bytes (s/and bytes? #(not (zero? (count %)))))
(s/def ::success-result (s/keys :req [::png-bytes]))
(s/def ::failure-result (s/merge ::anom/anomaly (s/keys :req [::errors])))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative/property testing, mainly because rendering
; is currently quite slow (~1–3s on my system) and it performs network I/O.
(s/fdef render
  :args (s/cat :diagram ::st/diagram-yaml-str)
  :ret  (s/or :success ::success-result
              :failure ::failure-result))

(comment
  (use 'clojure.java.io 'fc4.io.util)
  (require :reload '[fc4.integrations.structurizr.express.render :as r])
  (in-ns 'fc4.integrations.structurizr.express.render)

  ; diagram-yaml
  (def dy (slurp "test/data/structurizr/express/diagram_valid_cleaned.yaml"))

  (def renderer (start-renderer))

  ; png-bytes
  (def result (time (render renderer dy)))
  (def pngb (or (::png-bytes result)
                (::anom/message result)
                "WTF"))

  (binary-spit "/tmp/diagram.png" pngb)

  (->> (time (render renderer dy))
       ::png-bytes
       (binary-spit "/tmp/diagram.png"))

  (render renderer "foo"))
