"use client";

/**
 * SandboxPeek — read-only preview of a sandbox_instances row, on THE peek.
 * Columns used: sandbox_id (title), status, tier, created_at. No name column exists; sandbox_id is the
 * nearest human-readable identifier.
 */

import React from "react";
import { Terminal } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface SandboxRow {
  sandbox_id: string | null;
  status: string | null;
  tier: string | null;
  created_at: string | null;
}

export default function SandboxPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<SandboxRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "sandbox_instance", id, href: peekHref("sandbox_instance", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sandbox_instances")
        .select("sandbox_id, status, tier, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as SandboxRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push({ property: "Status", value: row.status ?? "—" });
    body.push({ property: "Tier", value: row.tier ?? "—" });
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "sandbox_instance", id });
  } else if (!loading) {
    body.push({ fact: "Sandbox not found." });
  }

  const title = row?.sandbox_id ?? "Sandbox";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Sandbox", id, title, glyph: Terminal, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
