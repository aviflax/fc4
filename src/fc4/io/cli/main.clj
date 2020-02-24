(ns fc4.io.cli.main
  "The CLI command that is the primary interface of the tool."
  (:gen-class)
  (:require [clj-yaml.core :refer [parse-string]]
            [clojure.pprint :refer [pprint]]
            [clojure.set :refer [subset?]]
            [clojure.string :as str :refer [join lower-case split trim]]
            [clojure.tools.cli :refer [parse-opts]]
            [fc4.io.cli.util :as cu :refer [beep exit fail]]
            [fc4.io.render :refer [render-diagram-file]]
            [fc4.io.util :refer [debug debug? print-now read-text-file]]
            [fc4.io.watch :as watch]
            [fc4.io.yaml :refer [validate]]
            [fc4.integrations.structurizr.express.renderer :as ser]
            [fc4.integrations.structurizr.express.format :refer [reformat]]
            [fc4.integrations.structurizr.express.snap :refer [snap-to-grid]]
            [fc4.integrations.structurizr.express.yaml :as sy :refer [stringify]]
            [fc4.yaml :as fy :refer [assemble split-file]])
  (:import [java.nio.charset Charset]))

(def options-spec
  [["-f" "--format" (str "Rewrites diagram YAML files, reformatting the YAML to improve readability"
                         " and diffability.")]
   ["-s" "--snap" "Rewrites diagram YAML files, snapping elements to a grid and aligning elements."]
   ["-r" "--render"
    (str "Creates image files that contain the visualization of each diagram as specified in the"
         " YAML files. The format(s) can be specified via -o/--output-formats.")]
   ["-o" "--output-formats FORMAT"
    (str "Specifies the output format(s) for rendering diagrams. Allowed only when -r/--render is"
         " specified. Value is a character-delimited list of output formats. Supported formats are"
         " 'png' and 'svg'; supported delimiters are '+' (plus sign) and ',' (comma). If not"
         " specified, the default is 'png'.")
    :parse-fn #(->> (split % #"[\+,]")
                    (map (comp keyword lower-case trim))
                    (set))
    :validate [#(subset? % #{:png :svg}) "Supported formats are 'png' and 'svg'."]]
   ["-w" "--watch" (str "Watches the diagrams in/under the specified paths and processes them (as"
                        " per the options above) when they change.")]
   ["-h" "--help" "Prints the synopsis and a list of the most commonly used commands and exits. Other options are ignored."]
   [nil  "--debug" "For use by developers working on fc4 (the tool)."]])


(defn- usage-message [summary & specific-messages]
  (str "Usage: fc4 OPTIONS PATH [PATH...]\n\nOptions:\n"
       summary
       (when specific-messages
         (str "\n\n"
              (join " " specific-messages)))
       "\n\n"
       "Full documentation is at https://fundingcircle.github.io/fc4-framework/"))

(defn- check-charset
  []
  (let [default-charset (str (Charset/defaultCharset))]
    (when (not= default-charset "UTF-8")
      (fail "JVM default charset is" default-charset "but must be UTF-8."))))

(defn- check-opts
  "Checks the command-line arguments and options for correctness and calls either exit or fail if
  any problems are found OR if -h/--help was specified.

  NB: exit and fail usually call System/exit but their normal behaviors can be overridden by
  changing the contents of the atoms in exit-on-exit? and exit-on-fail?"
  [{:keys [arguments summary errors]
    {:keys [format snap render help output-formats]} :options}]
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

          (and output-formats (not render))
          (fail (usage-message (str "-o/--output-formats is allowed only when -r/--render is"
                                    " specified")))

          (empty? arguments)
          (fail (usage-message summary "NB: At least one path MUST be specified")))))

(defn -main
  [& args]
  (let [{{:keys [debug render]} :options :as opts} (parse-opts args options-spec)]
    (when debug
      (reset! debug? true)
      (println "*DEBUG*\nParsed Command Line:")
      (pprint opts))
    ;; These two check- fns will exit or throw (depending on debug mode) if they find issues.
    (check-charset)
    (check-opts opts)
    (if render
      (with-open [renderer (ser/make-renderer)]
        (start renderer opts))
      (start nil opts)))
  ;; Often, when the main method invoked via the `java` command at the command-line exits,
  ;; the JVM exits as well. That’s not the case here, though, so we call exit to shut down the
  ;; JVM (and the tool with it).
  ;;
  ;; There’s one known reason we need to call exit:
  ;;  1. The pure Clojure Chromium renderer uses the library clj-chrome-devtools and that
  ;;     seems to have a bug wherein a non-daemon scheduler thread started by the library
  ;;     http-kit via the class HttpClient is stuck in WAITING (parking).
  (exit 0))
