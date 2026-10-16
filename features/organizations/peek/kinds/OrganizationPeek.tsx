// record-view: none — organization is a System table, which takes no custom fields
"use client";

/**
 * OrganizationPeek — quick read-only preview of an organization, on THE peek.
 *
 * The door comes from the entity registry (`/organizations/<id>`) — never hard-code the route here.
 * Orgs are named constantly in the admin consoles (exposure audit, accounts, activity log, sharing),
 * where the reader's question is "wait, which org is that?" — exactly what a peek answers.
 * The description is drawn as markdown (`markdown: true`).
 */

import React from "react";
import { Building2 } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface OrganizationRow {
  name: string | null;
  slug: string | null;
  description: string | null;
  created_at: string | null;
}

export default function OrganizationPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<OrganizationRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "organization", id, onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .schema("iam")
        .from("organizations")
        .select("name, slug, description, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as OrganizationRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    if (row.slug) body.push({ property: "Slug", value: row.slug });
    body.push(
      row.description
        ? { section: "Description", text: row.description, markdown: true }
        : { section: "Description", text: "—" },
    );
    if (row.created_at) body.push({ property: "Created", value: new Date(row.created_at).toLocaleString() });
  } else if (!loading) {
    body.push({
      fact: "This organization isn't available — it may have been deleted, or you may not have access to it.",
      wrap: true,
    });
  }

  const title = row?.name || "Organization";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Organization", id, title, glyph: Building2, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
