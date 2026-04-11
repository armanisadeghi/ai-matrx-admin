// app/(ssr)/ssr/notes-v2/layout.tsx
// Test route for the 6-layer notes architecture.
// Uses NotesView (Redux-only, zero prop drilling).
// Does NOT affect the production /ssr/notes route.

import "@/app/(ssr)/ssr/notes/notes.css";
import { NotesView } from "@/features/notes/components/NotesView";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/notes", {
  titlePrefix: "v2",
  title: "Notes",
  description: "SSR test route for the 6-layer notes architecture",
  letter: "Nv",
});

export default function NotesV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="notes-root h-full overflow-hidden relative z-0"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      <span className="shell-hide-dock" aria-hidden="true" />
      <NotesView className="h-full" />
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
}
