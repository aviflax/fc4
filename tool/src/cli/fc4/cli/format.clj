(ns fc4.cli.format
  "CLI subcommand that reformats each Structurizr Express YAML file specified in command-line args."
  (:require [fc4.cli.util :as cu :refer [debug fail]]
            [fc4.integrations.structurizr.express.format :as f :refer [reformat-file]]
            [fc4.io.util :refer [print-now]]))

(defn -main
  ;; NB: if and when we add options we’ll probably want to use
  ;; tools.cli/parse-opts to parse them.
  ;;
  ;; TODO: Actually, now that I think about it, we should probably add a --help
  ;; option ASAP.
  ;;
  ;; TODO: add a command-line flag that sets cu/*debug* to true
  [& paths]
  (try
    (doseq [path paths]
      (print-now path ": formatting...")
      (-> (slurp path)
          (reformat-file)
          (spit path))
      (println "✅"))
    (catch Exception e
      ; TODO: maybe use cu/debug print out stack trace and ex-data if present?
      (fail (.getMessage e)))))
