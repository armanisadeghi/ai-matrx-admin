"use client";

// features/spaces/embed/SpaceWidget.tsx — a Space page as a launchpad widget (custom-experience §5.6: Spaces
// as a Notion-like text area). The fence's door for it, beside RecordBodySpace:
//   • `SpaceWidgetBody` draws the page in the SAME editor a row's body page uses (RecordBodySpaceImpl: the
//     Spaces editor, SpacesProvider, autosave with compare-and-swap on the page's version) — never a fork;
//   • `SpacePagePicker` chooses the page through the store's own search ("" = recently edited).
// BUILD GRAPH (code-splitting Method B): this shell is cheap — ONE next/dynamic edge to the same
// RecordBodySpaceImpl chunk the row body loads; the editor never enters a launchpad without a Space widget.

import { ErrorNotice } from "@ai-matrx/design-system";
import { RegionSkeleton, Select } from "@ai-matrx/design-system/controls";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { createDatabaseSpacesStore } from "../store-db/create-store";

const SpaceEditorImpl = dynamic(() => import("./RecordBodySpaceImpl"), {
  ssr: false,
  loading: () => <RegionSkeleton shape="rows" count={4} aria-label="Loading the page" />,
});

/** The slot key the editor keeps a settled height under (one per page drawn as a widget). */
export const spaceWidgetSlot = (spaceId: string): string => `space-widget:${spaceId}`;

/** `client`: the session the page reads as (default: the app's); the Applet host passes its visitor's. */
export function SpaceWidgetBody({ spaceId, readOnly, client }: { spaceId: string; readOnly: boolean; client?: SupabaseClient<Database> }) {
  return (
    <SpaceEditorImpl
      spaceId={spaceId}
      client={client}
      recordId={spaceWidgetSlot(spaceId)}
      readOnly={readOnly}
      fallback={<ErrorNotice title="This page is gone or not shared with you" size="inline" />}
    />
  );
}

/** Choose one of the person's Space pages (every organization they reach; the store's own search). */
export function SpacePagePicker({ value, onChange }: { value: string; onChange: (spaceId: string, title: string) => void }) {
  const [state, setState] = useState<{ hits: { value: string; label: string }[] | null; error: string | null }>({ hits: null, error: null });
  useEffect(() => {
    let live = true;
    // Reads never depend on the organization (live-store.ts); only a new top-level page does.
    createDatabaseSpacesStore("")
      .search("", 100)
      .then(
        (hits) => live && setState({ hits: hits.map((h) => ({ value: h.id, label: h.title || "Untitled" })), error: null }),
        (e: unknown) => live && setState({ hits: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      live = false;
    };
  }, []);
  if (state.error) return <ErrorNotice title="Your pages could not be read" message={state.error} size="inline" />;
  if (state.hits && state.hits.length === 0) return <span className="text-xs text-muted-foreground">No pages yet</span>;
  const hits = state.hits ?? [];
  const options = value && !hits.some((h) => h.value === value) ? [{ value, label: "Current page" }, ...hits] : hits;
  return (
    <Select
      aria-label="Page"
      value={value}
      disabled={!state.hits}
      options={state.hits ? options : [{ value, label: "Loading pages" }]}
      onValueChange={(id) => onChange(id, hits.find((h) => h.value === id)?.label ?? "")}
    />
  );
}
