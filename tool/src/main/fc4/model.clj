(ns fc4.model
  (:require [clj-yaml.core :as yaml]
            [clojure.set :refer [union]]
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [includes? split]]
            [fc4.dsl :as dsl]
            [fc4.files :refer [relativize]]
            [fc4.spec :as fs]
            [fc4.util :as fu :refer [qualify-keys]]))

;; TODO: now that _this_ file, model.clj, is basically empty, let’s just move
; the contents of model_specs.clj over into this file.
(load "model_specs")

(defn empty-model
  []
  {::systems {} ::users {} ::datastores {}})
