// Which builds use the Turbopack persistent build cache kept in S3 (scripts/build-cache.mjs).
// THE SWITCH IS THIS CONSTANT (repo rule: toggles are constants, env vars are values).
// To turn a project on/off, edit BUILD_CACHE_PROFILES and release. One-build overrides go in the
// release commit message: [cold-build] (compile fresh, then store a fresh cache) or [no-cache]
// (this build neither reads nor writes the cache).
// OFF (2026-10-11): on Vercel the demos builds restored 13 GB in ~150 s but still compiled in
// 7.5-8.4 min (cold ~4-5) — the restored cache was not reused there (it is locally: 12.2 min → 41 s).
// Cause under investigation (per-build values reaching the compile?). Re-enable only after a
// Vercel build shows a warm compile.
const BUILD_CACHE_PROFILES = new Set([]);
// Minutes between saves. Restores happen every build; a save (pack + upload) only when the stored
// cache is older than this, so most of ~50 daily releases skip the upload entirely.
const BUILD_CACHE_SAVE_EVERY_MIN = 120;

// THE SANDBOX STYLESHEET IS REBUILT AT MOST ONCE A DAY ON VERCEL (Arman, 2026-10-11).
// public/kind-sandbox.css is Tailwind compiled over the WHOLE app (sandbox.css imports
// app/globals.css), ~6 s per build. On Vercel the build reuses the stylesheet stored in S3 when it is
// younger than SANDBOX_CSS_REUSE_HOURS AND its own source files (sandbox.css, app/globals.css) are
// byte-identical. THE ONE CONSEQUENCE: a Tailwind class used for the first time since the stored
// stylesheet was built is NOT styled inside sandboxed shapes until the next daily rebuild. Every build
// prints a "[kind-sandbox-css] REUSED …" or "BUILT …" line naming the stored build's time and commit.
// Force a rebuild for one release: [cold-build] or [fresh-css] in the release commit message.
// Local builds and `pnpm build:kind-sandbox` always rebuild.
const SANDBOX_CSS_REUSE_HOURS = 24;

// SATELLITE SITES (admin, demos, lab) on a `release-all:` release build only when one of their own
// route-group pages changed since their last build, or that build is older than
// SATELLITE_MAX_AGE_MIN — so shared code reaches them within the hour (Arman, 2026-10-11).
// `release-admin:` / `release-demos:` / `release-lab:` always build that site; `[all-sites]` in a
// release-all message builds every site. Main (aimatrx.com) is never affected.
const SATELLITE_MAX_AGE_MIN = 60;
const SATELLITE_OWN_PATHS = { admin: ["app/(admin)"], demos: ["app/(dev)"], lab: ["app/(lab)"] };

function sandboxCssDecision(env = process.env) {
  const msg = env.VERCEL_GIT_COMMIT_MESSAGE || "";
  const reuse = Boolean(env.VERCEL) && !/\[(cold-build|fresh-css|no-cache)\]/.test(msg);
  return { reuse, maxAgeHours: SANDBOX_CSS_REUSE_HOURS };
}

function buildCacheDecision(env = process.env, profiles = BUILD_CACHE_PROFILES) {
  const msg = env.VERCEL_GIT_COMMIT_MESSAGE || "";
  const profile = env.MATRX_PROFILE || "full";
  const forced = env.MATRX_BUILD_CACHE_FORCE_PROFILE === profile; // lab measurement only
  const on = (Boolean(env.VERCEL) || forced) && profiles.has(profile) && !msg.includes("[no-cache]");
  return { on, cold: msg.includes("[cold-build]"), profile, saveEveryMin: BUILD_CACHE_SAVE_EVERY_MIN };
}

module.exports = {
  BUILD_CACHE_PROFILES,
  BUILD_CACHE_SAVE_EVERY_MIN,
  buildCacheDecision,
  SANDBOX_CSS_REUSE_HOURS,
  sandboxCssDecision,
  SATELLITE_MAX_AGE_MIN,
  SATELLITE_OWN_PATHS,
};
