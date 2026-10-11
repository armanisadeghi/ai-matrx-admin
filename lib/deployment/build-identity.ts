// lib/deployment/build-identity.ts
//
// WHICH DEPLOYMENT / COMMIT IS THIS PAGE? — read at RUNTIME, never baked into the bundle.
//
// THE BUILD-CACHE LAW (2026-10-11): a value that changes on every build must never be compiled
// into the code (next.config `env`, or a NEXT_PUBLIC_* variable). Turbopack treats it as an input
// of the modules that read it, so every release recompiled most of the app and the persistent
// build cache was useless: same deployment id → warm compile 78 s; a new id → 3-4.4 min (measured,
// demos profile). So the root layout (a server component, which reads process.env at REQUEST time)
// writes them into two <meta> tags, and browser code reads them here. `next build` also runs with
// Vercel's per-build NEXT_PUBLIC_VERCEL_* variables removed (scripts/next-build-stable-env.mjs).

export const BUILD_IDENTITY_META = {
  deploymentId: "matrx-deployment-id",
  commitSha: "matrx-commit-sha",
} as const;

/** Server side: the values for the <meta> tags (runtime env, not inlined). */
export function serverBuildIdentity(): { deploymentId: string; commitSha: string } {
  return {
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  };
}

function readMeta(name: string): string | null {
  if (typeof document === "undefined") return null;
  const content = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
  return content ? content : null;
}

/** The Vercel deployment id this page was served by (null locally). */
export function currentDeploymentId(): string | null {
  return typeof document === "undefined" ? process.env.VERCEL_DEPLOYMENT_ID || null : readMeta(BUILD_IDENTITY_META.deploymentId);
}

/** The git commit this page was built from (null locally). */
export function currentCommitSha(): string | null {
  return typeof document === "undefined" ? process.env.VERCEL_GIT_COMMIT_SHA || null : readMeta(BUILD_IDENTITY_META.commitSha);
}
