(ns fc4.integrations.structurizr.express.format
  "Functions that assist with editing Structurizr Express diagrams, which are
  serialized as YAML documents."
  (:require [fc4.integrations.structurizr.express.spec] ; for side effects
            [fc4.util :as fu :refer [namespaces]]
            [clojure.spec.alpha :as s]
            [flatland.ordered.map :refer [ordered-map]]
            [clojure.string :as str :refer [blank? join]]
            [clojure.walk :as walk :refer [postwalk]]
            [clojure.set :refer [difference]])
  (:import [flatland.ordered.map OrderedMap]))

(namespaces '[structurizr :as st])

(defn blank-nil-or-empty? [v]
  (or (nil? v)
      (and (coll? v)
           (empty? v))
      (and (string? v)
           (blank? v))))

(s/fdef blank-nil-or-empty?
  :args (s/cat :v (s/or :nil nil?
                        :coll (s/coll-of any?
                                         ; for this fn it matters only if the coll is empty or not
                                         :gen-max 1)
                        :string string?))
  :ret boolean?
  :fn (fn [{:keys [args ret]}]
        (let [[which v] (:v args)]
          (case which
            :nil
            (= ret true)

            :coll
            (if (empty? v)
              (= ret true)
              (= ret false))

            :string
            (if (blank? v)
              (= ret true)
              (= ret false))))))

(defn shrink
  "Recursively remove map entries with a blank, nil, or empty value.

  Also replaces maps with nil if all of their values are nil, blank, or empty;
  the traversal is depth-first, so if that nil is the value of a map entry then
  that map entry will then be removed.

  Adapted from https://stackoverflow.com/a/29363255/7012"
  [diagram]
  (postwalk (fn [el]
              (if (map? el)
                (let [m (into (empty el) ; using empty to preserve ordered maps
                              (remove (comp blank-nil-or-empty? second) el))]
                  (when (seq m) m))
                el))
            diagram))

(s/fdef shrink
  :args (s/cat :in ::st/diagram)
  :ret  ::st/diagram
  :fn (s/and
       (fn [{{in :in} :args, ret :ret}] (= (type in) (type ret)))
       (fn [{{in :in} :args, ret :ret}]
         (let [all-vals #(if (map? %) (vals %) %) ; works on maps or sequences
               leaf-vals #(->> (tree-seq coll? all-vals %)
                               (remove coll?)
                               flatten)
               in-vals (->> (leaf-vals in) (filter (complement blank-nil-or-empty?)) set)
               ret-vals (->> (leaf-vals ret) set)]
           (= in-vals ret-vals)))))

(defn reorder
  "Reorder a map as per a seq of keys.

  Accepts a seq of keys and a map; returns a new ordered map containing the
  specified keys and their corresponding values from the input map, in the same
  order as the specified keys. If any keys present in the input map are omitted
  from the seq of keys, the corresponding k/v pairs will be sorted “naturally”
  after the specified k/v pairs."
  [m ks]
  ; You might think it’d be reasonable to also have a precondition like
  ; `(>= (count m) 2)` because why bother reordering the keys of an empty map,
  ; or one with 1 key? But no, I don’t think that’d be a good idea, because I
  ; suspect there’s a good chance that all sorts of instances of various maps
  ; might be passed to this function — maps that we can’t know about ahead of
  ; time. In other words, I suspect the data will vary at runtime; some maps
  ; might have a dozen keys, and some might have only 1. As long as the maps are
  ; valid according to their own criteria, I think this function should pass
  ; them through unchanged.
  {:pre [(seq ks)]}
  (let [specified-keys (set ks) ; reminder: this set is unordered.
        present-keys (set (keys m)) ; reminder: this set is unordered.
        unspecified-but-present-keys (difference present-keys specified-keys)
        ; The below starts with ks because the above sets don’t retain order. I
        ; tried using flatland.ordered.set but the difference and intersection
        ; functions from clojure.set did not work as expected with those.
        all-keys-in-order (concat ks (sort unspecified-but-present-keys))]
    (->> all-keys-in-order
         (map (juxt identity (partial get m)))
         ; we want the output to contain the same keys as the input
         (filter (fn [[k _]] (present-keys k)))
         (into (ordered-map)))))

(s/fdef reorder
  :args (s/cat :m  (s/map-of simple-keyword? any?)
               :ks (s/coll-of simple-keyword?
                              :min-count 2
                              :distinct true))
  :ret  (s/and (s/map-of simple-keyword? any?)
               (partial instance? OrderedMap))
  :fn   (fn [{{:keys [m ks]} :args, ret :ret}]
          (let [kss (set ks)]
            (and
                    ; Yeah, OrderedMaps are equal to maps with the same entries
                    ; regardless of order — surprised me too!
             (= m ret)
             (= (or (keys ret) []) ; keys on empty map returns nil
                (concat (filter (partial contains? m) ks)
                        (sort (remove (partial contains? kss)
                                      (keys m)))))))))

(def desired-order
  {:root          {:sort-keys nil
                   :key-order [:type :scope :description :elements
                               :relationships :styles :size]}
   :elements      {:sort-keys [:type :name]
                   :key-order [:type :name :description :tags :position
                               :containers]}
   :relationships {:sort-keys [:order :source :destination]
                   :key-order [:order :source :description :destination
                               :technology :vertices]}
   :styles        {:sort-keys [:type :tag]
                   :key-order [:type :tag]}})

(defn reorder-diagram
  "Apply desired order/sort to diagram keys and values.

  Accepts a diagram as a map. Returns the same map with custom ordering/sorting applied to the
  root-level key-value pairs and many of the nested sequences of key-value
  pairs as per desired-order."
  [diagram]
  (reduce
   (fn [d [key {:keys [sort-keys key-order]}]]
     (if (= key :root)
       (reorder d key-order)
       (update-in d [key]
                  (fn [v] (->> (sort-by (comp join (apply juxt sort-keys)) v)
                               (map #(reorder % key-order)))))))
   diagram
   desired-order))

(defn reformat
  "Accepts a diagram as a map; reorders everything and removes all empty/blank nodes."
  [d]
  ; shrink must follow reorder-diagram because the latter tends to introduce new keys with nil
  ; values.
  (shrink (reorder-diagram d)))

(s/fdef reformat
  :args (s/cat :in ::st/diagram)
  :ret  ::st/diagram)
