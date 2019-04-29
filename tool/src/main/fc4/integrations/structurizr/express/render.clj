(ns fc4.integrations.structurizr.express.render
  (:require [clj-chrome-devtools.automation :as a :refer [automation?]]
            [clj-chrome-devtools.core :as chrome]
            [clj-chrome-devtools.impl.connection :refer [connection?]]
            [clojure.java.io :refer [file]]
            [clojure.spec.alpha :as s]
            [clojure.string :refer [ends-with? includes? join split starts-with? trim]]
            [cognitect.anomalies :as anom]
            [fc4.util :refer [namespaces qualify-keys]]
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

(defn- chromium-path
  []
  (first (filter #(.canExecute (file %))
                 ["/Applications/Chromium.app/Contents/MacOS/Chromium" ; MacOS
                  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ; MacOS
                  "/usr/bin/chromium" ; Debian
                  "/usr/bin/chromium-browser"]))) ; Alpine

(def ^:private ^:const chromium-debug-port 9222)
(def ^:private ^:const chromium-debug-conn-timeout-ms 5000) ;; TODO: tighten up?

(defn- start-browser
  [{:keys [headless] :or {headless true}}]
  (.exec (Runtime/getRuntime)
         ^"[Ljava.lang.String;"
         (into-array [(chromium-path) ;; TODO: what if chromium-path returns nil?

                      (str "--remote-debugging-port=" chromium-debug-port)

                      (if headless "--headless" "")

                      ; So as to ensure that tabs from the prior session aren’t restored.
                      "--incognito"

                      ; We need this because we’re using the default user in our local Docker-based
                      ; test running environment, which is apparently root, and Chromium won’t
                      ; run as root unless this arg is passed.
                      "--no-sandbox"

                      ; Recommended here: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips
                      "--disable-dev-shm-usage"])))

(defn start-renderer
  "Creates and starts a renderer. It’s VERY important to pass the renderer to stop at some point."
  ([]
   (start-renderer {}))
  ([browser-opts]
   (let [browser (start-browser browser-opts)
         _ (Thread/sleep 500) ; wait for browser to open a window and a tab TODO: optimize!
         conn (chrome/connect "localhost" chromium-debug-port chromium-debug-conn-timeout-ms)]
     {::browser browser
      ::conn conn
      ::automation (a/create-automation conn)})))

(s/fdef start-renderer
  :args nil
  :ret  ::renderer)

(defn stop
  "Stops (shuts down) a renderer."
  [renderer]
  (.destroy (::browser renderer))
  nil)

(s/fdef stop
  :args (s/cat :renderer ::renderer)
  :ret  nil?)

(defn- prep-yaml
  "Structurizr Express will only recognize the YAML as YAML and parse it if
  it begins with the YAML document separator. If this isn’t present, it will
  assume that the diagram definition string is JSON and will fail."
  ;; TODO: maybe should escape any instance of ` (backtick) in the YAML, because it messes up the
  ;; JavaScript injection in set-yaml-and-update-diagram
  [the-yaml]
  (str "---\n" (::yaml/main (yaml/split-file the-yaml))))

(defn- load-structurizr-express
  [automation]
  (a/to automation structurizr-express-url)
  (a/visible automation (a/sel1 automation "svg"))
  nil)

; We have to capture this at compile time in order for it to have the value we
; want it to; if we referred to *ns* in the body of a function then, because it
; is dynamically bound, it would return the namespace at the top of the stack,
; the “currently active namespace” rather than what we want, which is the
; namespace of this file, because that’s the namespace all our keywords are
; qualified with.
(def ^:private this-ns-name (str *ns*))

(defn- set-yaml-and-update-diagram
  [automation yaml]
  ;; I’m not 100% sure but I suspect it’s important to call hasErrorMessages() after
  ;; renderExpressDefinition so that the JS runtime finishes the execution of
  ;; renderExpressDefinition before this (clj) function returns. Before I added the hasErrorMessages
  ;; call, I was getting errors when subsequently calling exportCurrentDiagramToPNG, and I think
  ;; they were due to the YAML not actually being fully “set” yet. Honestly I’m not entirely sure.
  (a/evaluate automation (str "const diagramYaml = `" yaml "`;\n"
                              "structurizr.scripting.renderExpressDefinition(diagramYaml);"))
  (Thread/sleep 100) ;; TODO: optimize!
  (when (a/evaluate automation "structurizrExpress.hasErrorMessages();")
    (qualify-keys (a/evaluate automation "structurizrExpress.getErrorMessages();")
                  this-ns-name)))

(s/fdef set-yaml-and-update-diagram
  :args (s/cat :automation   ::automation
               :diagram-yaml ::st/diagram-yaml-str) ; TODO: maybe create a spec for prepped-yaml
  :ret  (s/or :success nil?
              :failure ::errors))

(def ^:private ^:const png-data-uri-prefix "data:image/png;base64,")

(defn- data-uri-to-bytes
  [data-uri]
  {:pre [(string? data-uri)
         (starts-with? data-uri png-data-uri-prefix)]}
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
        gap 1
        key-title-y-offset 0 ; Currently 0 for test-compatibility with prior renderer, but I plan to increase this to ~40.
        key-title-x-offset 35 ; Mainly for test-compatibility with prior renderer, but looks OK.
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
      (.drawImage sk kx (inc ky) nil)

      (.setColor (Color/black))
      (.setFont (Font. Font/SANS_SERIF Font/PLAIN 32))
      (.setRenderingHint RenderingHints/KEY_TEXT_ANTIALIASING
                         RenderingHints/VALUE_TEXT_ANTIALIAS_ON)
      (.drawString "Key" (+ kx key-title-y-offset) (+ ky key-title-x-offset)))
    (buffered-image->bytes ci)))

(def ^:private ^:const err-msg-prefix "Errors occurred while rendering: ")

(defn- err-msg
  [msg errors]
  (str err-msg-prefix
       (trim msg)
       ": "
       (join "; " (map ::message errors))))

(defn render
  "Renders a Structurizr Express diagram as a PNG file, returning a PNG bytearray on success. Not
  entirely pure; communicates with a child process to perform the rendering."
  [renderer diagram-yaml]
  ;; Protect developers from themselves
  {:pre [(not (ends-with? diagram-yaml ".yaml"))
         (not (ends-with? diagram-yaml ".yml"))]}
  ;; TODO: LOTS more error handling!
  (let [prepped-yaml (prep-yaml diagram-yaml)
        automation (::automation renderer)
        _ (load-structurizr-express automation)
        errors (set-yaml-and-update-diagram automation prepped-yaml)]
    (if errors
      {::anom/category ::anom/fault
       ::anom/message (err-msg "Errors were found in the diagram definition" errors)
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
  (require '[fc4.io.util :refer [binary-spit]])
  (require :reload '[fc4.integrations.structurizr.express.render :as r])
  (in-ns 'fc4.integrations.structurizr.express.render)

  ; diagram-yaml
  (def dy (slurp "test/data/structurizr/express/diagram_valid_cleaned.yaml"))

  (def renderer (start-renderer {:headless false}))

  ; png-bytes
  (def result (time (render renderer dy)))
  (def pngb (or (::png-bytes result)
                (::anom/message result)
                "WTF"))

  (binary-spit "/tmp/diagram.png" pngb)

  (render renderer (slurp "test/data/structurizr/express/se_diagram_invalid_a.yaml"))

  (->> (time (render renderer dy))
       ::png-bytes
       (binary-spit "/tmp/diagram.png"))

  (render renderer "foo")

  (stop renderer))
