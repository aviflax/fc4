(ns fc4.io.cli.main
  "The CLI command that is the primary interface of the tool."
  (:gen-class)
  (:require [clj-yaml.core :refer [parse-string]]
            [clojure.pprint :refer [pprint]]
            [clojure.string :as str :refer [join lower-case]]
            [clojure.tools.cli :refer [parse-opts]]
            [fc4.io.cli.util :as cu :refer [beep exit fail]]
            [fc4.io.render :refer [render-diagram-file]]
            [fc4.io.util :refer [debug? print-now read-text-file]]
            [fc4.io.watch :as watch]
            [fc4.io.yaml :refer [validate]]
            [fc4.integrations.structurizr.express.format :refer [reformat]]
            [fc4.integrations.structurizr.express.snap :refer [snap-to-grid]]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.yaml :as fy :refer [assemble split-file]])
  (:import [java.nio.charset Charset]))

(def options-spec
  [["-f" "--format" (str "Rewrites diagram YAML files, reformatting the YAML to improve readability"
                         " and diffability.")]
   ["-s" "--snap" "Rewrites diagram YAML files, snapping elements to a grid and aligning elements."]
   ["-r" "--render" (str "Creates PNG image files that contain the visualization of each diagram as"
                         " specified in the YAML files.")]
   ["-w" "--watch" (str "Watches the diagrams in/under the specified paths and processes them (as"
                        " per the options above) when they change.")]
   ["-h" "--help" "Prints the synopsis and a list of the most commonly used commands and exits. Other options are ignored."]
   [nil  "--debug" "For use by developers working on fc4 (the tool)."]])

(def legacy-subcommand->new-equivalent
  ; This is missing `export` but I’m 99.9% sure that no one was using that. I certainly wasn’t.
  {"edit"   "fc4 -fsrw"
   "format" "fc4 -f"
   "render" "fc4 -r"})

(def defaults
  {:snap {:to-closest 100
          :min-margin 50}})

(defn- usage-message [summary & specific-messages]
  (str "Usage: fc4 OPTIONS PATH [PATH...]\n\nOptions:\n"
       summary
       (when specific-messages
         (str "\n\n"
              (join " " specific-messages)))
       "\n\n"
       "Full documentation is at https://fundingcircle.github.io/fc4-framework/tool/"))

(defn- check-charset
  []
  (let [default-charset (str (Charset/defaultCharset))]
    (when (not= default-charset "UTF-8")
      (fail "JVM default charset is" default-charset "but must be UTF-8."))))

(def legacy-message
  (str "The subcommand `%s` is no longer supported. Equivalent behavior can be invoked via:\n"
       "  %s PATH [PATH...]\n"
       "For more information please run `fc4 --help` and/or see https://git.io/fjVkL"))

(defn- check-opts
  "Checks the command-lines arguments and options for correctness and calls either exit or fail if
  any problems are found OR if -h/--help was specified.

  NB: exit and fail usually call System/exit but their normal behaviors can be overridden by
  changing the contents of the atoms in exit-on-exit? and exit-on-fail?"
  [{:keys [arguments summary errors]
    {:keys [format snap render help]} :options}]
  (let [; Normalize the first arg so we can check whether it’s a legacy subcommand.
        first-arg (some-> arguments first lower-case)]
    (cond help
          (exit 0 (usage-message summary))

          errors
          (fail (usage-message summary "Errors:\n  " (join "\n  " errors)))

          (contains? legacy-subcommand->new-equivalent first-arg)
          (fail (clojure.core/format legacy-message
                                     first-arg
                                     (legacy-subcommand->new-equivalent first-arg)))

          (not (or format snap render))
          (fail (usage-message summary (str "NB: At least one of -f, -s, or -r (or their"
                                            " full-length equivalents) MUST be specified")))

          (empty? arguments)
          (fail (usage-message summary "NB: At least one path MUST be specified")))))

(defmacro ^:private with-msg
  [verb body]
  `(do (print-now " " ~verb "...")
       (let [result# ~body]
         (print-now "✅")
         result#)))

(defn- process-file
  [file-path {:keys [format snap render watch] :as options}]
  ;; Optimization opportunity: this is a little inefficient in that if rendering is specified along
  ;; with formatting and/or snapping then we’re reading the YAML file twice. So we should probably
  ;; refactor render-diagram-file to accept diagram-yaml rather than a file-path. (It accepts a
  ;; file-path for historical reasons, so that the old edit workflow could call it directly. Since
  ;; we’ve removed the old edit workflow, we can change it.) (Avi Flax, July 2019)
  (try
    (print-now "reading+parsing+validating...")
    (let [yaml-file-contents (read-text-file file-path)]
      ;; Optimization opportunity: the YAML is parsed by both validate and below if format and/or
      ;; snap are true. (Avi Flax, July 2019)
      (validate yaml-file-contents file-path) ; throws if invalid
      (print-now "✅")

      (when (or format snap)
        (let [{:keys [::fy/front ::fy/main]} (split-file yaml-file-contents)
              {:keys [to-closest min-margin]} (:snap defaults)]
          (as-> main it
            (parse-string it)
            (if format (with-msg "formatting" (reformat it)) it)
            (if snap (with-msg "snapping" (snap-to-grid it to-closest min-margin)) it)
            (stringify it)
            (assemble front it)
            (spit file-path it)))))

    (when render
      (with-msg "rendering" (render-diagram-file file-path)))

    (catch Exception e
      (when watch (beep)) ; good chance the user’s terminal is in the background
      (print-now "🚨" (or (.getMessage e) e)))

    (finally
      (print-now "\n")))
  nil)

; It can be useful for development and debugging (generally via the REPL) to have block sometimes
; do nothing and just return the watch, rather than actually block.
(defonce block-on-block? (atom true))

(defn- block
  [watch]
  (if @block-on-block?
    (.join (:thread watch))
    watch))

(defn- start
  [{paths :arguments
    {:keys [watch] :as options} :options}]
  (let [f #(process-file % options)]
    (if watch
      (block (watch/start f paths))
      (run! f paths))))

(defn -main
  [& args]
  (let [{:keys [options] :as opts} (parse-opts args options-spec)]
    (when (:debug options)
      (reset! debug? true)
      (println "*DEBUG*\nParsed Command Line:")
      (pprint opts))
    ;; These two check- fns will exit or throw (depending on debug mode) if they find issues.
    (check-charset)
    (check-opts opts)
    (start opts)))
