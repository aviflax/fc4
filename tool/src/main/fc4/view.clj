(ns fc4.view
  (:require [clj-yaml.core           :as yaml]
            [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [fc4.spec               :as fs]
            [fc4.util               :as util]))

(load "view_specs")

(defn- fixup-keys
  "Finds any keyword keys that contain spaces and/or capital letters and
  replaces them with their string versions, because any such value is likely to
  be an element name, and we need those to be strings."
  [view]
  (util/update-all
   (fn [[k v]]
     (if (and (keyword? k)
              (re-seq #"[A-Z ]" (name k)))
       [(name k) v]
       [k v]))
   view))

(s/fdef fixup-keys
  :args (s/cat :m (s/map-of ::fs/unqualified-keyword any?))
  :ret  (s/map-of (s/or :keyword keyword? :string string?) any?)
  :fn   (fn [{{m :m} :args, ret :ret}]
          (and (= (count m) (count ret))
               (empty? (->> (keys ret)
                            (filter keyword?)
                            (map name)
                            (filter #(re-seq #"[A-Z ]" %)))))))

; We have to capture this at compile time in order for it to have the value we
; want it to; if we referred to *ns* in the body of a function then, because it
; is dynamically bound, it would return the namespace at the top of the stack,
; the “currently active namespace” rather than what we want, which is the
; namespace of this file, because that’s the namespace all our keywords are
; qualified with.
(def ^:private this-ns-name (str *ns*))

(defn view-from-file
  "Parses the contents of a YAML file, then processes those contents such that
  the result conforms to ::view."
  [file-contents]
  (-> (yaml/parse-string file-contents)
      ;; Both the below functions do a walk through the view; this is
      ;; redundant, duplicative, inefficient, and possibly slow. So this right
      ;; here is a potential spot for optimization.
      (fixup-keys)
      (util/qualify-keys this-ns-name)))

(s/def ::yaml-file-contents
  (s/with-gen
    ::fs/non-blank-str
    #(gen/fmap yaml/generate-string (s/gen ::view))))

(s/fdef view-from-file
  :args (s/cat :file-contents ::yaml-file-contents)
  :ret  ::view)
