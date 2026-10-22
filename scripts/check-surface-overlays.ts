/**
 * Surface OVERLAY COVERAGE check.
 *
 * `check:surface-drift` validates manifests against themselves and
 * `check:surface-routes` discovers route leaves. Neither can see an overlay,
 * window, modal, sheet, or widget registered in the canonical overlay union
 * without a Surface manifest.
 *
 * Missing declarations are the P12 campaign backlog, so they are reported
 * loudly without failing. A manifest pointing at an unknown overlay id, or
 * two manifests claiming one overlay, is unambiguous contract drift and fails.
 */

import { ALL_MANIFESTS } from "@/features/surfaces/manifests/registry";
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exitAfterDrain } from "./lib/exit-after-drain";

const manifestsByOverlay = new Map<string, string[]>();

for (const manifest of ALL_MANIFESTS) {
  if (!manifest.overlayId) continue;
  const names = manifestsByOverlay.get(manifest.overlayId) ?? [];
  names.push(manifest.surfaceName);
  manifestsByOverlay.set(manifest.overlayId, names);
}

// The catalogue's keys ARE the overlay ids; object keys cannot repeat, and
// TypeScript rejects a duplicate key in the literal, so no duplicate-id pass.
const overlayIds = new Set<string>(APP_OVERLAYS.map((d) => d.id));

// Package windows this app hosts as canvas tabs instead of overlays (the context preview,
// Quick Chat) are real window hosts too: `CANVAS_HOSTED_WINDOWS` in providers/ChatHostAdapter.tsx,
// read as text because that file is a React client module. A manifest naming one is not a phantom.
const canvasHosted = (() => {
  const adapter = readFileSync(join(process.cwd(), "providers/ChatHostAdapter.tsx"), "utf8");
  const block = adapter.match(/const CANVAS_HOSTED_WINDOWS = \{([\s\S]*?)\n\} as const/);
  if (!block) throw new Error("check-surface-overlays: CANVAS_HOSTED_WINDOWS not found in providers/ChatHostAdapter.tsx");
  return new Set([...block[1].matchAll(/^ {2}(\w+): \{/gm)].map((m) => m[1]));
})();
const missing = [...overlayIds].filter(
  (overlayId) => !manifestsByOverlay.has(overlayId),
);
const unknown = [...manifestsByOverlay.entries()].filter(
  ([overlayId]) => !overlayIds.has(overlayId) && !canvasHosted.has(overlayId),
);
const duplicates = [...manifestsByOverlay.entries()].filter(
  ([, surfaceNames]) => surfaceNames.length > 1,
);

console.log(
  `Surface overlay coverage: ${overlayIds.size} unique registered overlay ids, ${manifestsByOverlay.size} declared by manifests, ${missing.length} UNDECLARED.`,
);

if (missing.length > 0) {
  console.warn(
    `\n${missing.length} registered overlay${missing.length === 1 ? " has" : "s have"} NO Surface manifest. Each needs a completeness audit, canonical declaration, live emitter, Locate anchors, and browser-earned readiness:`,
  );
  for (const overlayId of missing) console.warn(`  - ${overlayId}`);
}

if (unknown.length > 0) {
  console.error(
    "\nPHANTOM overlay declarations: these manifests name an overlay id that is absent from APP_OVERLAYS:",
  );
  for (const [overlayId, surfaceNames] of unknown) {
    console.error(`  - ${overlayId} <- ${surfaceNames.join(", ")}`);
  }
}

if (duplicates.length > 0) {
  console.error(
    "\nDUPLICATE overlay declarations: one overlay may have only one canonical Surface manifest:",
  );
  for (const [overlayId, surfaceNames] of duplicates) {
    console.error(`  - ${overlayId} <- ${surfaceNames.join(", ")}`);
  }
}

exitAfterDrain(unknown.length > 0 || duplicates.length > 0 ? 1 : 0);
