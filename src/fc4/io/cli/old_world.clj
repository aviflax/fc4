(ns fc4.io.cli.old-world
  (:require [clj-yaml.core :refer [parse-string]]
            [clojure.set :refer [subset?]]
            [clojure.string :as str :refer [lower-case split trim]]
            [fc4.integrations.structurizr.express.format :refer [reformat]]
            [fc4.integrations.structurizr.express.snap :refer [snap-to-grid]]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.io.cli.util :as cu :refer [beep]]
            [fc4.io.render :refer [render-diagram-file]]
            [fc4.io.util :refer [debug print-now read-text-file]]
            [fc4.io.watch :as watch]
            [fc4.io.yaml :refer [validate]]
            [fc4.yaml :as fy :refer [assemble split-file]]))

(def legacy-subcommand->new-equivalent
  ; This is missing `export` but I’m 99.9% sure that no one was using that. I certainly wasn’t.
  {"edit"   "fc4 -fsrw"
   "format" "fc4 -f"
   "render" "fc4 -r"})

(def legacy-message
  (str "The subcommand `%s` is no longer supported. Equivalent behavior can be invoked via:\n"
       "  %s PATH [PATH...]\n"
       "For more information please run `fc4 --help` and/or see https://git.io/fjVkL"))

(defn check-opts
  "Checks the command-line args and opts for correctness and calls fail if any problems are found."
  [{:keys [arguments]
    {:keys [format snap render output-formats]} :options
    :as _parsed-args}
   fail]
  (cond (not (or format snap render))
        (fail "NB: At least one of -f, -s, or -r (or their full equivalents) MUST be specified")

        (and output-formats (not render))
        (fail "NB: -o/--output-formats is allowed only when -r/--render is specified")

        (empty? arguments)
        (fail "NB: At least one path MUST be specified")))

(def defaults
  ;; TODO: make to-closest configurable via CLI options. I’ve found cases wherein a coarser-grained
  ;;       grid would be very helpful.
  {:snap {:to-closest 100
          :min-margin 50}})

(defn- with-msg [verb f & args]
  (print-now " " verb "...")
  (let [result (apply f args)]
    (print-now "✅")
    result))

(defn- process-file
  [file-path renderer {:keys [format snap render watch] :as options}]
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
          (-> (parse-string main)
              (cond->>
               format (with-msg "formatting" reformat)
               snap   (with-msg "snapping" #(snap-to-grid % to-closest min-margin)))
              (->> (stringify)
                   (assemble front)
                   (spit file-path))))))

    (when render
      (debug "calling render-diagram-file for" file-path "with options" options)
      (with-msg "rendering" render-diagram-file file-path renderer options))

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

(defn start
  [renderer {paths                       :arguments
             {:keys [watch] :as options} :options}]
  (let [f #(process-file % renderer options)]
    (if watch
      (block (watch/start f paths))
      (run! f paths))))
