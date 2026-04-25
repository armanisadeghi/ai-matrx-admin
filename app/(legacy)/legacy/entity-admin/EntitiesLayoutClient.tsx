"use client";

// EntityPack wrapper removed during entity-isolation Phase 3 — the
// `(legacy)/layout.tsx` group layout now mounts EntityProviders (which
// includes EntityPack) for the whole legacy branch.
export default function EntitiesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
