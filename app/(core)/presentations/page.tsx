"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { FileScope } from "@/features/file-actions/FileScopeBar";
import { PRESENTATION_ADAPTER } from "@/features/file-actions/adapters";
import { FileHome } from "@/features/file-actions/home/FileHome";
import { PRESENTATION_HOME } from "@/features/file-actions/home/home-kinds";
import { BlankTile, StartBand } from "@/features/file-actions/home/StartBand";
import { useHomeTemplates } from "@/features/templates/files/components/HomeTemplates";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { toast } from "@/lib/toast";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { isServiceFailure } from "@/features/data-tables/types";
import {
  createPresentation,
  listAccessiblePresentations,
  listTrashedPresentations,
  type PresentationRow,
} from "@/features/presentations/presentation-service";
import { DeckFirstSlide } from "@/features/presentations/components/DeckFirstSlide";

const SOURCE_LABEL: Record<string, string> = {
  created: "Created",
  template: "Template",
  chat: "From chat",
  copy: "Copy",
  imported: "Imported",
};

/**
 * `/presentations` — Google Slides' home, on the shared `FileHome` (the Workbooks and Documents
 * homes are the same component set). Cards show each deck's real first slide.
 */
export default function PresentationsHomePage() {
  const router = useRouter();
  const [rows, setRows] = useState<PresentationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<FileScope>("all");
  const homeTemplates = useHomeTemplates("presentation");

  const reload = useCallback(async () => {
    setLoading(true);
    const res = scope === "trash" ? await listTrashedPresentations() : await listAccessiblePresentations();
    if (isServiceFailure(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setRows(res.data);
    setError(null);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const organizationId = await ensureOrgId(null);
      const res = await createPresentation({ organizationId });
      if (isServiceFailure(res)) throw new Error(res.error);
      router.push(`/presentations/${res.data.id}`);
    } catch (err) {
      setCreating(false);
      toast.error("Could not create the presentation", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <FileHome<PresentationRow>
      kind={PRESENTATION_HOME}
      adapter={PRESENTATION_ADAPTER}
      rows={rows}
      toItem={(p) => ({
        row: p,
        id: p.id,
        name: p.name,
        description: p.description,
        ownerId: p.user_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        updatedBy: p.updated_by,
        sourceLabel: SOURCE_LABEL[p.source] ?? p.source,
      })}
      loading={loading}
      error={error}
      scope={scope}
      onScopeChange={setScope}
      reload={reload}
      viewPrefsKey="presentations-hub"
      thumbFor={(p) => <DeckFirstSlide deck={p.deck} className="aspect-[4/3] w-full border-b border-border p-[6%]" />}
      header={<RouteHeader left={<span className="px-1.5 text-sm font-medium text-foreground">Presentations</span>} />}
      startBand={
        <StartBand
          kind={PRESENTATION_HOME}
          blank={<BlankTile shape="slide" onCreate={() => void handleCreate()} creating={creating} />}
          {...homeTemplates}
        />
      }
    />
  );
}
