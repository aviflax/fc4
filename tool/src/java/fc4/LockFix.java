package fc4;

import clojure.lang.IFn;

// Copied from https://github.com/taylorwood/clojurl/commit/12b96b5e9a722b372f153436b1f6827709d0f2ab
public class LockFix {
   static public Object lock(final Object lockee, final IFn f) {
       synchronized (lockee) {
           return f.invoke();
       }
   }
}
