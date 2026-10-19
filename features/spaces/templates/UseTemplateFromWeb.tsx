"use client";

// features/spaces/templates/UseTemplateFromWeb.tsx — "Use this template" on a Space template's public page
// (/templates/<slug>) lands here, inside the app (/spaces/use-template?template=<catalog id>). The person's
// press was on the public page (a guest signed up on the way), so the install starts on arrival: the newest
// platform version of that template, through the same door as the Spaces gallery's "Use template"
// (SpacesProvider.packs.use: tables into the active organization, its pages made there, the root opened).
// A failure keeps the page with the reason (packs.use toasts it) and a button to try again.
// ONE COPY PER ATTEMPT (ADVERSARIAL-4 N2/N3): the visit gets an attempt id in the URL (router.replace), and the
// install runs through that attempt's record (use-attempt.ts). This page opens the made copy itself when the run
// answers (never relying on the run's own open), a refresh or restored tab resumes the same copy or opens the
// finished one, and once the attempt has a copy the button is "Open", never a second "Use template".

import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { LayoutTemplate } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSpaces } from "../state/SpacesProvider";
import { spaceTemplateMakes } from "@/lib/spaces-blocks/template-pack";
import { newAttemptId, readAttempt } from "./use-attempt";
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
  const params = useSearchParams();
  const catalogueId = params?.get("template") ?? "";
  const attemptId = params?.get("attempt") ?? "";
  const router = useRouter();
  const { packs, ready } = useSpaces();
  // The copy this attempt already made (a refresh after it finished, or a run that just answered).
  const [madeRoot, setMadeRoot] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
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
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Every visit installs under one attempt id held in the URL: a refresh keeps it, a new press on the public page
  // (no attempt in its link) gets a new one.
  useEffect(() => {
    if (!catalogueId || attemptId) return;
    router.replace(`/spaces/use-template?template=${encodeURIComponent(catalogueId)}&attempt=${newAttemptId()}`);
  }, [catalogueId, attemptId, router]);

  const openCopy = (root: string) => router.replace(`/spaces/${root}`);
  const install = (templateId: string) => {
    if (!attemptId) return;
    // A resume keeps the template version the attempt started with.
    const earlier = readAttempt(attemptId);
    setRunning(true);
    void packs.use(earlier?.templateId ?? templateId, null, { attempt: attemptId }).then((root) => {
      if (!mounted.current) return;
      setRunning(false);
      if (!root) return;
      setMadeRoot(root);
      openCopy(root);
    });
  };

  useEffect(() => {
    if (!template || template.board || !ready || attempted || !attemptId) return;
    setAttempted(true);
    const earlier = readAttempt(attemptId);
    if (earlier?.done && earlier.root) {
      // This link already made its copy: open it, never install again.
      setMadeRoot(earlier.root);
      openCopy(earlier.root);
      return;
    }
    install(template.id);
  }, [template, ready, attempted, attemptId, packs]);

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
  const busy = running || !!packs.stage || !attempted;
  return (
    <div className="pt-16" data-use-template={catalogueId}>
      <EmptyState
        icon={<LayoutTemplate size={20} />}
        title={template ? template.title : "Opening the template"}
        line={error ?? packs.stage ?? undefined}
        action={
          madeRoot ? (
            <Button variant="primary" onClick={() => openCopy(madeRoot)} data-testid="use-template-open">
              Open
            </Button>
          ) : (
            <Button variant="primary" disabled={!template || busy} onClick={() => template && install(template.id)} data-testid="use-template-again">
              {busy ? "Adding…" : "Try again"}
            </Button>
          )
        }
      />
    </div>
  );
}
