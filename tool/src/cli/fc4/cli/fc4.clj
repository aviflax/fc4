(ns fc4.cli.fc4
  "Main CLI command that invokes subcommands."
  (:gen-class)
  (:require
   [clojure.string   :as str     :refer [join]]
   [fc4.cli.edit     :as edit]
   [fc4.cli.export   :as export]
   [fc4.cli.format   :as format]
   [fc4.cli.render   :as render]
   [fc4.cli.util     :as cu      :refer [exit fail]])
  (:import [java.nio.charset Charset]))

(def subcommands
  {:edit    edit/-main
   :export  export/-main
   :format  format/-main
   :render  render/-main})

(defn invalid-subcommand-message
  [subcommand]
  (str subcommand
       " is not a valid subcommand.\nValid subcommands are: "
       (join ", " (map name (keys subcommands)))))

(defn check-charset
  []
  (let [default-charset (str (Charset/defaultCharset))]
    (when (not= default-charset "UTF-8")
      (fail "JVM default charset is" default-charset "but must be UTF-8."))))

(defn -main
  ;; NB: if and when we add “universal” options — options that apply to all
  ;; subcommands — then we’ll probably want to use tools.cli/parse-opts to parse
  ;; them. It includes functionality for parsing in cases such as these wherein
  ;; a program is “divided” into subcommands. See
  ;;   https://github.com/clojure/tools.cli#in-order-processing-for-subcommands
  ;;
  ;; TODO: Actually, now that I think about it, we should probably add a --help
  ;; universal option ASAP.
  [subcommand & rest-args]
  (check-charset)
  (if-let [f (get subcommands (keyword subcommand))]
    (do (apply f rest-args)
        ;; I’m not sure why, but without this the render subcommand would delay
        ;; the exit of the main command by about a minute. TODO: debug.
        (exit 0))
    (fail (invalid-subcommand-message subcommand))))
