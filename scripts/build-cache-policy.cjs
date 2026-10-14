// Which builds use the Turbopack persistent build cache kept in S3 (scripts/build-cache.mjs).
// THE SWITCH IS THIS CONSTANT (repo rule: toggles are constants, env vars are values).
// To turn a project on/off, edit BUILD_CACHE_PROFILES and release. One-build overrides go in the
// release commit message: [cold-build] (compile fresh, then store a fresh cache) or [no-cache]
// (this build neither reads nor writes the cache).
// ON for demos (2026-10-11, second try). The first try restored 13 GB on Vercel but compiled cold:
// a per-build value (NEXT_PUBLIC_DEPLOYMENT_ID, NEXT_PUBLIC_VERCEL_*) was compiled in and invalidated
// the cache — fixed by THE BUILD-CACHE LAW (lib/deployment/build-identity.ts). Lab proof with a new
// deployment id + commit on every build: warm compiles 74 s and 47 s. VERCEL PROOF (2026-10-11, demos):
// cold build saved 3.8 GB in 17 s; the next build restored it in 14 s, compiled in 17.6 s, total
// 2.0 min (was ~7). Admin was enabled the same night. Main (slim) is paused:
// v0.4.3141 and v0.4.3142 OOM-killed the optimized compile with the restored
// cache; v0.4.3143 compiled and served from a [no-cache] release on the same
// 60 GB builder. Keep main cold until cache memory is measured and repaired.
// Demos and admin paused too (2026-10-13): the same failure reached them. v0.4.3186/3187 died
// out_of_memory with the restored cache; v0.4.3188 [cold-build] compiled and stored a fresh 7 GB
// cache; the next build to restore it (v0.4.3192) hung in the optimized compile until Vercel's
// 45-minute limit on BOTH sites. A fresh cache breaks the very next warm build, so every profile
// stays cold until the restored-cache compile is measured and repaired.
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
