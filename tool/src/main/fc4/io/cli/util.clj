(ns fc4.io.cli.util)

;; Feel free to change when testing or as specified by command-line flags.
(defonce exit-on-exit? (atom true))
(defonce exit-on-fail? (atom true))

(defn beep
  "Prints a beep character (7) to stdout and then flushes stdout."
  []
  (print (char 7))
  (flush))

(defn- not-exit
  [status]
  (throw (Exception. (str "Normally the program would have exited at this point with status "
                          status))))

(defn exit
  "Prints values to stderr using println (if they’re supplied; they’re optional) then exits the JVM
  process with the specified status code. (Unless exit-on-exit? is false, in which case it throws
  instead; this is useful for testing.)"
  [status & vs]
  (when (seq vs)
    (binding [*out* *err*]
      (apply println vs)))
  (if @exit-on-exit?
    (System/exit status)
    (not-exit status)))

(defn fail
  "Prints values (at least one is required) to stderr using println then exits the JVM process with
  the status code 1. (Unless exit-on-fail? is false, in which case it throws instead; this is
  useful for testing.)"
  [& vs]
  {:pre [(seq vs)]}
  (binding [*out* *err*]
    (apply println vs))
  (if @exit-on-fail?
    (System/exit 1)
    (not-exit 1)))
