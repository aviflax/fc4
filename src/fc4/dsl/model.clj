(ns fc4.dsl.model
  (:require [clj-yaml.core :as yaml]
            [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [starts-with?]]
            [cognitect.anomalies :as anom]
            [expound.alpha :as expound :refer [expound-str]]
            [fc4.spec :as fs]
            [fc4.util :as u :refer [fault fault?]]
            [fc4.yaml :as fy :refer [split-file]])
  (:import [java.net URI]
           [org.yaml.snakeyaml.parser ParserException]))

(u/namespaces '[fc4 :as f]
              '[fc4.model :as m])

(s/def ::m/description ::fs/description) ;; Could reasonably have linebreaks.
(s/def ::m/comment ::fs/non-blank-str) ;; Could reasonably have linebreaks.

;; NB: when we implement a feature to translate an FC4 View to a Structurizr Express diagram, we may
;; want to have this sometimes generate the tags `internal` and `external`.
(s/def ::m/tag-name ::fs/short-non-blank-simple-str)

(s/def ::m/tags
  (s/map-of ::m/tag-name (s/or :boolean boolean?
                               :string  ::fs/short-non-blank-simple-str
                               :strings (s/coll-of ::fs/short-non-blank-simple-str :gen-max 2)
                               :number  number?
                               :numbers (s/coll-of number? :gen-max 2))
            :gen-max 2))

(defn- url?
  [v]
  (or (instance? URI v)
      (try (URI. v)
           true
           (catch Exception _e false))))

(defn- absolute-url?
  [s]
  (and (url? s)
       (.isAbsolute (URI. s))))

(s/def ::m/links
  (s/map-of ::fs/short-non-blank-simple-str (s/and url? absolute-url?) :gen-max 2))

(s/def ::m/name ::fs/short-non-blank-simple-str)

;; References to another element, by name (in this DSL, names are unique identifiers).
(s/def ::m/ref ::m/name)
(s/def ::m/refs
  (s/coll-of ::m/ref
             :distinct true
             :gen-max 2))

(s/def ::m/system ::m/ref)
(s/def ::m/container ::m/ref)

(s/def ::m/protocol ::fs/non-blank-simple-str)

;; Abstract spec for the properties of relationship maps that describe the purpose of a
;; relationship. This is “abstract” — do not use it directly in a DSL data structure. I suppose
;; we could have called this just “purpose” and used it directly, but that would be a little too
;; abstract and wouldn’t read very well in the DSL. So instead we create a bunch of aliases to this
;; spec that use various English words that work better to describe the purpose of something.
(s/def ::m/relationship-purpose ::fs/non-blank-str)

;; Various ways to express the purpose of a relationship. See below to see where they can be used.
(s/def ::m/because ::m/relationship-purpose)
(s/def ::m/for     ::m/relationship-purpose)
(s/def ::m/so-that ::m/relationship-purpose)
(s/def ::m/to      ::m/relationship-purpose)

(s/def ::m/uses
  (s/map-of ::m/ref
            (s/keys :req [::m/to] :opt [::m/container ::m/protocol])
            :min-elements 1 :gen-max 2))

;; Plural version for (classes of) people... English is bizarre.
(s/def ::m/use ::m/uses)

(s/def ::m/depends-on
  (s/map-of ::m/ref
            (s/keys :req [::m/for]
                    :opt [::m/because ::m/container ::m/protocol])
            :min-elements 1 :gen-max 2))

;; Property of the `reads-from` and/or `writes-to` relationship maps that provides the documentarian
;; a place to describe *what* it is that the reader is reading or that the writer is writing.
;;
;; NB: at some point we might want to expand this to also allow a list of strings, if someone wants
;; to describe multiple datasets/types that are read/written.
(s/def ::m/what ::fs/non-blank-simple-str)

(s/def ::m/reads-from
  (s/map-of ::m/ref
            (s/keys :req [::m/what]
                    :opt [::m/because ::m/for ::m/so-that ::m/to ::m/protocol])
            :min-elements 1 :gen-max 2))

(s/def ::m/writes-to
  (s/map-of ::m/ref
            (s/keys :req [::m/what]
                    :opt [::m/because ::m/for ::m/so-that ::m/to ::m/protocol])
            :min-elements 1 :gen-max 2))

(s/def ::m/all-relationships
  (s/keys :opt [::m/uses ::m/depends-on ::m/reads-from ::m/writes-to]))

(s/def ::m/common
  (s/keys :opt [::m/comment ::m/description ::m/tags]))

(s/def ::m/container-map
  (s/merge ::m/common
           ::m/all-relationships))

(s/def ::m/containers
  (s/map-of ::m/name ::m/container-map :min-count 1 :gen-max 2))

(s/def ::m/system-map
  ;; This map has no required keys because we want to allow advanced users who are in a hurry (e.g.
  ;; they may be sketching out a system landscape quickly) to define elements with an empty
  ;; specification/description — in other words, an empty map. This isn’t pretty in YAML, and many
  ;; or maybe even most people who are familiar with YAML might not know how to express an empty
  ;; mapping (`{}`) but I’m OK with all that.
  (s/merge ::m/common
           ::m/all-relationships
           (s/keys :opt [::m/containers ::m/datastores ::m/datatypes ::m/systems])))

;; A service is essentially a synonym or alias for a system. It’s a system that we think of as a
;; service.
(s/def ::m/service-map ::m/system-map)

(s/def ::m/people-map
  ;; This map has no required keys because -> see the comment in the definition of ::m/system-map.
  (s/merge ::m/common
           ; I could maybe be convinced that the other kinds of relationships
           ; are valid for people, but we’ll see.
           (s/keys :opt [::m/use])))

(s/def ::m/datastore-map
  ;; This map has no required keys because -> see the comment in the definition of ::m/system-map.
  ; I guess *maybe* a datastore could have a depends-on relationship? Not sure;
  ; I’d prefer to model datastores as fundamentally passive for now.
  (s/merge ::m/common
           (s/keys :opt [::m/datastores ::m/datatypes])))

(s/def ::m/datastore
  ;; We want to allow datastores to be defined top-level or inline. I won’t explain top-level
  ;; because that’s consistent with our other elements, and I think it’s pretty clear why someone
  ;; might want to describe a datastore such as a database, a search index, or a cache. Inline
  ;; definitions, however, are not so obvious; this is the only kind of element (apart from
  ;; containers, which are a little different) that supports this. The reason is that there are some
  ;; teams that are highly data oriented, rather than system or “place” oriented. Those teams may
  ;; want to define their datatypes first, and in some cases, e.g. a team that has 10 datatypes and
  ;; each type flows through a discrete Kafka topic, it might be best to define/describe/specify
  ;; those topics right in the definitions of the datatypes — in other words “here are our data
  ;; types; each one declares where it ‘lives’ or ‘flows’.” This isn’t speculation; this is a real
  ;; case/need that exists within Funding Circle.
  ;;
  ;; This requires extra work when building a model because we need to “hoist” the definitions of
  ;; inline datastores to the top level of the model after parsing, but before validating (or
  ;; anything else) so that references to them can be resolved. (I hope that makes sense. Another
  ;; way to say this is that the last step of the building process, before any validation or usage,
  ;; will need to be to move the datastores that are defined inline to the top level and replace
  ;; them with references to themselves.)
  (s/or :inline-datastore ::m/datastore-map
        :datastore-ref    ::m/ref))

(s/def ::m/publishers  ::m/refs)
(s/def ::m/subscribers ::m/refs)

(s/def ::m/datatype-map
  ;; This map has no required keys because -> see the comment in the definition of ::m/system-map.
  (s/merge ::m/common
           (s/keys :opt [::m/datastore])))

;; Root-level keys — for both an ::f/model and a ::file.
(s/def ::m/systems    (s/map-of ::m/name ::m/system-map    :gen-max 2))
(s/def ::m/services   (s/map-of ::m/name ::m/service-map   :gen-max 2))
(s/def ::m/people     (s/map-of ::m/name ::m/people-map    :gen-max 2))
(s/def ::m/datastores (s/map-of ::m/name ::m/datastore-map :gen-max 2))
(s/def ::m/datatypes  (s/map-of ::m/name ::m/datatype-map  :gen-max 2))

(s/def ::f/model
  (s/keys :req [::m/systems ::m/services ::m/people ::m/datastores ::m/datatypes]))

;; “Root map” of model DSL YAML files. This is nearly identical to a model, with one key difference:
;; a model file may contain only a single root key, whereas a model must have all the root keys.
;; This spec is useful because it allows us to validate an individual model file.
(s/def ::file
  (s/keys :req [(or ::m/systems ::m/services ::m/people ::m/datastores ::m/datatypes)]
          :opt [::m/systems ::m/services ::m/people ::m/datastores ::m/datatypes]))

(s/def ::file-yaml-string
  (s/with-gen
    ;; This spec exists mainly for the use of its generator, so valid inputs can
    ;; be generated and passed to parse-model-file during generative testing.
    ;; That said, the predicate also needs to be able to reject obviously
    ;; invalid values, so as to make the conformance of the generated args
    ;; accurate during generative testing. In other words, the specs in the
    ;; fdef for parse-model-file include an s/or, which will sort of “classify”
    ;; an argument according to the first spec that it validates against, so we
    ;; need values like "" and "foo" to be invalid as per this spec.
    (s/and string?
           (fn [v] (some #(starts-with? v %) ["systems" "services" "people" "datastores" "datatypes"])))
    #(gen/fmap yaml/generate-string (s/gen ::file))))

(defn parse-file
  "Given a YAML model file as a string, parses it, and qualifies all map keys so that the result has
  a chance of being a valid ::file. If a file contains “top matter” then only the main document is
  parsed. Performs very minimal validation. If the file contains malformed YAML, or does not contain
  a map, an anomaly will be returned."
  [file-contents]
  (try
    (let [parsed (-> (split-file file-contents)
                     (::fy/main)
                     (yaml/parse-string))]
      (if (associative? parsed)
        (u/qualify-known-keys 'fc4.model parsed)
        (fault "Root data structure must be a map (mapping).")))
    (catch ParserException e
      (fault (str "YAML could not be parsed: error " e)))))

(s/fdef parse-file
  :args (s/cat :v (s/alt :valid-and-well-formed ::file-yaml-string
                         :invalid-or-malformed  string?))
  :ret  (s/or :valid-and-well-formed ::file
              :invalid-or-malformed  ::anom/anomaly)
  :fn   (fn [{{arg :v} :args, ret :ret}]
          (= (first arg) (first ret))))

(defn validate-parsed-file
  "Returns either an error message as a string or nil."
  [parsed]
  (cond
    (s/valid? ::file parsed)
    nil

    (fault? parsed)
    (::anom/message parsed)

    :else
    (expound-str ::file parsed)))

(s/fdef validate-parsed-file
  :args (s/cat :parsed (s/alt :valid   ::file
                              :invalid map?))
  :ret  (s/or                 :valid   nil?
                              :invalid string?)
  :fn   (fn [{{arg :parsed} :args, ret :ret}]
          (= (first arg) (first ret))))

(def empty-model
  #::m{:systems {} :services {} :people {} :datastores {} :datatypes {}})
