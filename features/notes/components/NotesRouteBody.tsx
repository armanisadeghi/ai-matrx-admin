"use client";

// Route-level switch for the /notes tree: most segments ([id], bare /notes)
// are handled entirely by <NotesView /> reading the [id] param itself, so
// their page.tsx files are empty placeholders and get hidden here. The
// /notes/[id]/diff segment is a real standalone page (NoteVersionDiffPage) —
// it must render instead of NotesView, not sit behind it in a display:none
// div. Add future non-NotesView /notes/[id]/<segment> pages to
// STANDALONE_SUFFIXES and static /notes/<segment> pages to STANDALONE_SEGMENTS.

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isRfc4122Uuid } from "@ai-matrx/kit/uuid";
import type { NotesShellLayouts } from "./notesShellLayout";

// Split at the route condition (code-splitting Method A): the workspace's code
// loads only where it renders. Under a standalone page (/notes/speed-test,
// /notes/[id]/diff) the layout used to ship the whole workspace bundle anyway
// (~10 MB of dev JS on the empty page, 2026-10-18 census). SSR stays on, so
// /notes and /notes/[id] still paint from the server HTML.
const NotesView = dynamic(() => import("./NotesView").then((m) => m.NotesView), {
  loading: () => null,
});

const STANDALONE_SUFFIXES = ["/diff"];
/** Static siblings of `[id]` that are their own page: the workspace (and every
 *  read it makes — list, assists, realtime) never mounts under them. */
const STANDALONE_SEGMENTS = ["speed-test"];

export function NotesRouteBody({
  children,
  sidebarLayouts,
}: {
  children: React.ReactNode;
  sidebarLayouts?: NotesShellLayouts;
}) {
  const pathname = usePathname();
  const firstSegment = pathname?.split("/")[2] ?? "";
  // A /notes/<segment> that is not a note id (e.g. /notes/history) is not a
  // note: the [id] page answers it with the notes not-found. Mounting the
  // workspace would open a tab for "history" and throw on the identity source.
  const isNotANoteId = firstSegment !== "" && !isRfc4122Uuid(firstSegment);
  const isStandaloneRoute =
    isNotANoteId ||
    STANDALONE_SEGMENTS.includes(firstSegment) ||
    STANDALONE_SUFFIXES.some((suffix) => pathname?.endsWith(suffix));

  if (isStandaloneRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <NotesView className="h-full" sidebarLayouts={sidebarLayouts} config={{ frameSidebar: true }} />
      <div style={{ display: "none" }}>{children}</div>
    </>
  );
}
