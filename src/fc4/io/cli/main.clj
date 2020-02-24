(ns fc4.io.cli.main
  "The CLI command that is the primary interface of the tool."
  (:gen-class)
  (:require [clojure.pprint :refer [pprint]]
            [clojure.set :refer [intersection]]
            [clojure.string :as str :refer [join lower-case]]
            [clojure.tools.cli :refer [parse-opts]]
            [cognitect.anomalies :as anom]
            [fc4.integrations.structurizr.express.renderer :as ser]
            [fc4.io.cli.old-world :as old-world]
            [fc4.io.cli.util :as cu :refer [exit fail]]
            [fc4.io.dsl :refer [read-model]]
            [fc4.io.util :as iu :refer [debug?]]
            [fc4.util :refer [anom?]])
  (:import [java.nio.charset Charset]))

(def general-options-spec
  [["-h" "--help" "Prints the synopsis and a list of the most commonly used commands and exits. Other options are ignored."]
   [nil  "--debug" "For use by developers working on fc4 (the tool)."]])

(def new-world-options-spec
  "For features that relate to our new DSL."
  [; It might be helpful to add a default path for --model at some point, such as ./model, but I’m
   ; holding off on that now for various reasons, one of which is that that would make it harder to
   ; detect the mixing of old-world and new-world options.
   ["-m" "--model PATH" "The path to the directory containing the model."]
   ; Not using -v for --validate right now because we might want to use -v as a shorthand for
   ; --view or --views once we introduce support for rendering and validating views.
   [nil "--validate"   "Validate the model. The model path must be supplied via -m/--model"]])

(def options-spec
  (concat general-options-spec
          old-world/options-spec
          new-world-options-spec))

(def old-vs-new-options
  "Used to detect the mixing of old-world and new-world options (an error condition)."
  {:old #{:format :snap :render :output-formats :watch}
   :new #{:model :validate}})

(defn- old-world?
  [opt-keys]
  (boolean (seq (intersection opt-keys (:old old-vs-new-options)))))

(defn- new-world?
  [opt-keys]
  (boolean (seq (intersection opt-keys (:new old-vs-new-options)))))

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
  [{:keys [arguments summary errors options]
    {:keys [help model validate]} :options
    :as parsed-opts}]
  (let [; Normalize the first arg so we can check whether it’s a legacy subcommand.
        first-arg (some-> arguments first lower-case)
        opt-keys (set (keys options))
        old-world (old-world? opt-keys)
        new-world (new-world? opt-keys)]
    (cond help
          (exit 0 (usage-message summary))

          errors
          (fail (usage-message summary "Errors:\n  " (join "\n  " errors)))

          (and old-world new-world)
          (fail "NB: -v/--validate and -m/--model may not be used with any other feature options")

          (and new-world (or (not model) (not validate)))
          (fail (usage-message summary "NB: --validate requires -m/--model and vice-versa"))

          (contains? old-world/legacy-subcommand->new-equivalent first-arg)
          (fail (clojure.core/format old-world/legacy-message
                                     first-arg
                                     (old-world/legacy-subcommand->new-equivalent first-arg)))

          (empty? options)
          (fail (usage-message summary))

          (and (not old-world) (not new-world))
          (fail (usage-message summary) "NB: You must specify a major feature option.")

          old-world
          (old-world/check-opts parsed-opts (fn [msg] (fail (usage-message summary) msg))))))

(defn -main
  [& args]
  (let [{{:keys [debug render] :as opts} :options :as parsed} (parse-opts args options-spec)
        opt-keys (set (keys opts))]
    (when debug
      (reset! debug? true)
      (println "*DEBUG*\nParsed Command Line:")
      (pprint parsed))
    ;; These two check- fns will exit or throw (depending on debug mode) if they find issues.
    (check-charset)
    (check-opts parsed)
    (cond
      (old-world? opt-keys) (if render
                              (with-open [renderer (ser/make-renderer)]
                                (old-world/start renderer parsed))
                              (old-world/start nil parsed))

      (new-world? opt-keys)
      ;; If we made it here, it’s time to validate the model -- that’s the only new-world feature at
      ;; this moment.
      (let [result (read-model (:model opts))]
        (if (anom? result)
          (fail (::anom/message result) result)
          (iu/debug "Valid!")))

      :else (throw (ex-info "Options not recognized" {:parsed-opts parsed}))))
  ;; Often, when the main method invoked via the `java` command at the command-line exits,
  ;; the JVM exits as well. That’s not the case here, though, so we call exit to shut down the
  ;; JVM (and the tool with it).
  ;;
  ;; There’s one known reason we need to call exit:
  ;;  1. The pure Clojure Chromium renderer uses the library clj-chrome-devtools and that
  ;;     seems to have a bug wherein a non-daemon scheduler thread started by the library
  ;;     http-kit via the class HttpClient is stuck in WAITING (parking).
  (exit 0))
