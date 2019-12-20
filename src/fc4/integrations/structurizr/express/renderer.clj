(ns fc4.integrations.structurizr.express.renderer
  (:require [clj-chrome-devtools.automation :as a :refer [automation?]]
            [clj-chrome-devtools.impl.connection :refer [connect connection? make-ws-client]]
            [clojure.java.io :refer [file]]
            [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [blank? ends-with? includes? join starts-with?]]
            [cognitect.anomalies :as anom]
            [fc4.image-utils :refer [png-data-uri->bytes]]
            [fc4.integrations.structurizr.express.renderer.png :as png]
            [fc4.integrations.structurizr.express.renderer.svg :as svg]
            [fc4.integrations.structurizr.express.spec] ;; for side effects
            [fc4.io.util :refer [debug? debug]]
            [fc4.rendering :as r :refer [Renderer]]
            [fc4.util :refer [fault with-timeout]]
            [fc4.yaml :as yaml]
            ; This project doesn’t use Timbre, but clj-chrome-devtools does and we need to config it
            [taoensso.timbre :as devtools-logger]))

;; Some of the functions include some type hints or type casts. These are to prevent reflection, but
;; not for the usual reason of improving performance. In this case, some of the reflection leads to
;; classes that violate some kind of boundary introduced in Java 9/10/11 and yield an ominous
;; message printed to stdout (or maybe stderr).

;; Configure Jetty logging so that log messages are not output to stderr, distracting the CLI UX.
;; (clj-chrome-devtools uses Jetty’s WebSocket client, via gniazdo, to communicate with Chromium.)
;; I found this approach here: https://github.com/stalefruits/gniazdo/issues/28#issuecomment-375295195
(System/setProperty "org.eclipse.jetty.util.log.announce" "false")
(System/setProperty "org.eclipse.jetty.util.log.class" "org.eclipse.jetty.util.log.StdErrLog")
; Valid levels: ALL, DEBUG, INFO, WARN, OFF
; You’d think we’d want to use INFO or WARN by default, but sadly even those levels *always* output
; some stuff — stuff that I don’t want end-users to have to see. So here we are.
(System/setProperty "org.eclipse.jetty.LEVEL" (if @debug? "ALL" "OFF"))

; clj-chrome-devtools logs :info records as a matter of course when WebSocket connections connect,
; close, etc. We don’t want our users to see them.
(devtools-logger/set-level! (if @debug? :debug :warn))

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
                  "/usr/sbin/chromium" ; Arch
                  "/usr/bin/chromium-browser" ; Alpine
                  "/usr/bin/google-chrome"]) ; Debian
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

     ; Needed when running as root, which happens sometimes. And when not running as root, this is
     ; also OK for our purposes.
     "--no-sandbox"

     ;; We used to include --disable-dev-shm-usage as recommended here:
     ;; https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips but when
     ;; we switched our CI jobs from a custom Debian Docker image to an image maintained by CircleCI
     ;; (with Chrome rather than Chromium, and a newer version of Chrome, and maybe even a different
     ;; version of Debian, I don’t know) the browser started crashing on launch. I then determined
     ;; that the crash did not occur when I removed --disable-dev-shm-usage. When I do so the tests
     ;; all still seem to pass, including the CI test of the distribution package, so it *seems* as
     ;; though we can do without this flag. (Interestingly, the crash did _not_ occur when running
     ;; the tests via the source code, rather only when testing the distribution packages. I don’t
     ;; have a clue as to why.)
     ]))

(defn- start-browser
  [opts]
  (let [co (chromium-opts opts)]
    (debug "Starting browser with options:" co)
    (.exec (Runtime/getRuntime) ^"[Ljava.lang.String;" (into-array co))))

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
  (debug "Loading Structurizr Express from" url)
  (let [page (a/to automation url)]
    (if (includes? (:document-url page) "chrome-error")
      (fault "Could not load Structurizr Express (unknown error; possible connectivity problem)")
      (when-not (a/visible automation (a/sel1 automation "svg"))
        (fault "Could not load Structurizr Express (svg node not found)")))))

(s/fdef load-structurizr-express
  :args (s/cat :automation ::automation
               :url string?)
  :ret  (s/or :success nil?
              :failure ::anom/anomaly))

(defn- set-yaml-and-update-diagram
  [automation yaml]
  (debug "Setting YAML and updating diagram...")
  ;; I’m not 100% sure but I suspect it’s important to call hasErrorMessages() after
  ;; renderExpressDefinition so that the JS runtime finishes the execution of
  ;; renderExpressDefinition before this (clj) function returns. Before I added the hasErrorMessages
  ;; call, I was getting errors when subsequently calling exportCurrentDiagramToPNG, and I think
  ;; they were due to the YAML not actually being fully “set” yet. Honestly I’m not entirely sure.
  (a/evaluate automation (str "const diagramYaml = `" yaml "`;\n"
                              "structurizr.scripting.renderExpressDefinition(diagramYaml);"))
  (when-let [errs (seq (a/evaluate automation "structurizrExpress.getErrorMessages();"))]
    (fault (str "Error occurred while rendering; errors were found in the diagram definition: "
                (join "; " (map :message errs))))))

(s/fdef set-yaml-and-update-diagram
  :args (s/cat :automation ::automation
               :diagram-yaml ::prepped-yaml)
  :ret  (s/or :success nil?
              :failure ::anom/anomaly))

(defn- extract-diagram-png
  "Returns a PNG image of the current diagram. set-yaml-and-update-diagram must have already been
  called."
  [automation]
  (debug "Extracting diagram as PNG...")
  (let [main (png-data-uri->bytes
              (a/evaluate automation "structurizr.scripting.exportCurrentDiagramToPNG();"))
        key  (png-data-uri->bytes
              (a/evaluate automation "structurizr.scripting.exportCurrentDiagramKeyToPNG();"))]
    #:fc4.rendering.png{:main main
                        :key key
                        :conjoined (png/conjoin main key)}))

(defn- extract-diagram-svg
  "Returns an SVG image of the current diagram. set-yaml-and-update-diagram must have already been
  called."
  [automation]
  (debug "Extracting diagram as SVG...")
  (let [main (svg/cleanup (a/evaluate automation "structurizr.scripting.exportCurrentDiagramToSVG();"))
        key (svg/cleanup (a/evaluate automation "structurizr.scripting.exportCurrentDiagramKeyToSVG();"))]
    #:fc4.rendering.svg{:main main
                        :key key
                        :conjoined (svg/conjoin main key)}))

(defn- do-render
  "Renders a Structurizr Express diagram as PNG and/or SVG images. Not entirely pure; communicates
  with a child process to perform the rendering."
  [diagram-yaml automation {:keys [structurizr-express-url timeout-ms output-formats] :as opts}]
  {:pre [(not (ends-with? diagram-yaml ".yaml"))
         (not (ends-with? diagram-yaml ".yml"))
         (seq output-formats)]}
  (debug "Rendering with options:" opts)
  (try
    (with-timeout timeout-ms
      (or (load-structurizr-express automation structurizr-express-url)
          (set-yaml-and-update-diagram automation (prep-yaml diagram-yaml))
          {::r/images (merge {}
                             (when (contains? output-formats :png)
                               {::r/png (extract-diagram-png automation)})
                             (when (contains? output-formats :svg)
                               {::r/svg (extract-diagram-svg automation)}))}))
    (catch Exception e
      (fault (str e)))))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative/property testing, mainly because rendering
; is currently quite slow (~1–3s on my system) and it performs network I/O.
(s/fdef do-render
  :args (s/cat :diagram :structurizr/diagram-yaml-str
               :automation ::automation
               :opts ::opts)
  :ret  (s/or :success ::r/success-result
              :failure ::r/failure-result))

(defn- do-close
  [browser conn]
  ; TODO: log something, in both catch forms, once we choose a logging library/approach
  (try (.close conn) (catch Exception _))
  (try (.destroy browser) (catch Exception _)))

(defrecord StructurizrExpressRenderer [browser conn automation opts]
  Renderer
  (render [renderer diagram-yaml] (do-render diagram-yaml automation opts))
  (render [renderer diagram-yaml options] (do-render diagram-yaml automation (merge opts options)))

  java.io.Closeable
  (close [renderer] (do-close browser conn)))

(def default-opts
  {:structurizr-express-url "https://structurizr.com/express"
   :timeout-ms 30000
   :headless true
   :debug-port 9222
   :debug-conn-timeout-ms 30000
   :output-formats #{:png}})

(def ws-client-opts
  "Options for make-ws-client."
  {; The default of 1MB is too low.
   :max-msg-size-mb (* 1024 1024 10)})

(defn make-renderer
  "Creates a StructurizrExpressRenderer. It’s VERY important to call .close on the StructurizrExpressRenderer at some
  point — best way to ensure that is to call this function using with-open."
  ([]
   (make-renderer {}))
  ([opts]
   (let [{:keys [debug-port
                 debug-conn-timeout-ms]
          :as full-opts} (merge default-opts opts)
         _ (debug "Creating renderer with options:" full-opts)
         browser (start-browser full-opts)
         conn (connect "localhost" debug-port debug-conn-timeout-ms (make-ws-client ws-client-opts))
         automation (a/create-automation conn)]
     (->StructurizrExpressRenderer browser conn automation full-opts))))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative/property testing, mainly because rendering
; is currently quite slow (~1–3s on my system) and it performs network I/O.
(s/fdef make-renderer
  :args (s/? ::opts)
  :ret  (s/and #(instance? StructurizrExpressRenderer %)
               (s/keys :req-un [::browser ::conn ::automation])))

(comment
  (require :reload
           '[fc4.rendering :as r :refer [render]]
           '[fc4.integrations.structurizr.express.renderer.png]
           '[fc4.integrations.structurizr.express.renderer.svg]
           '[fc4.integrations.structurizr.express.renderer :refer [make-renderer]])
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
    (time (render @renderer it {:output-formats #{:svg :png}}))
    (do
      (if-let [image (get-in it [:fc4.rendering/images :fc4.rendering/svg :fc4.rendering.svg/conjoined])]
        (spit "/tmp/diagram.svg" image)
        (println (or (::anom/message it) it)))
      (when-let [image (get-in it [:fc4.rendering/images :fc4.rendering/png :fc4.rendering.png/conjoined])]
        (binary-spit "/tmp/diagram.png" image))))

  (time (render @renderer ""))

  (.close @renderer)
  (reset! renderer (make-renderer)))
