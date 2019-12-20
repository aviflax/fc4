(ns fc4.rendering
  (:require [clojure.spec.alpha :as s]
            [clojure.spec.gen.alpha :as gen]
            [clojure.string :refer [join]]
            [clojure.test.check.generators :as gens] ; digging deep into the generator toolbox
            [cognitect.anomalies :as anom]))

; alright, this isn’t *really* substantial, but SVG keys are sometimes pretty small!
(def substantial-min 1024)

(defn- substantial?
  [coll]
  (>= (count coll) substantial-min))

(s/def ::substantial-bytes (s/with-gen (s/and bytes? substantial?)
                             #(gen/fmap byte-array (gen/vector gens/byte substantial-min))))
(s/def :fc4.rendering.png/main ::substantial-bytes)
(s/def :fc4.rendering.png/key ::substantial-bytes)
(s/def :fc4.rendering.png/conjoined ::substantial-bytes)
(s/def ::png (s/keys :req [:fc4.rendering.png/main
                           :fc4.rendering.png/key
                           :fc4.rendering.png/conjoined]))

(s/def ::substantial-string (s/with-gen (s/and string? substantial?)
                              #(gen/fmap join (gen/vector (gen/char-alphanumeric) substantial-min))))
(s/def :fc4.rendering.svg/main ::substantial-string)
(s/def :fc4.rendering.svg/key ::substantial-string)
(s/def :fc4.rendering.svg/conjoined ::substantial-string)
(s/def ::svg (s/keys :req [:fc4.rendering.svg/main
                           :fc4.rendering.svg/key
                           :fc4.rendering.svg/conjoined]))

(s/def ::images (s/keys :req [(or ::png ::svg (and ::png ::svg))]))
(s/def ::success-result (s/keys :req [::images]))
(s/def ::failure-result ::anom/anomaly)

(comment
  ;; Example Success Result:
  {::images {::png {:fc4.rendering.png/main <bytes>
                    :fc4.rendering.png/key  <bytes>
                    :fc4.rendering.png/conjoined <bytes>}
             ::svg {:fc4.rendering.svg/main <string>
                    :fc4.rendering.svg/key  <string>
                    :fc4.rendering.svg/conjoined <string>}}})

(defprotocol Renderer
  "A potentially resource-intensive abstraction that can render Structurizr
  Express diagrams. Implementations must also implement java.io.Closeable."
  (render
    [renderer diagram-yaml]
    [renderer diagram-yaml options]
    "diagram-yaml must be a string containing the YAML source of a Structurizr
    Express diagram. options must be a map. Implementations may or may not support concurrent calls
    to render; see their docs. Blocks. Returns either ::success-result or ::failure-result."))
