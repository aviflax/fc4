(ns fc4.integrations.structurizr.express.chromium-renderer
  (:require [clj-chrome-devtools.automation :as a :refer [automation?]]
            [clj-chrome-devtools.core :as chrome]
            [clj-chrome-devtools.impl.connection :refer [connection?]]
            [clojure.java.io :refer [file]]
            [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [blank? ends-with? includes? join split starts-with? trim]]
            [cognitect.anomalies :as anom]
            [fc4.image-utils :refer [bytes->buffered-image buffered-image->bytes png-data-uri->bytes width height]]
            [fc4.integrations.structurizr.express.spec] ;; for side effects
            [fc4.rendering :as r :refer [Renderer]]
            [fc4.util :refer [fault namespaces qualify-keys]]
            [fc4.yaml :as yaml]))

;; Some of the functions include some type hints or type casts. These are to prevent reflection, but
;; not for the usual reason of improving performance. In this case, some of the reflection leads to
;; classes that violate some kind of boundary introduced in Java 9/10/11 and yield an ominous
;; message printed to stdout (or maybe stderr).

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
;; 3. extract-diagram and/or extract-key

(def ^:private doc-separator "---\n")

(s/def ::headless boolean?)
(s/def ::structurizr-express-url string?)
(s/def ::debug-port nat-int?)
(s/def ::debug-conn-timeout-ms nat-int?)
(s/def ::opts (s/keys :opt-un [::headless ::structurizr-express-url]))
(s/def ::browser #(instance? Process %))
(s/def ::conn connection?)
(s/def ::automation automation?)
(s/def ::prepped-yaml
  (s/and string?
         (complement blank?)
         #(starts-with? % doc-separator)
         #(not (re-seq #"[^\\]`" %))))

(defn- chromium-path
  []
  (let [user-home (System/getProperty "user.home")
        mac-chromium-path "Applications/Chromium.app/Contents/MacOS/Chromium"
        mac-chrome-path "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    (->> (filter #(.canExecute (file %))
                 [;; On MacOS, prefer a browser installed in a user’s home directory to one
                  ;; installed system-wide.
                  (file user-home mac-chromium-path)
                  (file user-home mac-chrome-path)
                  (file "/" mac-chromium-path)
                  (file "/" mac-chrome-path)
                  "/usr/bin/chromium" ; Debian
                  "/usr/bin/chromium-browser"]) ; Alpine
         (first)
         (str))))

(defn- chromium-opts
  [opts]
  (let [{:keys [headless debug-port]} opts]
    [(chromium-path) ;; TODO: handle this being nil — here, or somewhere else, maybe start-browser

     (str "--remote-debugging-port=" debug-port)

     (if headless "--headless" "")

     ; So as to ensure that tabs from the prior session aren’t restored.
     "--incognito"

     ; We need this because we’re using the default user in our local Docker-based
     ; test running environment, which is apparently root, and Chromium won’t
     ; run as root unless this arg is passed.
     "--no-sandbox"

     ; Recommended here:
     ;   https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips
     "--disable-dev-shm-usage"]))

(defn- start-browser
  [opts]
  (.exec (Runtime/getRuntime) ^"[Ljava.lang.String;" (into-array (chromium-opts opts))))

(defn- prep-yaml
  "Structurizr Express will only recognize the YAML as YAML and parse it if
  it begins with the YAML document separator. If this isn’t present, it will
  assume that the diagram definition string is JSON and will fail."
  [yaml]
  (as-> (yaml/split-file yaml) it
    (::yaml/main it)
    (str/replace it "`" "\\`") ; un-escaped backticks interfere when passing YAML in to JS runtime
    (str doc-separator it)))

(s/fdef prep-yaml
  :args (s/cat :yaml string?)
  :ret  ::prepped-yaml)

(defn- load-structurizr-express
  [automation url]
  (let [page (a/to automation url)]
    (if (includes? (:document-url page) "chrome-error")
      (fault "Could not load Structurizr Express (unknown error; possible connectivity problem)")
      (when-not (a/visible automation (a/sel1 automation "svg"))
        (fault "Could not load Structurizr Express (svg node not found)")))))

(s/fdef load-structurizr-express
  :args (s/cat :automation ::automation
               :url string?)
  :ret  (s/or :success nil
              :failure ::anom/anomaly))

(defn- set-yaml-and-update-diagram
  [automation yaml]
  ;; I’m not 100% sure but I suspect it’s important to call hasErrorMessages() after
  ;; renderExpressDefinition so that the JS runtime finishes the execution of
  ;; renderExpressDefinition before this (clj) function returns. Before I added the hasErrorMessages
  ;; call, I was getting errors when subsequently calling exportCurrentDiagramToPNG, and I think
  ;; they were due to the YAML not actually being fully “set” yet. Honestly I’m not entirely sure.
  (a/evaluate automation (str "const diagramYaml = `" yaml "`;\n"
                              "structurizr.scripting.renderExpressDefinition(diagramYaml);"))
  (when-let [errs (seq (a/evaluate automation "structurizrExpress.getErrorMessages();"))]
    (str "Error occurred while rendering; errors were found in the diagram definition: "
         (join "; " (map :message errs)))))

(s/fdef set-yaml-and-update-diagram
  :args (s/cat :automation ::automation
               :diagram-yaml ::prepped-yaml)
  :ret  (s/or :success nil?
              :err-message string?))

(defn- extract-diagram
  "Returns, as a bytearray, a PNG image of the current diagram. set-yaml-and-update-diagram must
  have already been called."
  [automation]
  (->> "structurizr.scripting.exportCurrentDiagramToPNG({crop: false});"
       (a/evaluate automation)
       (png-data-uri->bytes)))

(defn- extract-key
  "Returns, as a bytearray, a PNG image of the current diagram’s key. set-yaml-and-update-diagram
  must have already been called."
  [automation]
  (->> "structurizr.scripting.exportCurrentDiagramKeyToPNG();"
       (a/evaluate automation)
       (png-data-uri->bytes)))

(defn- conjoin
  [diagram-image key-image]
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

(defn- do-render
  "Renders a Structurizr Express diagram as a PNG file, returning a PNG bytearray on success. Not
  entirely pure; communicates with a child process to perform the rendering."
  [diagram-yaml automation {:keys [structurizr-express-url]}]
  ;; Protect developers from themselves
  {:pre [(not (ends-with? diagram-yaml ".yaml")) (not (ends-with? diagram-yaml ".yml"))]}
  ;; TODO: LOTS more error handling!
  (load-structurizr-express automation structurizr-express-url) ;; TODO: Check return value!
  (if-let [err-msg (set-yaml-and-update-diagram automation (prep-yaml diagram-yaml))]
    (fault err-msg)
    (let [diagram-image (extract-diagram automation)
          key-image (extract-key automation)
          final-image (conjoin diagram-image key-image)]
      {::r/png-bytes final-image})))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative/property testing, mainly because rendering
; is currently quite slow (~1–3s on my system) and it performs network I/O.
(s/fdef do-render
  :args (s/cat :diagram :structurizr/diagram-yaml-str
               :automation ::automation
               :opts ::opts)
  :ret  (s/or :success ::r/success-result
              :failure ::r/failure-result))

(defrecord ChromiumRenderer [browser conn automation opts]
  Renderer
  (render [renderer diagram-yaml] (do-render diagram-yaml automation opts))

  java.io.Closeable
  (close [renderer] (.destroy (:browser renderer))))

(def default-opts
  {:structurizr-express-url "https://structurizr.com/express"
   :headless true
   :debug-port 9222
   :debug-conn-timeout-ms 5000})

(defn make-renderer
  "Creates a ChromiumRenderer. It’s VERY important to call .close on the ChromiumRenderer at some
  point — best way to ensure that is to call this function using with-open."
  ([]
   (make-renderer {}))
  ([opts]
   (let [full-opts (merge default-opts opts)
         browser (start-browser full-opts)
         {:keys [debug-port debug-conn-timeout-ms]} full-opts
         conn (chrome/connect "localhost" debug-port debug-conn-timeout-ms)
         automation (a/create-automation conn)]
     (->ChromiumRenderer browser conn automation full-opts))))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative/property testing, mainly because rendering
; is currently quite slow (~1–3s on my system) and it performs network I/O.
(s/fdef make-renderer
  :args (s/? ::opts)
  :ret  (s/and #(instance? ChromiumRenderer %)
               (s/keys :req-un [::browser ::conn ::automation])))

(comment
  (require :reload '[fc4.rendering :as r :refer [render]])
  (require :reload '[fc4.integrations.structurizr.express.chromium-renderer :refer [make-renderer]])
  (require '[clojure.spec.test.alpha :as stest]
           '[fc4.io.util :refer [binary-spit]])
  (stest/instrument)

  (def test-data-dir "test/data/structurizr/express/")
  (def filenames
    {:valid     "diagram_valid_formatted_snapped.yaml"
     :invalid-a "se_diagram_invalid_a.yaml"
     :invalid-b "se_diagram_invalid_b.yaml"
     :invalid-c "se_diagram_invalid_c.yaml"})

  (defonce renderer (atom (make-renderer)))

  ;; Ensure we can render immediately after creating the renderer — that the renderer is immediately
  ;; ready to go.
  (with-open [renderer (make-renderer)]
    (render renderer ""))

  (as-> :valid it
    (str test-data-dir (get filenames it "????"))
    (slurp it)
    (time (render @renderer it))
    (or (::r/png-bytes it)
        (println (or (::anom/message it) "WTF")))
    (when it (binary-spit "/tmp/diagram.png" it)))

  (time (render @renderer ""))

  (.close @renderer)
  (reset! renderer (make-renderer)))
