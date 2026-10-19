"use client";

// features/spaces/templates/UseTemplateFromWeb.tsx — "Use this template" on a Space template's public page
// (/templates/<slug>) lands here, inside the app (/spaces/use-template?template=<catalog id>). The person's
// press was on the public page (a guest signed up on the way), so the install starts on arrival: the newest
// platform version of that template, through the same door as the Spaces gallery's "Use template"
// (SpacesProvider.packs.use: tables into the active organization, its pages made there, the root opened).
// A failure keeps the page with the reason (packs.use toasts it) and a button to try again.

import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { LayoutTemplate } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSpaces } from "../state/SpacesProvider";
import { spaceTemplateMakes } from "@/lib/spaces-blocks/template-pack";
import { listSpaceTemplates } from "./use-pack";

// A page-less pack makes a board (the design-system starters): the Board gallery names and installs it.
const BoardTemplateGallery = dynamic(
  () => import("@/features/board/templates/BoardTemplateGallery").then((m) => m.BoardTemplateGallery),
  { ssr: false },
);

/** The newest platform version of a catalog id, or null when the library has none. */
async function newestPlatformId(catalogueId: string): Promise<{ id: string; title: string; board: boolean } | null> {
  const cards = (await listSpaceTemplates(null)).filter((c) => c.catalogue_id === catalogueId && c.scope === "platform");
  const card = cards.sort((a, b) => b.version - a.version)[0];
  return card ? { id: card.id, title: card.space.title, board: spaceTemplateMakes(card.space) === "board" } : null;
}

export function UseTemplateFromWeb() {
  const catalogueId = useSearchParams()?.get("template") ?? "";
  const { packs, ready } = useSpaces();
  const [template, setTemplate] = useState<{ id: string; title: string; board: boolean } | null | undefined>(undefined);
  const [boardOpen, setBoardOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!catalogueId) return;
    let live = true;
    newestPlatformId(catalogueId).then(
      (t) => live && setTemplate(t),
      (e: unknown) => live && setError(e instanceof Error ? e.message : "We couldn't read this template."),
    );
    return () => {
      live = false;
    };
  }, [catalogueId]);

  useEffect(() => {
    if (!template || template.board || !ready || attempted) return;
    setAttempted(true);
    void packs.use(template.id);
  }, [template, ready, attempted, packs]);

  if (!catalogueId || template === null) return <EmptyState icon={<LayoutTemplate size={20} />} title="This template is not in the library" />;
  if (template?.board)
    return (
      <div className="pt-16" data-use-template={catalogueId}>
        <EmptyState
          icon={<LayoutTemplate size={20} />}
          title={template.title}
          action={
            <Button variant="primary" onClick={() => setBoardOpen(true)} data-testid="use-template-again">
              Use template
            </Button>
          }
        />
        <BoardTemplateGallery open={boardOpen} onOpenChange={setBoardOpen} initialKey={`pack:${template.id}`} />
      </div>
    );
  const busy = !!packs.stage || !attempted;
  return (
    <div className="pt-16" data-use-template={catalogueId}>
      <EmptyState
        icon={<LayoutTemplate size={20} />}
        title={template ? template.title : "Opening the template"}
        line={error ?? packs.stage ?? undefined}
        action={
          <Button variant="primary" disabled={!template || busy} onClick={() => template && void packs.use(template.id)} data-testid="use-template-again">
            {busy ? "Adding…" : "Use template"}
          </Button>
        }
      />
    </div>
  );
}
