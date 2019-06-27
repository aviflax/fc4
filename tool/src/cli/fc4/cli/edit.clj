(ns fc4.cli.edit
  "CLI subcommand that watches Structurizr Express diagram files; when changes
  are observed to a YAML file, the YAML in the file is cleaned up and rendered
  to an image file."
  (:require [fc4.cli.util :refer [fail]]
            [fc4.io.edit :refer [process-file]]
            [fc4.io.watch :refer [start]]))

(defn block
  [{:keys [thread] :as _hawk-watch}]
  (.join thread))

(defn -main
  ;; NB: if and when we add options we’ll probably want to use
  ;; tools.cli/parse-opts to parse them.
  ;;
  ;; TODO: Actually, now that I think about it, we should probably add a --help
  ;; option ASAP.
  [& paths]
  (when (empty? paths)
    (fail "usage: fc4 edit [path ...]"))
  (block (start process-file paths)))
