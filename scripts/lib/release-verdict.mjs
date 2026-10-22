// Post-build verdicts on the release path (Arman, 2026-10-21: nothing blocks a release; only a build
// that cannot compile stops one). A post-build check that finds a problem FAILS locally and at commit
// (write time), and on Vercel / CI / the ship.sh release path it SCREAMS and exits 0.

/** True on Vercel, in CI, or on the ship.sh release path (MATRX_RELEASE_PATH=1). */
export function isReleaseRun(env = process.env) {
  const on = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    return s !== "" && s !== "0" && s !== "false";
  };
  return on(env.VERCEL) || on(env.CI) || on(env.MATRX_RELEASE_PATH);
}

/**
 * Judge a failed post-build check. Returns the exit code to set: 1 locally, 0 on a release run
 * (after a loud banner naming the check and what it found).
 */
export function failOrScream(check, message, { env = process.env, log = console.error } = {}) {
  if (!isReleaseRun(env)) return 1;
  const bar = "!".repeat(100);
  log(`\n${bar}\nRELEASE WARNING — ${check} FAILED; the release continues (release path never blocks).\n${message}\n${bar}\n`);
  return 0;
}
