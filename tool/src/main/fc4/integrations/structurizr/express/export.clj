(ns fc4.integrations.structurizr.express.export
  "Functions concerned with exporting FC4 views as Structurizr Express diagrams."
  (:require [cognitect.anomalies  :as anom]
            [clj-yaml.core        :as yaml]
            [clojure.walk         :as walk :refer [postwalk]]
            [clojure.spec.alpha   :as s]
            [clojure.string       :as string :refer [includes? join]]
            [fc4.integrations.structurizr.express.spec] ;; for side fx
            [fc4.model            :as m]
            [fc4.spec             :as fs]
            [fc4.styles           :as ss]
            [fc4.util             :as fu :refer [namespaces update-all]]
            [fc4.view             :as v]
            [fc4.yaml             :as fy :refer [split-file]]))

(namespaces '[structurizr :as st])

(defn- sys-position
  "Returns the position of the named system in the view. If the named system is not
  present in the view, returns '0,0'."
  [sys-name view]
  (get-in view
          (if (= sys-name (::v/system view))
            [::v/positions ::v/subject]
            [::v/positions ::v/other-systems sys-name])
          "0,0"))

(s/fdef sys-position
  :args (s/cat :sys-name ::m/name
               :view     ::v/view)
  :ret  ::v/coord-string)

(defn- add-in-house-tag
  [tags]
  (if (contains? tags :external)
    tags
    (conj tags :in-house)))

(s/fdef add-in-house-tag
  :args (s/cat :tags ::m/tags)
  :ret  ::m/tags
  :fn   (fn [{{in-tags :tags} :args, out-tags :ret}]
          (if (:external in-tags)
            (= in-tags out-tags)
            (and (contains? out-tags :in-house)
                 (= in-tags (disj out-tags :in-house))))))

(defn- replace-internal-tag
  "The tag “internal” is a special reserved tag for Structurizr Express; for
  diagrams that indicate an “inside” and an “outside”, such as System Landscape
  diagrams and Container diagrams, the set of elements that have “internal”
  (case insensitive) is used to draw the boundary box. So when exporting an FC4
  view+model+styles as Structurizr Express diagram, we need to transform the
  tag :interal to something that is _not_ reserved, so we use :in-house."
  [tags]
  (if-not (contains? tags :internal)
    tags
    (-> tags
        (disj :internal)
        (conj :in-house))))

(s/fdef replace-internal-tag
  :args (s/cat :tags ::m/tags)
  :ret  ::m/tags
  :fn   (fn [{{in-tags :tags} :args, out-tags :ret}]
          (if (:internal in-tags)
            (and (contains? out-tags :in-house)
                 (not (contains? out-tags :internal))
                 (= (count in-tags) (count out-tags)))
            (= in-tags out-tags))))

(defn- tags
  [elem]
  (->> (::m/tags elem)
       (replace-internal-tag)
       (add-in-house-tag)
       (map name) ; converts set to a seq but in this case that’s OK as we then convert it to a str
       (join ",")))

(s/fdef tags
  :args (s/cat :elem ::m/element)
  :ret  ::st/tags
  :fn   (fn [{{{in-tags ::m/tags} :elem} :args, out-tags :ret}]
          (every? (fn [in-tag]
                    (condp = in-tag
                      :internal
                      (and (includes? out-tags "in-house")
                           (not (includes? out-tags "internal")))

                      :external
                            ; You might think we’d want to ensure that out-tags
                            ; does *not* include "in-house". But! What if
                            ; in-tags contains both :internal *and* :external!?
                            ; So yeah... the input is nonsensical, but this fn
                            ; still has to handle it somehow. I decided to go
                            ; with GIGO — data validation is not the job of this
                            ; fn, nor is linting.
                      (includes? out-tags "external")

                      (includes? out-tags (name in-tag))))
                  in-tags)))

(defn dequalify-keys
  "Given a nested map, removes the namespaces from any keys that are qualified
  keywords."
  {:fork-of 'clojure.walk/stringify-keys}
  [m]
  (update-all
   (fn [[k v]]
     (if (qualified-keyword? k)
       [(keyword (name k)) v]
       [k v]))
   m))

(s/fdef dequalify-keys
  :args (s/cat :m (s/map-of qualified-keyword? any?))
  :ret  (s/map-of ::fs/unqualified-keyword any?))

(defn- sys-elem
  ;; TODO: this should probably be combined with user-elem.
  "Constructs a Structurizr Express \"Software System\" element for the named
  system for the given view and model. For now, excludes containers. If the named
  system is not present in the ::m/systems coll of the model, the value of :name
  will be the supplied name with (undefined) appended. If the named system is
  not present in the view under ::v/positions then the returned element will
  have the position '0,0'."
  [sys-name view model]
  (if-let [system (get-in model [::m/systems sys-name]
                          {::m/name (str sys-name " (undefined)")})]
    (-> (select-keys system [::m/name ::m/description ::m/tags])
        (dequalify-keys)
        (merge {:type "Software System"
                :position (sys-position sys-name view)
                :tags (tags system)}))))

(s/fdef sys-elem
  :args (s/cat :sys-name ::m/name
               :view     ::v/view
               :model    ::m/model)
  :ret  (s/nilable ::st/system)
  :fn   (fn [{{:keys [:sys-name :view :model]} :args, ret :ret}]
          (cond
            (get-in model [::m/systems sys-name]) ; the named system is in the model
            (= (:name ret) sys-name)

            :sys-not-in-model
            (and (includes? (:name ret) sys-name)
                 (includes? (:name ret) "undefined")))))

(defn- person-elem
  ;; TODO: this should probably be combined with sys-elem.
  "Constructs a Structurizr Express \"Person\" element for the named
  user for the given view and model. If the named user is not present in the
  ::m/users coll of the model, returns nil. If the named user is not present in the
  view under [::v/positions ::v/users] then the returned element will have the
  position '0,0'."
  [user-name view model]
  (if-let [user (get-in model [::m/users user-name]
                        {::m/name (str user-name " (undefined)")})]
    (-> (select-keys user [::m/name ::m/description ::m/tags])
        (dequalify-keys)
        (merge {:type "Person"
                :position (get-in view [::v/positions ::v/users user-name] "0,0")
                :tags (tags user)}))))

(s/fdef person-elem
  :args (s/cat :user-name ::m/name
               :view      ::v/view
               :model     ::m/model)
  :ret  (s/nilable ::st/person)
  :fn   (fn [{{:keys [user-name view model]} :args, ret :ret}]
          (cond
            (get-in model [::m/users user-name]) ; the named user is in the model
            (= (:name ret) user-name)

            :user-not-in-model
            (and (includes? (:name ret) user-name)
                 (includes? (:name ret) "undefined")))))

(defn- deps-of
  "Returns the systems that the subject system uses — its dependencies."
  ;; TODO: I think maybe we also need the
  ;; TODO: maybe should be merged with users-of?
  ;; TODO: this should handle the case of a system that the subject uses >1 ways
  [{:keys [::m/uses ::m/containers ::m/name]} {systems ::m/systems}]
  (or
   (some->> uses ; start with the systems that this system uses directly
             ; add the systems that the containers of this system use
            (concat (mapcat ::m/uses containers))
             ; We only want those references that are to a *different* system.
            (remove #(= (::m/system %) name)))
   []))

(s/fdef deps-of
  :args (s/cat :system ::m/system-map
               :model  ::m/model)
  :ret  (s/coll-of ::m/sys-ref))

(defn- users-of
  "Returns the systems that use the subject system."
  ;; TODO: maybe should be merged with deps-of?
  [subject-name model]
  (some->>
   (merge (::m/systems model) (::m/users model))
   (vals)
   (filter (fn [elem]
             (seq (->> (concat (::m/uses elem)
                               (map ::m/uses (::m/containers elem)))
                       (filter (fn [dep] (= (::m/system dep) subject-name)))))))))

(defn- dep->relationship
  ;; TODO: this should handle the case of a system that the subject uses >1 ways
  [dep subject-name]
  (merge (select-keys dep [::m/description ::m/technology]) ;; <- might return an empty map
         {:source subject-name
          :destination (or (::m/container dep)
                           (::m/system dep))}))

(s/fdef dep->relationship
  :args (s/cat :dep          ::m/sys-ref
               :subject-name ::m/name)
  :ret  ::st/relationship
  :fn   (fn [{{:keys [dep subject-name]} :args, ret :ret}]
          (and (or (= (:destination ret) (::m/container dep))
                   (= (:destination ret) (::m/system dep)))
               (= (:source ret) subject-name))))

(defn- user->relationships
  "User here means a system, person, or user that uses the subject system."
  [{user-name ::m/name
    sys-refs  ::m/uses}
   subject-name]
  (map (fn [sys-ref]
         (merge {:source      user-name
                 :destination (::m/system sys-ref)}
                (select-keys sys-ref [::m/description ::m/technology])))
       sys-refs))

(s/fdef user->relationships
  :args (s/cat :user ::m/user
               :subject-name ::m/name)
  :ret  (s/coll-of ::st/relationship)
  :fn   (fn [{{:keys [user subject-name]} :args, ret :ret}]
          (every?
           (fn [rel]
             (= (:source rel)
                (::m/name user)))
           ret)))

(defn- get-subject
  [{subject-name ::v/system :as view} model]
  (or (get-in model [::m/systems subject-name])
      (get-in model [::m/systems (keyword subject-name)])))

(s/fdef get-subject
  :args (s/cat :view ::v/view
               :model ::m/model)
  :ret  ::m/system-map)

(defn- elements
  [view model]
  ;; TODO: clean this up; it’s ugly and hard to follow
  (let [other-systems-names (-> view ::v/positions ::v/other-systems keys)
        subject-name (::v/system view)
        sys-names (conj other-systems-names subject-name)
        sys-elems (map #(sys-elem % view model) sys-names)
        user-names (-> view ::v/positions ::v/users keys)
        person-elems (map #(person-elem % view model) user-names)]
    (concat person-elems sys-elems)))

(s/fdef elements
  :args (s/cat :view  ::v/view
               :model ::m/model)
  :ret  (s/coll-of ::st/element))

(defn- relationship-with
  "Given a relationship and the subject name, returns the name of the other side
  of the relationship, regardless of the directionality of the relationship. If
  the subject is not found on either side of the relationship, returns nil."
  [subject-name
   {:keys [source destination]}]
  (condp = subject-name
    source destination
    destination source
    nil))

(s/fdef relationship-with
  :args (s/cat :subject-name ::v/name
               :rel          ::st/relationship)
  :ret  (s/nilable ::st/name)
  :fn   (fn [{{:keys [subject-name rel]} :args, ret-name :ret}]
          (or (= ret-name (:source rel))
              (= ret-name (:destination rel))
              (nil? ret-name))))

(defn- inject-control-points
  "Given the set of relationships with a single system, and potentially a set of
  point-groups (might be nil) for those relationships, injects those control
  points into the relationships."
  [rels point-groups]
  ;; You might wonder: why use map-indexed and nth instead of just mapping over
  ;; both collections with plain old map? It’s because plain old map will just
  ;; skip/drop elements if the colls are of different sizes. In this scenario
  ;; there may be fewered point-groups than relationships, as not all
  ;; relationships will have point-groups. Hence this convoluted approach.
  (map-indexed
   (fn [i rel]
     (if-let [points (nth point-groups i nil)]
       (assoc rel :vertices points)
       rel))
   rels))

(s/def ::relationships-without-vertices
  (s/coll-of ::st/relationship-without-vertices
             :min-count 1))

(s/fdef inject-control-points
  :args (s/cat :rels         ::relationships-without-vertices
               :point-groups (s/nilable ::v/control-point-seqs))
  :ret  :structurizr.diagram/relationships
  :fn   (fn [{{in-rels      :rels
               point-groups :point-groups} :args
              out-rels                     :ret}]
          (and (= (count in-rels) (count out-rels))
               (= (count (filter :vertices out-rels))
                  (min (count point-groups)
                       (count in-rels))))))

(defn- add-control-points
  "Add control points to relationships, when they’re specified in the view."
  [rels
   {subject-name                      ::v/system
    {point-groups ::v/system-context} ::v/control-points}]
  (->> rels
       (group-by (partial relationship-with subject-name))
       (mapcat (fn [[other-side-name these-rels]]
                 (if-let [pgs (get point-groups other-side-name)]
                   (inject-control-points these-rels pgs)
                   these-rels)))))

(s/fdef add-control-points
  :args (s/cat :rels ::relationships-without-vertices
               :view ::v/view)
  :ret  :structurizr.diagram/relationships
  :fn   (fn [{{in-rels :rels
               view    :view} :args
              out-rels        :ret}]
          (and (= (count in-rels) (count out-rels))
               (->> (filter :vertices out-rels)
                    (every? (fn [{:keys [destination source] :as out-rel}]
                              (let [all-cp-groups (get-in view [::v/control-points ::v/system-context])
                                    cp-group-systems (set (keys all-cp-groups))]
                                (or (contains? cp-group-systems destination)
                                    (contains? cp-group-systems source)))))))))

(defn- relationships
  [view model]
  (let [{subject-name ::m/name :as subject} (get-subject view model)
        deps (deps-of subject model)
        ;; TODO: also need to get those systems that *use* the subject
        sys-rels (map #(dep->relationship % subject-name) deps)
        users (users-of subject-name model)
        user-rels (mapcat #(user->relationships % subject-name) users)]
    (-> (concat sys-rels user-rels)
        (add-control-points view)
        ;; In the model, two different containers of the same system can have
        ;; relationships to the same *other* system. In a container diagram
        ;; those relationships may be meaningfully different. In a System
        ;; Context diagram, however, those relationships are essentially
        ;; duplicates and can and should be collapsed down to a single
        ;; relationship.
        ;; Using distinct to do this is a bit of a hack, because it’ll only work
        ;; if the relationship maps returned by dep->relationship are equal. And
        ;; while that happens to be the case with the system I’m working with
        ;; right now, there’s no guarantee that that’ll be the case with all
        ;; systems going forward. So eventually this simplistic call to distinct
        ;; will probably need to be replaced with something more sophisticated.
        ;; Perhaps that routine will merge the relationships together,
        ;; concatenating the descriptions if they differ — TBD.
        (distinct))))

(s/fdef relationships
  :args (s/cat :view ::v/view
               :model ::m/model)
  :ret  :structurizr.diagram/relationships
  :fn   (fn [{{:keys [view model]} :args
              ret                  :ret}]
          (let [{sub-name    ::m/name
                 direct-deps ::m/uses} (get-subject view model)]
                  ;; TODO: also verify control points
            (every? (fn [{dep-sys-name ::m/system :as dep}]
                      (some (fn [{source-sys-name :source
                                  dest-sys-name   :destination}]
                              (or (= source-sys-name dep-sys-name)
                                  (= dest-sys-name dep-sys-name)))
                            ret))
                    direct-deps))))

(defn- rename-internal-tag
  "Please see docstring of replace-internal-tag."
  [styles]
  (map
   (fn [style]
     (if-not (= (::ss/tag style) "internal")
       style
       (update style ::ss/tag (constantly "in-house"))))
   styles))

(s/fdef rename-internal-tag
  :args (s/cat :styles ::ss/styles)
  :ret  ::ss/styles
  :fn (fn [{{in-styles :styles} :args, out-styles :ret}]
        (every? true?
                (map (fn [in-style out-style]
                       (if (= (::ss/tag in-style) "internal")
                         (= (::ss/tag out-style) "in-house")
                         (= (::ss/tag in-style) (::ss/tag out-style))))
                     in-styles out-styles))))

(defn view->system-context
  "Converts an FC4 view to a Structurizr Express System Context diagram."
  [view model styles]
  (dequalify-keys
   {:type "System Context"
    :scope (::v/system view)
    :elements (elements view model)
    :relationships (relationships view model)
    :styles (rename-internal-tag styles)
    :size (::v/size view)}))

(s/fdef view->system-context
  :args (s/cat :view ::v/view
                     ; TODO: rather than just a model that is merely *valid*
                     ; as in it conforms with its spec, we should probably
                     ; ensure that what gets passed in *makes sense*. I mean...
                     ; functions should do only one thing, so I wouldn’t want
                     ; this function to do (invoke) such second-order
                     ; validation, but it could probably be documented such that
                     ; that’s what it expects, and therefore it can just throw
                     ; an exception (or return an anomaly) if something in it
                     ; does NOT make sense.
               :model ::m/model
               :styles ::ss/styles)
  :ret  (s/or :success ::st/diagram
              :error   ::anom/anomaly))
