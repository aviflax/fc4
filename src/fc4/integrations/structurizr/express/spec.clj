(ns fc4.integrations.structurizr.express.spec
  (:require [clj-yaml.core :as yaml]
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [com.gfredericks.test.chuck.generators :refer [string-from-regex]]
            [fc4.integrations.structurizr.express.yaml :as seyaml]
            [fc4.spec :as fs]
            [fc4.util :as fu :refer [namespaces]]
            [fc4.yaml :as fy :refer [split-file doc-separator]]))

(namespaces '[structurizr              :as st]
            '[structurizr.container    :as sc]
            '[structurizr.diagram      :as sd]
            '[structurizr.element      :as se]
            '[structurizr.person       :as sp]
            '[structurizr.relationship :as sr]
            '[structurizr.style        :as ss]
            '[structurizr.system       :as sy])

(s/def ::st/name
  (s/with-gen ::fs/non-blank-simple-str
    ;; This needs to generate a small and stable set of names so that the
    ;; generated relationships have a chance of being valid — or at least useful.
    #(gen/elements ["A" "B"])))

(s/def ::st/description ::fs/non-blank-simple-str)

(def ^:private comma-delimited-simple-strs-pattern #"[A-Za-z\-_,0-9]+")

(s/def :st/comma-delimited-simple-strings
  (s/with-gen
    (s/and string? (partial re-matches comma-delimited-simple-strs-pattern))
    #(string-from-regex comma-delimited-simple-strs-pattern)))

(s/def ::st/tags :st/comma-delimited-simple-strings)

(s/def ::st/position ::fs/coord-string)

(s/def ::st/foo string?)

(def ^:private int-pattern #"\d{1,4}")
(s/def ::st/int-in-string
  (s/with-gen (s/and string? (partial re-matches int-pattern))
    #(string-from-regex int-pattern)))

;;;;; Elements (TODO: maybe should be a multispec?)

;;;; Base element

(s/def ::st/base-elem
  (s/keys :req-un [::st/name]
          :opt-un [::st/description ::st/tags]))

;;;; Container

(s/def ::sc/type #{"Container"})
(s/def ::sc/technology string?)

(s/def ::st/container
  (s/merge ::st/base-elem
           (s/keys :req-un [::sc/type ::st/position]
                   :opt-un [::sc/technology])))

;;;; Person

(s/def ::sp/type #{"Person"})

(s/def ::st/person
  (s/merge ::st/base-elem
           (s/keys :req-un [::sp/type ::st/position])))

;;;; System

(s/def ::sy/type #{"Software System"})
(s/def ::sy/containers (s/coll-of ::st/container :min-count 1))

(s/def ::st/system
  (s/merge ::st/base-elem
           (s/keys :req-un [::sy/type
                            ; The subject of a container diagram must contain
                            ; :containers; in all other cases system elements
                            ; must contain :position.
                            (or ::st/position ::sy/containers)])))

;;;; Element (an abstraction)

(s/def ::st/element (s/or :system    ::st/system
                          :person    ::st/person
                          :container ::st/container))

(s/def ::st/element-with-position
  ; Normally I wouldn’t register a one-off spec with such a simple definition;
  ; I’d just inline it. But in this case I want it here, just below st/element,
  ; because it’s tightly-coupled to the way that st/element is conformed. (The
  ; way s/and works is by passing conformed values to all but its first
  ; predicate; those predicates are then used as filters.)
  (s/and ::st/element #(contains? (second %) :position)))

;;;; Relationships

(s/def ::sr/source ::st/name)
(s/def ::sr/destination ::st/name)
(s/def ::sr/order ::st/int-in-string)
(s/def ::sr/vertices (s/coll-of ::st/position :min-count 1))

;; This is useful for an interim stage in the export process
(s/def ::st/relationship-without-vertices
  (s/keys :req-un [::sr/source ::sr/destination]
          :opt-un [::st/description ::st/tags ::sr/order]))

(s/def ::st/relationship
  (s/merge ::st/relationship-without-vertices
           (s/keys :opt-un [::sr/vertices])))

;;;; Styles

(s/def ::ss/type #{"element" "relationship"})

(s/def ::ss/tag
  (s/with-gen ::fs/non-blank-simple-str
              ;; This generator helps test ...express.export/rename-internal-tag
    #(gen/one-of [(s/gen ::fs/non-blank-simple-str)
                  (gen/return "internal")])))

(s/def ::ss/width ::fs/coord-int)
(s/def ::ss/height ::fs/coord-int)
(s/def ::ss/color ::fs/non-blank-simple-str) ;;; TODO: Make this more specific
(s/def ::ss/shape #{"Box" "RoundedBox" "Circle" "Ellipse" "Hexagon" "Person"
                    "Folder" "Cylinder" "Pipe"})
(s/def ::ss/background ::fs/non-blank-simple-str) ;;; TODO: Make this more specific
(s/def ::ss/dashed #{"true" "false"})
(s/def ::ss/border #{"Dashed" "Solid"})

(s/def ::st/style
  (s/keys :req-un [::ss/type ::ss/tag]
          :opt-un [::ss/color ::ss/shape ::ss/background ::ss/dashed ::ss/border
                   ::ss/width ::ss/height]))

;;;; Diagrams

(s/def ::sd/type #{"System Landscape" "System Context" "Container"})
(s/def ::sd/scope ::st/name)
(s/def ::sd/size #{"A2_Landscape" "A3_Landscape"}) ;;; TODO: Add the rest of the options
(s/def ::sd/elements (s/coll-of ::st/element :min-count 1))
(s/def ::sd/relationships (s/coll-of ::st/relationship))
(s/def ::sd/styles (s/coll-of ::st/style))

(s/def ::st/diagram
  (s/keys :req-un [::sd/type ::sd/scope ::sd/elements ::sd/size]
          :opt-un [::st/description ::sd/relationships ::sd/styles]))

(s/def ::st/diagram-yaml-str
  (s/with-gen
    (s/and string?
           #(not (re-seq #"\n\n---\n" %)) ; prevent extra blank line
           (fn [s]
             (let [parsed (-> s split-file ::fy/main yaml/parse-string)]
               (and
                 ; a string is a valid YAML value, but a valid diagram is a map
                (map? parsed)
                (every? #(contains? parsed %) [:type :scope :description
                                               :elements :size])))))
    #(gen/fmap
      (fn [diagram]
        (str
         (gen/generate
          (gen/frequency [[1 (gen/return nil)]
                          [1 (gen/return (str fy/default-front-matter
                                              doc-separator))]]))
         (seyaml/stringify diagram)))
      (s/gen ::st/diagram))))
