"use client";

/**
 * AppletPeek — read-only quick preview for an Applet resource on THE peek (`Peek` in `PeekWindow`).
 *
 * A failed read is the design system's failed-read notice with Try again (`failure`); no row is
 * "Applet not found."; the description keeps "No description"; the date is shown; the organization's custom
 * fields ride along; Open / Open in new tab come from `useRecordPeekDoors`.
 */

import React from "react";
import { AppWindow } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { appDb } from "@/utils/supabase/appDb";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface AppletRow {
  name: string | null;
  description: string | null;
  created_at: string | null;
}

export default function AppletPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<AppletRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token: "app", id, href: peekHref("app", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await appDb(supabase)
        .from("definition")
        .select("name, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setLoadError(error ?? null);
        setRow((data as AppletRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ section: "Description", text: row.description || "No description" });
    body.push({ property: "Added", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "app", id });
  } else if (!loading && !loadError) {
    body.push({ fact: "Applet not found." });
  }

  const title = row?.name || "Applet";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: "Applet",
          id,
          title,
          glyph: AppWindow,
          body,
          ...doors,
          failure: loadError ? { what: "this Applet", error: loadError, onRetry: () => setAttempt((n) => n + 1) } : undefined,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}
