(ns fc4.cli.wcb
  "wcb = Watch ClipBoard"
  (:require [fc4.integrations.structurizr.express.clipboard :refer [wcb]]
            [clojure.core.async :as ca :refer [<!!]])
  ;; Required for compilation to a “native image” executable via GraalVM.
  (:gen-class))


(defn -main []
  (let [c (wcb)]
    (println (str "Now watching clipboard for Structurizr Express diagrams in "
                  "YAML format. Hit ctrl-c to exit."))

    ;; Block until wcb’s return channel emits something. Which it won’t, so
    ;; effectively block forever, or until the user hits ctrl-c, whichever
    ;; happens first.
    (<!! c)))
