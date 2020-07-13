(ns fc4.integrations.structurizr.express.snap
  "Functions that assist with editing Structurizr Express diagrams, which are
  serialized as YAML documents."
  (:require [clojure.spec.alpha :as s]
            [clojure.string :as str :refer [join split trim]]
            [clojure.walk :as walk :refer [postwalk]]
            [fc4.spec :as fs] ; for side effects
            [fc4.util :as fu :refer [namespaces]]))

(namespaces '[structurizr :as st])

(def ^:private coord-pattern (re-pattern (str "^" fs/coord-pattern-base "$")))

(defn- parse-coords [s]
  (some->> s
           (re-find coord-pattern)
           (drop 1)
           (map #(Integer/parseInt %))))

(s/fdef parse-coords
  :args (s/cat :s ::fs/coord-string)
  :ret (s/coll-of ::fs/coord-int :count 2)
  :fn (fn [{:keys [ret args]}]
        (= ret
           (->> (split (:s args) #",")
                (map trim)
                (map #(Integer/parseInt %))))))

(defn- round-to-closest
  "Accepts any natural int n and rounds it to the closest target. If the rounded
  value exceeds the max coord value of fs/max-coord-int then the max value will
  be returned."
  [target n]
  (if (or (zero? target) (zero? n))
    0
    (min fs/max-coord-int
         (-> (/ n (float target))
             (Math/round)
             (* target)))))

(s/def ::snap-target #{10 25 50 75 100})

(s/fdef round-to-closest
  :args (s/cat :target ::snap-target
               :n      ::fs/coord-int)
  :ret ::fs/coord-int
  :fn (fn [{{:keys [target _n]} :args
            ret :ret}]
        (or (zero? ret)
            (zero? (rem ret target))
            (= ret fs/max-coord-int))))

(def ^:private elem-offsets
  {"Person" [25 -50]
   :default [0 0]})

(defn- get-offsets
  [elem-type]
  (get elem-offsets elem-type (:default elem-offsets)))

(defn- snap-coords
  "Accepts a seq of X and Y numbers, and config values and returns a string in
  the form \"x,y\"."
  ; TODO: it’s inconsistent that the min-margin is passed in as an arg but the
  ; max margin is referenced from a var in the spec namespace. (My idea to fix
  ; this is to define a new map named something like ::snap-config that would
  ; contain the target, margins, and offsets — and this single value could then
  ; be threaded through, rather than threading a bunch of scalar values through
  ; (see below how often e.g. min-margin is threaded through various function
  ; calls).
  ([coords to-closest min-margin]
   (snap-coords coords to-closest min-margin (repeat 0)))
  ([coords to-closest min-margin offsets]
   (->> coords
        (map (partial round-to-closest to-closest))
        (map + offsets)
        (map (partial max min-margin))       ; minimum left/top margins
        (map (partial min fs/max-coord-int)) ; maximum right/bottom margins
        (join ","))))

(s/fdef snap-coords
  :args (s/cat :coords     (s/coll-of ::fs/coord-int :count 2)
               :to-closest ::snap-target
               :min-margin ::fs/coord-int
               :offsets    (s/? (s/coll-of (s/int-in -50 50) :count 2)))
  :ret ::fs/coord-string
  :fn (fn [{:keys [ret args]}]
        (let [parsed-ret (parse-coords ret)
              {:keys [:min-margin]} args]
          (every? #(>= % min-margin) parsed-ret))))

(defn- snap-elem-to-grid
  "Accepts an element (a software system, person, container, or
  component) as a map and snaps its position (coords) to a grid using the
  specified values."
  [elem to-closest min-margin]
  (update elem :position
          #(let [coords (parse-coords %)
                 offsets (get-offsets (:type elem))]
             (snap-coords coords to-closest min-margin offsets))))

(defn- snap-elem-to-grid-fdef-pred
  "This is in a var because it’s just too big+long to inline."
  [{{elem-in-conformed :elem
     min-margin        :min-margin} :args
    elem-out-conformed              :ret}]
  (let [elem-in (s/unform ::st/element-with-position elem-in-conformed)
        elem-out (s/unform ::st/element-with-position elem-out-conformed)
        out-coords (parse-coords (:position elem-out))]
    (and (= (keys elem-out) (keys elem-in))
         (every? #(or (= % min-margin)
                      (= % fs/max-coord-int)
                      (= % (+ fs/max-coord-int (-> (get-offsets (:type elem-in))
                                                   (second))))
                      (zero? (rem % 5)))
                 out-coords))))

(s/fdef snap-elem-to-grid
  :args (s/cat :elem       ::st/element-with-position
               :to-closest ::snap-target
               :min-margin (s/int-in 0 500))
  :ret  ::st/element-with-position
  :fn   snap-elem-to-grid-fdef-pred)

(defn- snap-vertices-to-grid
  "Accepts an ordered-map representing a relationship, and snaps its vertices, if any, to a grid
  using the specified values."
  [e to-closest min-margin]
  (assoc e :vertices
         (map #(snap-coords (parse-coords %) to-closest min-margin)
              (:vertices e))))

(def ^:private elem-types
  #{"Person" "Software System" "Container" "Component"})

(defn snap-to-grid
  "Accepts a diagram as a map, a grid-size number, and a min-margin number. Searches the doc
  for elements and adjusts their positions so as to effectively “snap” them to a virtual grid of
  the specified size, and to ensure that each coord is no “smaller” than the min-margin number.

  Accounts for a quirk of Structurizr Express wherein elements of type “Person” need to be offset
  from other elements in order to align properly with them."
  [d to-closest min-margin]
  (postwalk
   #(cond
      (and (contains? elem-types (:type %))
             ; Checking for :position alone wouldn’t be sufficient; relationships can also have it
             ; and it means something different for them.
           (:position %))
      (snap-elem-to-grid % to-closest min-margin)

      (:vertices %)
      (snap-vertices-to-grid % (/ to-closest 2) min-margin)

      :else
      %)
   d))

(s/fdef snap-to-grid
  :args (s/cat :diagram ::st/diagram
               :to-closest #{100}
               :min-margin #{50})
  :ret  ::st/diagram)
