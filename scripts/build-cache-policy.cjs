// Which builds use the Turbopack persistent build cache kept in S3 (scripts/build-cache.mjs).
// THE SWITCH IS THIS CONSTANT (repo rule: toggles are constants, env vars are values).
// To turn a project on/off, edit BUILD_CACHE_PROFILES and release. One-build overrides go in the
// release commit message: [cold-build] (compile fresh, then store a fresh cache) or [no-cache]
// (this build neither reads nor writes the cache).
const BUILD_CACHE_PROFILES = new Set(["demos"]);
// Minutes between saves. Restores happen every build; a save (pack + upload) only when the stored
// cache is older than this, so most of ~50 daily releases skip the upload entirely.
const BUILD_CACHE_SAVE_EVERY_MIN = 120;

function buildCacheDecision(env = process.env) {
  const msg = env.VERCEL_GIT_COMMIT_MESSAGE || "";
  const profile = env.MATRX_PROFILE || "full";
  const forced = env.MATRX_BUILD_CACHE_FORCE_PROFILE === profile; // lab measurement only
  const on = (Boolean(env.VERCEL) || forced) && BUILD_CACHE_PROFILES.has(profile) && !msg.includes("[no-cache]");
  return { on, cold: msg.includes("[cold-build]"), profile, saveEveryMin: BUILD_CACHE_SAVE_EVERY_MIN };
}

module.exports = { BUILD_CACHE_PROFILES, BUILD_CACHE_SAVE_EVERY_MIN, buildCacheDecision };
