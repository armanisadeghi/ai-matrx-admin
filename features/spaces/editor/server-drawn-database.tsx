"use client";

// features/spaces/editor/server-drawn-database.tsx — a database block in a Spaces page's first paint
// (static-body.tsx): drawn with its rows on the server, kept exactly as served in the browser.

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { ResolvedBlockSeed, useAwaitedBlockSeed } from "../page/space-seed-context";
import { DatabaseLoadingBox, WithExpectedRows } from "./database-loading-box";
import { DATABASE_HOST_CLASS, DatabaseHost, activeLayout, paintedSizesOf } from "./database-host";

// The same chunk the editor's database node view loads, rendered on the server only (rows in the HTML).
const DatabaseBlock = dynamic(() => import("../data/DatabaseBlock").then((m) => m.DatabaseBlock), {
  loading: () => <div className="spaces-db-loading" />,
});

/** The server's answers for this block (its own seed, awaited inside the block's own Suspense). */
function SeededDatabase({ blockId, p }: { blockId: string; p: Record<string, unknown> }) {
  const seed = useAwaitedBlockSeed(blockId);
  return (
    <ResolvedBlockSeed blockId={blockId} seed={seed}>
      <WithExpectedRows blockId={blockId}>
        <DatabaseBlock blockId={blockId} props={p} onChange={() => undefined} editable={false} />
      </WithExpectedRows>
    </ResolvedBlockSeed>
  );
}

/** The browser's copy of a server-drawn database block: its children are never hydrated nor drawn again. */
const KEPT_AS_SERVED = { __html: "" };

/**
 * A DATABASE BLOCK IN THE FIRST PAINT IS THE SERVER'S HTML, KEPT AS IT IS (SPACES-REDRAW, 2026-10-17).
 *
 * The server draws the block with its rows (its own seed, streamed in its own Suspense). The browser used to
 * hydrate it — and could not hydrate it at once: its code (next/dynamic, then the records mount's own lazy
 * layers) and its seed arrive after the page around it, so its Suspense boundary stayed dehydrated, and React
 * throws a dehydrated boundary's HTML away the moment ANY context above it changes (the Spaces tree landing, a
 * seed landing, the room joining). Every database block then collapsed to its loading box and grew back ~2 s
 * after load, and at phone widths the page moved by its full height (CLS 0.5 at 1600 px on a fresh install).
 * The first paint is a read-only picture until the editor takes its place (SpacePage `revealWhenPainted`), so
 * the browser keeps exactly the elements the server sent: the same host element, its contents left alone
 * (`dangerouslySetInnerHTML` with nothing in it is React's "never touch what is inside" — a streamed block
 * still lands through React's own streaming script). The editor's live block, built behind it, is the one
 * people use; nothing here asks for rows in the browser.
 */
export function ServerDrawnDatabase({ blockId, p }: { blockId: string; p: Record<string, unknown> }) {
  const layout = activeLayout(p);
  if (typeof window !== "undefined")
    return <div className={DATABASE_HOST_CLASS} contentEditable={false} data-layout={layout} data-block-id={blockId} suppressHydrationWarning dangerouslySetInnerHTML={KEPT_AS_SERVED} />;
  return (
    <DatabaseHost blockId={blockId} layout={layout} painted={paintedSizesOf(p)} serverDrawn>
      <Suspense fallback={<DatabaseLoadingBox blockId={blockId} p={p} />}>
        <SeededDatabase blockId={blockId} p={p} />
      </Suspense>
    </DatabaseHost>
  );
}
