(ns fc4.styles
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            ; This ns is required solely for the side fx of loading the file:
            ; registering the desired specs in the spec registry.
            [fc4.integrations.structurizr.express.spec]
            [fc4.spec               :as fs]
            [fc4.util               :as util]))

(s/def ::background :structurizr.style/background)
(s/def ::border :structurizr.style/border)
(s/def ::color :structurizr.style/color)
(s/def ::dashed :structurizr.style/dashed)
(s/def ::height :structurizr.style/height)
(s/def ::shape :structurizr.style/shape)
(s/def ::tag :structurizr.style/tag)
(s/def ::type :structurizr.style/type)
(s/def ::width :structurizr.style/width)

(s/def ::style
  (s/keys
   :req [::type ::tag]
   :opt [::background ::border ::color ::dashed ::height ::shape ::width]))

(s/def ::styles (s/coll-of ::style :min-count 1))

; We have to capture this at compile time in order for it to have the value we
; want it to; if we referred to *ns* in the body of a function then, because it
; is dynamically bound, it would return the namespace at the top of the stack,
; the “currently active namespace” rather than what we want, which is the
; namespace of this file, because that’s the namespace all our keywords are
; qualified with.
(def ^:private this-ns-name (str *ns*))

(defn styles-from-file
  "Parses the contents of a YAML file, then processes those contents such that
  they conform to ::style."
  [file-contents]
  ;; We could really just pass the entire file contents into qualify-keys,
  ;; as it operates recursively on any and all nested Clojure data
  ;; structures. However, I’ve defined a simplistic function spec for it
  ;; that says that the arg must be a map with unqualified keyword keys.
  ;; Because that function spec is defined, if I turn on spec’s
  ;; instrumentation feature and then this function is called, then if it’s
  ;; passed the expected YAML string — which should contain a seq of maps
  ;; — then it’ll throw. So that’s why map is used below to pass each map
  ;; in the file to qualify-keys individually.
  (map #(util/qualify-keys % this-ns-name)
       (yaml/parse-string file-contents)))

(s/def ::yaml-file-contents
  (s/with-gen
    ::fs/non-blank-str
    #(gen/fmap yaml/generate-string (s/gen ::styles))))

(s/fdef styles-from-file
  :args (s/cat :file-contents ::yaml-file-contents)
  :ret  ::styles
  :fn   (fn [{{:keys [file-contents]} :args, ret :ret}]
                ;; Unlike the similar function fc4.view/view-from-file, this
                ;; needs to parse the strings back from the YAML back into (in
                ;; this case) seqs of ordered maps because otherwise the YAML
                ;; string serializations of the data structures were using
                ;; different orders for their keys, and thus as strings they
                ;; were not equal. When comparing maps, entries are not ordered
                ;; and thus order is irrelevant. It is actually surprising that
                ;; two ordered maps with different orders would be considered
                ;; equivalent but I’ll give the developers (of flatland/ordered)
                ;; the benefit of the doubt that they’ve good reasons for this.
          (= (yaml/parse-string file-contents)
             (yaml/parse-string (yaml/generate-string ret)))))
