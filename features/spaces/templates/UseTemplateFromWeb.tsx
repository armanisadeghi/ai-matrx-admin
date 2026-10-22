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
// ADVERSARIAL-5 F4: nothing waits silently — every opening read (the library, the person's pages, their copies) has a
// deadline that names what it waited on, with Try again; opening the copy is checked and falls back to a full
// navigation when the router's replace is dropped. F6: a NEW attempt for a template the organization already has
// offers "Open it" (default) or "Make another copy" instead of silently making a second copy.
// ADVERSARIAL-6 F2/F3: only copies whose install is live AND whose recorded root page is live are offered "Open it"
// (opened by that recorded id, so a renamed root still opens); a removed copy (root in Trash) is offered "Restore it".

import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { LayoutTemplate } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { spaceTemplateMakes } from "@/lib/spaces-blocks/template-pack";

import { useSpaces } from "../state/SpacesProvider";
import { newAttemptId, readAttempt } from "./use-attempt";
import { installedCopies, listSpaceTemplates, USE_TEMPLATE_OPEN_DEADLINE_MS, withDeadline, type InstalledCopy } from "./use-pack";

// A page-less pack makes a board (the design-system starters): the Board gallery names and installs it.
const BoardTemplateGallery = dynamic(
  () => import("@/features/board/templates/BoardTemplateGallery").then((m) => m.BoardTemplateGallery),
  { ssr: false },
);

/** How long the router may take to leave this page for the made copy before a full navigation does it. */
const OPEN_FALLBACK_MS = 2_500;

/** The newest platform version of a catalog id, or null when the library has none. */
async function newestPlatformId(catalogueId: string): Promise<{ id: string; title: string; board: boolean } | null> {
  const all = await withDeadline(listSpaceTemplates(null), USE_TEMPLATE_OPEN_DEADLINE_MS, "The template library did not answer.");
  const card = all.filter((c) => c.catalogue_id === catalogueId && c.scope === "platform").sort((a, b) => b.version - a.version)[0];
  return card ? { id: card.id, title: card.space.title, board: spaceTemplateMakes(card.space) === "board" } : null;
}

/** The organization's copies, and its active organization (the one a new copy goes to). */
async function copiesHere(catalogueId: string): Promise<{ orgId: string; copies: InstalledCopy[] }> {
  // org-filter: write-target — "you already have this" asks about the organization a new copy would be made in.
  const orgId = await ensureOrgId(null);
  const copies = await withDeadline(installedCopies(orgId, catalogueId), USE_TEMPLATE_OPEN_DEADLINE_MS, "Your copies of this template did not load.");
  return { orgId, copies };
}

const copiesLine = (copies: InstalledCopy[]) => {
  const newest = copies[0];
  if (newest.trashed) return copies.length === 1 ? `Version ${newest.version}` : `${copies.length} copies, newest on version ${newest.version}`;
  const head = copies.length === 1 ? `Your copy is on version ${newest.version}` : `${copies.length} copies, newest on version ${newest.version}`;
  return newest.newerVersion ? `${head} · version ${newest.newerVersion} is out` : head;
};

/** The copies to offer: the live ones when there are any ("Open it"), else the ones in Trash ("Restore it"). */
export const offeredCopies = (copies: InstalledCopy[]) => {
  const live = copies.filter((c) => !c.trashed && !c.resuming);
  if (live.length) return live;
  // A removal that stopped part way is offered before a finished one: "Finish removing", never stranded.
  const resuming = copies.filter((c) => c.resuming);
  return resuming.length ? resuming : copies;
};

export function UseTemplateFromWeb() {
  const params = useSearchParams();
  const catalogueId = params?.get("template") ?? "";
  const attemptId = params?.get("attempt") ?? "";
  const router = useRouter();
  const { packs, ready, retryLoad, restoreSpace, archiveSpace } = useSpaces();
  // The copy this attempt already made (a refresh after it finished, or a run that just answered).
  const [madeRoot, setMadeRoot] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
  const [template, setTemplate] = useState<{ id: string; title: string; board: boolean } | null | undefined>(undefined);
  const [readNonce, setReadNonce] = useState(0);
  const [boardOpen, setBoardOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  // The opening has taken longer than its deadline (the person's pages have not loaded): said, with Try again.
  const [slow, setSlow] = useState(false);
  // F6: the organization's earlier copies — undefined while asked, [] when none (or the person chose another copy).
  const [existing, setExisting] = useState<{ orgId: string; copies: InstalledCopy[] } | null | undefined>(undefined);
  const [opening, setOpening] = useState(false);

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
  }, [catalogueId, readNonce]);

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

  // The person's pages must load before anything is made: past the deadline the screen says so (never "Adding…" forever).
  useEffect(() => {
    if (ready || attempted) return;
    const timer = setTimeout(() => setSlow(true), USE_TEMPLATE_OPEN_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [ready, attempted]);

  /** Leaves for the copy; when the router's replace is dropped (ADVERSARIAL-5 F4b), a full navigation does it. */
  const openCopy = (root: string) => {
    const href = `/spaces/${root}`;
    router.replace(href);
    setTimeout(() => {
      if (window.location.pathname.startsWith("/spaces/use-template")) window.location.assign(href);
    }, OPEN_FALLBACK_MS);
  };
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

  // F6: a NEW attempt (nothing recorded under it yet) first asks whether the organization already has this template.
  useEffect(() => {
    if (!template || template.board || !ready || !attemptId || existing !== undefined) return;
    // An attempt already under way (a refresh, a resume) never asks: it continues its own copy.
    const known = !!readAttempt(attemptId);
    let live = true;
    (known ? Promise.resolve(null) : copiesHere(catalogueId).then((found) => (found.copies.length ? { ...found, copies: offeredCopies(found.copies) } : null))).then(
      (found) => live && setExisting(found),
      (e: unknown) => {
        if (!live) return;
        // The check is an offer, never a gate: said in the console, and the install goes ahead as asked.
        console.warn("[spaces] could not check for an earlier copy of this template; making a new one.", e);
        setExisting(null);
      },
    );
    return () => {
      live = false;
    };
  }, [template, ready, attemptId, existing, catalogueId]);

  useEffect(() => {
    if (!template || template.board || !ready || attempted || !attemptId || existing !== null) return;
    setAttempted(true);
    const earlier = readAttempt(attemptId);
    if (earlier?.done && earlier.root) {
      // This link already made its copy: open it, never install again.
      setMadeRoot(earlier.root);
      openCopy(earlier.root);
      return;
    }
    install(template.id);
  }, [template, ready, attempted, attemptId, packs, existing]);

  const openExisting = async (found: { orgId: string; copies: InstalledCopy[] }) => {
    setOpening(true);
    setError(null);
    try {
      // The root the copy recorded (template-copy.ts), never a title guess: a renamed root opens the same.
      const newest = found.copies[0];
      // A removal that stopped part way continues the same door from where it stopped (same progress toast), then the
      // screen reads the copies again: the finished removal is offered as "Restore it".
      if (newest.resuming) {
        await archiveSpace(newest.root);
        const again = await copiesHere(catalogueId);
        setExisting(again.copies.length ? { ...again, copies: offeredCopies(again.copies) } : null);
        return;
      }
      // A removed copy comes back whole first: its tables, views and assistant, and its pages out of Trash.
      if (newest.trashed) await restoreSpace(newest.root);
      setMadeRoot(newest.root);
      openCopy(newest.root);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't open your copy.");
    } finally {
      if (mounted.current) setOpening(false);
    }
  };
  const tryAgain = () => {
    setError(null);
    setSlow(false);
    if (template === undefined) return setReadNonce((n) => n + 1);
    if (!ready) return retryLoad();
    if (template) install(template.id);
  };

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
  if (existing && !attempted && !madeRoot)
    return (
      <div className="pt-16" data-use-template={catalogueId} data-use-template-existing="">
        <EmptyState
          icon={<LayoutTemplate size={20} />}
          title={
            existing.copies[0]?.resuming
              ? `Removing ${template?.title ?? "this template"} did not finish`
              : existing.copies[0]?.trashed
                ? `${template?.title ?? "This template"} is in your Trash`
                : `You already have ${template?.title ?? "this template"}`
          }
          line={error ?? copiesLine(existing.copies)}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" autoFocus disabled={opening} onClick={() => void openExisting(existing)} data-testid="use-template-open-existing">
                {existing.copies[0]?.resuming ? (opening ? "Finishing…" : "Finish removing") : existing.copies[0]?.trashed ? (opening ? "Restoring…" : "Restore it") : opening ? "Opening…" : "Open it"}
              </Button>
              <Button variant="outline" disabled={opening} onClick={() => setExisting(null)} data-testid="use-template-make-another">
                Make another copy
              </Button>
            </div>
          }
        />
      </div>
    );
  // What the opening waits on, said once it is past its deadline (or failed): never a silent "Adding…".
  const waitingOn = error ?? (slow && !ready && !attempted ? "Your pages have not loaded yet." : null);
  const busy = !waitingOn && (running || !!packs.stage || !attempted);
  return (
    <div className="pt-16" data-use-template={catalogueId}>
      <EmptyState
        icon={<LayoutTemplate size={20} />}
        title={template ? template.title : "Opening the template"}
        line={waitingOn ?? packs.stage ?? undefined}
        action={
          madeRoot ? (
            <Button variant="primary" onClick={() => openCopy(madeRoot)} data-testid="use-template-open">
              Open
            </Button>
          ) : (
            <Button variant="primary" disabled={busy || (!!waitingOn && running)} onClick={tryAgain} data-testid="use-template-again">
              {busy ? "Adding…" : "Try again"}
            </Button>
          )
        }
      />
    </div>
  );
}
