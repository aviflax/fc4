(ns fc4.integrations.structurizr.express.node-renderer
  (:require [clojure.java.io      :as io        :refer [file]]
            [clojure.java.shell   :as shell     :refer [sh]]
            [clojure.spec.alpha   :as s]
            [clojure.string       :as str       :refer [ends-with? includes? split trim]]
            [cognitect.anomalies  :as anom]
            [fc4.rendering        :as rendering :refer [Renderer]]
            [fc4.util             :as fu        :refer [namespaces]]))

(namespaces '[structurizr :as st])

(defn- jar-dir
  "Utility function to get the path to the dir in which the jar in which this
  function is invoked is located.
  Adapted from https://stackoverflow.com/a/13276993/7012"
  []
  ;; The .toURI step is vital to avoid problems with special characters,
  ;; including spaces and pluses.
  ;; Source: https://stackoverflow.com/q/320542/7012#comment18478290_320595
  (-> (class *ns*)
      .getProtectionDomain .getCodeSource .getLocation .toURI .getPath
      file .toPath .getParent .toFile))

(defn- renderer-command
  []
  (let [possible-paths [; This first one must be first so it’s preferred to an
                        ; “installed” executable when running tests from source
                        "renderer/render.js"
                        ; Used when the tool is packaged in a jar
                        (str (file (jar-dir) "fc4-render"))
                        "render"
                        "target/pkg/renderer/render-mac"
                        "target/pkg/renderer/render-macos"
                        "target/pkg/renderer/render-linux"]
        hopefully-on-path "fc4-render"]
    (or (some #(if (.canExecute (file %)) %)
              possible-paths)
        hopefully-on-path)))

(defn- get-fenced
  "If fence is found, returns the fenced string; if not, throws."
  [s sep]
  (or (some-> (split s (re-pattern sep) 3)
              (second)
              (trim))
      (throw (Exception. (str "Error finding fenced segments in error output: "
                              s)))))

(defn- render-with-node
  "Renders a Structurizr Express diagram as a PNG file, returning a PNG
  bytearray on success. Not entirely pure; spawns a child process to perform the rendering.
  FWIW, that process is stateless and ephemeral."
  [diagram-yaml]
  ;; Protect developers from themselves
  {:pre [(not (ends-with? diagram-yaml ".yaml"))
         (not (ends-with? diagram-yaml ".yml"))]}
  ;; TODO: some way to pass options to the renderer (--debug, --quiet, --verbose)
  ;; TODO: use ProcessBuilder (or some Clojure wrapper for such) rather than sh
  ;; so we can stream output from stderr to stderr so we can display progress as
  ;; it happens, so the user knows that something is actually happening!
  (let [command (renderer-command)
        result (sh command
                   :in diagram-yaml
                   :out-enc :bytes)
        {:keys [exit out err]} result]
    (if (zero? exit)
      {::rendering/png-bytes out}
      {::anom/category    ::anom/fault
       ::anom/message     (get-fenced err "🚨🚨🚨")
       ::rendering/stderr err})))

; This spec is here mainly for documentation and instrumentation. I don’t
; recommend using it for generative testing, mainly because rendering is
; currently quite slow (~2s on my system).
(s/fdef render-with-node
  :args (s/cat :diagram ::st/diagram-yaml-str)
  :ret  (s/or :success ::rendering/success-result
              :failure ::rendering/failure-result))

(defrecord NodeRenderer []
  Renderer
  (render [renderer diagram-yaml] (render-with-node diagram-yaml))

  java.io.Closeable
  (close [renderer] nil))

(comment
  (require :reload
           '[fc4.rendering :as rendering :refer [render]]
           '[fc4.integrations.structurizr.express.node-renderer :refer [->NodeRenderer]]
           '[fc4.io.util :refer [binary-spit]])
  (def test-data-dir "test/data/structurizr/express/")
  (def filenames
    {:valid     "diagram_valid_formatted_snapped.yaml"
     :invalid_a "se_diagram_invalid_a.yaml"
     :invalid_b "se_diagram_invalid_b.yaml"
     :invalid_c "se_diagram_invalid_c.yaml"})

  (as-> :valid it
    (str test-data-dir (get filenames it))
    (slurp it)
    (render (->NodeRenderer) it)
    (or (::rendering/png-bytes it)
        (::anom/message it)
        "WTF")
    (binary-spit "/tmp/diagram.png" it)))
