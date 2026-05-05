// Inline <script> that runs before React hydrates. Last line of defense for
// stale tabs after a Vercel deploy: if a chunk request 404s during initial
// page load — before any React error boundary mounts — this listener catches
// the global error event and reloads the page. Once React boots, the
// app-level boundaries (global-error.tsx + ErrorBoundaryView) take over.
//
// Why inline / pre-hydration: ChunkLoadError can fire during the very first
// chunk fetch, which means React itself hasn't mounted yet, so no `error.tsx`
// or `global-error.tsx` boundary exists to catch it. The browser's `error`
// event is the only hook available at that moment.
//
// This script is intentionally tiny and dependency-free — it must never
// itself depend on a chunk.

const SCRIPT = `(function(){
  try {
    var KEY = "chunk-load-recovery:last-reload";
    var GUARD_MS = 30000;
    function isChunkErr(msg) {
      if (!msg) return false;
      msg = String(msg);
      return /ChunkLoadError/i.test(msg)
        || /Loading chunk [\\w-]+ failed/i.test(msg)
        || /Failed to load chunk/i.test(msg)
        || /Failed to fetch dynamically imported module/i.test(msg)
        || /Importing a module script failed/i.test(msg);
    }
    function maybeReload(msg) {
      if (!isChunkErr(msg)) return;
      try {
        var last = Number(sessionStorage.getItem(KEY) || 0);
        var now = Date.now();
        if (last && now - last < GUARD_MS) return;
        sessionStorage.setItem(KEY, String(now));
      } catch (e) { /* private mode etc. — fall through */ }
      location.reload();
    }
    window.addEventListener("error", function(ev) {
      var msg = ev && (ev.message || (ev.error && ev.error.message));
      var name = ev && ev.error && ev.error.name;
      maybeReload(name === "ChunkLoadError" ? name : msg);
    });
    window.addEventListener("unhandledrejection", function(ev) {
      var r = ev && ev.reason;
      if (!r) return;
      var msg = typeof r === "string" ? r : (r.message || "");
      var name = r && r.name;
      maybeReload(name === "ChunkLoadError" ? name : msg);
    });
  } catch (e) { /* never break the page */ }
})();`;

export function ChunkRecoveryBootScript() {
  return (
    <script
      // Runs synchronously before any chunked JS so we catch errors from the
      // very first chunk fetch. dangerouslySetInnerHTML is intentional: this
      // is a static, vetted string with no user-controlled interpolation.
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
