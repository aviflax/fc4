(ns fc4.model
  (:require [clj-yaml.core :as yaml]
            [clojure.set :refer [union]]
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [includes? split]]
            [fc4.dsl :as dsl]
            [fc4.files :refer [relativize]]
            [fc4.spec :as fs]
            [fc4.util :as fu]))

(load "model_specs")

(defn- to-set-of-keywords
  [xs]
  (set (map keyword xs)))

(s/fdef to-set-of-keywords
  :args (s/cat :xs (s/coll-of string?))
  :ret  (s/coll-of keyword? :kind set?)
  :fn (fn [{{:keys [xs]} :args, ret :ret}]
        (= (count (distinct xs)) (count ret))))

;; An element just after it’s parsed from the YAML, before any fixup.
;; TODO: this file uses a mix of “element” and “entity” to refer to pretty much
;; the same thing. Choose one and stick with it!
(s/def ::proto-entity
  (s/with-gen
    (s/map-of ::fs/unqualified-keyword (s/or :name    ::name
                                             :strings ::simple-strings))
    #(gen/hash-map :name  (s/gen ::name)
                   :repos (s/gen ::simple-strings)
                   :tags  (s/gen ::simple-strings))))

; We have to capture this at compile time in order for it to have the value we
; want it to; if we referred to *ns* in the body of a function then, because it
; is dynamically bound, it would return the namespace at the top of the stack,
; the “currently active namespace” rather than what we want, which is the
; namespace of this file, because that’s the namespace all our keywords are
; qualified with.
(def ^:private this-ns-name (str *ns*))

(defn- fixup-container
  [container sys-name]
  (-> container
      (update :repos to-set-of-keywords)
      (update :tags to-set-of-keywords)
      ;; Container references in the YAML files don’t have to specify the target
      ;; system; if ommitted then the target system is implicitly the same
      ;; system; the container in that case is targeting a sibling container.
      ;; (This is optional in the YAML files to make the files easier to read
      ;; and write (by humans, manually).) In our in-memory data structure,
      ;; however, the target system must be specified, for uniformity. So we
      ;; just add it in right here.
      (update :uses (fn [refs]
                      (map #(if (:system %) % (assoc % :system sys-name))
                           refs)))
      (update :uses set)
      (fu/qualify-keys this-ns-name)))

(s/fdef fixup-container
  :args (s/cat :container ::proto-entity
               :sys-name  ::name)
  :ret  ::container-map
  :fn   (fn [{{in :container} :args, out :ret}]
          (= (count (::uses in)) (count (::uses out)))))

(defn- fixup-element
  [entity-type tags-from-path {:keys [name] :as elem}]
  (-> elem
      (assoc ::type entity-type)
      (update :repos to-set-of-keywords)
      (update :tags to-set-of-keywords)
      (update :tags (partial union tags-from-path))
      (update :uses set)
      (update :containers (fn [containers]
                            (set (map (fn [container] (fixup-container container name))
                                      containers))))
      (fu/qualify-keys this-ns-name)))

(s/fdef fixup-element
  :args (s/cat :entity-type    ::entity-type
               :tags-from-path ::tags
               :proto-entity   ::proto-entity)
  :ret  ::element
  :fn   (fn [{{elem-in :proto-entity} :args, elem-out :ret}]
          (every? #(>= (count (get elem-out %)) (count (get elem-in %)))
                  [::repos ::tags ::uses ::containers])))

(defn elements-from-file
  "Parses the contents of a YAML file, then processes those contents such that
  each element conforms to ::element. entity-type is needed because the files
  on disk don’t include the `type` key — it’s implicit in the file’s path. The
  file-path and root-path are used to generate tags from the file’s path
  relative to the root path."
  [file-contents]
  (let [parsed (yaml/parse-string file-contents)]
    (map fixup-element elems)))

(s/fdef elements-from-file
  :args (s/cat :file-contents ::yaml-file-contents)
  :ret  (s/coll-of ::element))

(defn empty-model
  []
  {::systems {} ::users {} ::datastores {}})

(defn add-file-contents
  "Adds the elemenents from a parsed model file to a model."
  [model file-contents]
  (reduce
   (fn [model [src dest]]
     (update model dest merge (get file-contents src {})))
   model
   [[:system     :systems]
    [:systems    :systems]
    [:user       :users]
    [:users      :users]
    [:datastore  :datastores]
    [:datastores :datastores]]))

(defn build-model
  "Accepts a sequence of maps read from model YAML files and combines them into
  a single model map. Does not validate the result."
  [file-content-maps]
  (reduce add-file-contents (empty-model) file-content-maps))
