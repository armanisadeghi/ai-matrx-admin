"use client";

/**
 * ProjectPeek — quick read-only preview for a ctx_projects row, on THE peek.
 * The description is drawn as markdown (`markdown: true`, RichContent "standard"). A project's full
 * route is org-scoped; `peekHref` / the registry answer, and no destination means no doors.
 */

import React from "react";
import { FolderKanban } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { projectsDb } from "@/utils/supabase/projectsDb";
import { peekHref } from "../peekHref";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

interface ProjectRow {
  name: string | null;
  description: string | null;
  created_at: string | null;
}

export default function ProjectPeek({ id, open, onClose }: PeekProps) {
  const [row, setRow] = React.useState<ProjectRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "project", id, href: peekHref("project", id), onClose });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await projectsDb(supabase)
        .from("projects")
        .select("name, description, created_at")
        .is("deleted_at", null)
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as ProjectRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const body: PeekBlock[] = [];
  if (row) {
    body.push(
      row.description
        ? { section: "Description", text: row.description, markdown: true }
        : { section: "Description", text: "—" },
    );
    body.push({ property: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "—" });
    body.push({ part: "custom-fields", token: "project", id });
  } else if (!loading) {
    body.push({ fact: "Project not found." });
  }

  const title = row?.name || "Project";
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: "Project", id, title, glyph: FolderKanban, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
