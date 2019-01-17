(ns fc4.integrations.structurizr.express.export-test
  (:require [clojure.spec.alpha      :as s]
            [clojure.spec.gen.alpha  :as gen]
            [clojure.string          :as string :refer [includes?]]
            [clojure.test            :as ct :refer [deftest is testing]]
            [cognitect.anomalies     :as anom]
            [expound.alpha           :as expound]
            [fc4.integrations.structurizr.express.export :as e]
            [fc4.io.dsl              :as dsl]
            [fc4.model               :as m]
            [fc4.test-utils          :as tu :refer [check]]
            [fc4.view                :as v]))

(deftest add-control-points (check `e/add-control-points))
(deftest add-in-house-tag (check `e/add-in-house-tag))
(deftest dep->relationship (check `e/dep->relationship))
(deftest deps-of (check `e/deps-of))
(deftest dequalify-keys (check `e/dequalify-keys))
(deftest elements (check `e/elements))

(deftest get-subject
  (check `e/get-subject
         1000
         ;; Override the name generator because the subject named in the view
         ;; needs to exist in the generated model.
         {::m/name #(gen/return "A")}))

(deftest inject-control-points (check `e/inject-control-points))
(deftest relationship-with (check `e/relationship-with))

(deftest relationships
  (check `e/relationships
         500
         {::v/positions #(s/gen (s/merge ::v/positions
                                         (s/keys :req [::v/other-systems])))}))

(deftest rename-internal-tag (check `e/rename-internal-tag))
(deftest replace-internal-tag (check `e/replace-internal-tag))
(deftest sys-elem (check `e/sys-elem 300))
(deftest sys-position (check `e/sys-position 300))
(deftest tags (check `e/tags))
(deftest user->relationships (check `e/user->relationships))

(deftest person-elem
  (check `e/person-elem
         300
         {::v/positions #(s/gen (s/merge ::v/positions
                                         (s/keys :req [::v/users])))
          ::v/users #(s/gen (s/map-of ::name ::coord-string
                                      :min-count 2 :max-count 2))}))

(deftest view->system-context
  (testing "generative"
    (check `e/view->system-context
           200
           {::m/uses #(s/gen (s/coll-of (s/merge ::system-ref
                                                 (s/keys :req [::system]))))}))

  (testing "on-disk examples"
    (testing "happy path"
      (let [mp     "test/data/model (valid)/"
            model  (dsl/read-model mp)
            vp     "test/data/views/middle (valid).yaml"
            view   (dsl/read-view vp)
            sp     "test/data/styles (valid).yaml"
            styles (dsl/read-styles sp)
            _ (doseq [[n [v p]] {"model"  [model  mp]
                                 "view"   [view   vp]
                                 "styles" [styles sp]}]
                (when (and (map? v) (contains? v ::anom/category))
                  (throw (ex-info (str "invalid " n " in " p) v))))
            result (e/view->system-context view model styles)]
        (is (s/valid? :structurizr/diagram result)
            (expound/expound-str :structurizr/diagram result))))

    (testing "neutral path:"
      (testing "view references undefined system"
        (let [mp     "test/data/model (valid)/"
              model  (dsl/read-model mp)
              vp     "test/data/views/middle (valid, references undefined system).yaml"
              view   (dsl/read-view vp)
              sp     "test/data/styles (valid).yaml"
              styles (dsl/read-styles sp)
              _ (doseq [[n [v p]] {"model"  [model  mp]
                                   "view"   [view   vp]
                                   "styles" [styles sp]}]
                  (when (and (map? v) (contains? v ::anom/category))
                    (throw (ex-info (str "invalid " n " in " p) v))))
              result (e/view->system-context view model styles)]
          (is (s/valid? :structurizr/diagram result)
              (expound/expound-str :structurizr/diagram result))
          (is (some #(includes? (:name %) "undefined")
                    (:elements result))))))))
