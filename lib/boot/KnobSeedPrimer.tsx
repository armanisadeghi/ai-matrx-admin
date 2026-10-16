"use client";

// lib/boot/KnobSeedPrimer.tsx — receives the (core) layout's STREAMED knob snapshot and installs it
// (`primeKnobSnapshot`), so the boot's settings readers make no `knob_snapshot_delta` request.
// Rendered inside a `<Suspense fallback={null}>`: it paints nothing and never holds the page.

import { use } from "react";
import { primeKnobSnapshot } from "@/lib/scoped-config/effectiveKnobs";
import type { KnobSnapshotSeed } from "./coreBootSeedShape";

const primed = new WeakSet<Promise<KnobSnapshotSeed | null>>();

export function KnobSeedPrimer({ seed }: { seed: Promise<KnobSnapshotSeed | null> }) {
  const value = use(seed);
  if (value && !primed.has(seed)) {
    primed.add(seed);
    primeKnobSnapshot(value);
  }
  return null;
}
