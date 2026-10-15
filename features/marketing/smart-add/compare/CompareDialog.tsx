"use client";

/**
 * Smart Add · Compare side by side — a large centered dialog (a bottom sheet on a phone), opened by
 * "Compare side by side" and by `?view=compare` (so a link opens it and Back closes it).
 *
 * ONE comparison at a time: only slots where 2+ unsettled candidates compete (compareSlots.ts), the
 * likeliest first. Each card is the page's own DecisionControl (Yes / No / Other + the picker), writing
 * the same session answers as the page rows. Once every card in a comparison has an answer it moves on;
 * after the last one a short "done" state shows, then it closes.
 *
 * Modelled on Apple's account pickers and Linear's modals: one question as the title, a quiet count and
 * arrows beside it, no rules between header and body, generous cards.
 */

import { useEffect, useEffectEvent, useState } from "react";
import { BadgeCheck, Check, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, Peek, PeekHoverCard, type PeekBlock, type PeekRecord } from "@ai-matrx/design-system";
import { Button, DecisionControl, PropertyRow } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount } from "@ai-matrx/kit/format";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { isOurs, websiteHost, type Candidate, type Decision, type EvidenceItem, type Relation } from "../evidence";
import { accountHandleLine, CUSTOM_RELATION, CustomRelation, relationWayOut, useRelationKinds } from "../SmartAddExtras";
import { parseSuggestion } from "../validate/queue";
import { compareSlots, isAnswered, type CompareSlot } from "./compareSlots";

const DONE_MS = 1400;
const ADVANCE_MS = 450;

export interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  relations: Record<string, Relation>;
  /** Candidates set aside with "Other → Skip for now" (kept by the session). */
  skipped: ReadonlySet<string>;
  onSkip: (id: string, on: boolean) => void;
  onClaim: (c: Candidate, decision: "yes" | "no") => void;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  person: boolean;
  /** Sites the person typed or started from: theirs, never compared. */
  ownSites: string[];
}

export function CompareDialog(props: CompareDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(next) => (next ? null : props.onClose())}>
      <DialogContent size="xl" padding="none" showCloseButton={false} data-testid="smart-add-compare">
        {props.open ? <CompareBody {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const questionOf = (platform: string) =>
  platform === "website" ? "Which website is yours?" : `Which ${platformLabel(platform)} account is yours?`;

function CompareBody({ onClose, items, decisions, relations, skipped, onSkip, onClaim, onRelate, person, ownSites }: CompareDialogProps) {
  const { kinds, loadError, onCustom } = useRelationKinds(onRelate);
  // Answered here: stays on screen with its answer until the comparison moves on.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const keep = (id: string) => setKept((k) => (k.has(id) ? k : new Set([...k, id])));
  const state = { decisions, relations, skipped, person, ownSites };
  // Cards never jump while it is open: the order uses the answers as they were when it opened.
  const [openedWith] = useState(decisions);
  const slots = compareSlots(items, state, kept, openedWith);
  const done = (s: CompareSlot) => s.candidates.every((c) => isAnswered(c, state));
  const [at, setAt] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const current = slots.find((s) => s.platform === at) ?? slots.find((s) => !done(s)) ?? null;
  const index = current ? slots.indexOf(current) : -1;
  const allDone = slots.every(done);

  // Every card answered: on to the next open comparison, or the done state.
  const currentDone = current ? done(current) : false;
  const currentKey = current?.platform ?? null;
  const advance = useEffectEvent(() => {
    const next = slots.find((s, n) => n > index && !done(s)) ?? slots.find((s) => !done(s));
    if (next) setAt(next.platform);
    else setFinished(true);
  });
  useEffect(() => {
    if (!currentKey || !currentDone) return;
    const t = setTimeout(advance, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [currentKey, currentDone]);

  // Settled elsewhere (on the page) while open, with nothing left here: the same done state. Opened by a link
  // before the findings load, it waits for them instead of closing.
  const empty = slots.length === 0;
  const [hadSlots, setHadSlots] = useState(false);
  if (!empty && !hadSlots) setHadSlots(true);
  const showDone = finished || (allDone && !current) || empty;
  const autoClose = finished || (showDone && hadSlots);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!autoClose) return;
    const t = setTimeout(close, DONE_MS);
    return () => clearTimeout(t);
  }, [autoClose]);

  if (showDone) {
    const completed = finished || kept.size > 0;
    return (
      <div className="flex flex-col p-6 max-sm:p-4" data-testid="smart-add-compare-done">
        <div className="flex justify-end">
          <Button variant="quiet" aria-label="Close" icon={<X />} onClick={onClose} />
        </div>
        <div className="flex flex-col items-center gap-3 pb-12 pt-4 text-center">
          {completed ? (
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-6" aria-hidden />
            </span>
          ) : null}
          <DialogTitle>
            {completed ? "All compared" : "Nothing left to compare"}
          </DialogTitle>
        </div>
      </div>
    );
  }
  if (!current) return null;

  return (
    <div className="flex min-h-0 flex-col gap-6 p-6 max-sm:p-4" data-testid="smart-add-compare-row" data-platform={current.platform}>
      <header className="flex items-center gap-3">
        <PlatformMark platform={current.platform} size={24} />
        <DialogTitle className="min-w-0 flex-1">{questionOf(current.platform)}</DialogTitle>
        {slots.length > 1 ? (
          <span className="type-meta tabular-nums text-muted-foreground" data-testid="smart-add-compare-progress">
            {index + 1} of {slots.length}
          </span>
        ) : null}
        {slots.length > 1 ? (
          <span className="flex items-center">
            <Button variant="quiet" aria-label="Previous" icon={<ChevronLeft />} disabled={index <= 0} onClick={() => setAt(slots[index - 1].platform)} />
            <Button variant="quiet" aria-label="Next" icon={<ChevronRight />} disabled={index >= slots.length - 1} onClick={() => setAt(slots[index + 1].platform)} />
          </span>
        ) : null}
        <Button variant="quiet" aria-label="Close" icon={<X />} onClick={onClose} />
      </header>
      {loadError ? (
        <span className="type-secondary flex items-center gap-1 text-destructive">
          {loadError}
          <ErrorAlchemyMenu error={loadError} />
        </span>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        {current.candidates.map((c) => (
          <CandidateCard
            key={c.id}
            c={c}
            decision={decisions[c.anchor.key]}
            relation={relations[c.id] ?? null}
            kinds={kinds}
            skipped={skipped.has(c.id)}
            onClaim={(x, d) => {
              keep(x.id);
              onSkip(x.id, false);
              onClaim(x, d);
            }}
            onRelate={(x, relation) => {
              keep(x.id);
              onSkip(x.id, false);
              onRelate(x, relation);
            }}
            onCustom={async (x, label) => {
              keep(x.id);
              await onCustom(x, label);
              onSkip(x.id, false);
            }}
            onSkip={() => {
              keep(c.id);
              if (decisions[c.anchor.key]) onClaim(c, decisions[c.anchor.key] === "no" ? "no" : "yes");
              if (relations[c.id]) onRelate(c, null);
              onSkip(c.id, true);
            }}
          />
        ))}
      </section>
    </div>
  );
}

/** Logo or avatar, sized to the text block beside it (48px). */
function CandidateAvatar({ c }: { c: Candidate }) {
  if (c.platform === "website") {
    return c.iconUrl ? (
      <img src={c.iconUrl} alt="" className="size-12 shrink-0 rounded-lg object-contain" />
    ) : (
      <PlatformMark platform="website" size={48} />
    );
  }
  const initial = (c.name ?? c.handle ?? "?").replace(/^@/, "").charAt(0).toUpperCase();
  return (
    <span className="relative size-12 shrink-0">
      <Avatar className="size-12">
        <SocialImage
          door={c.profileId ? profileAvatarDoor(c.profileId) : null}
          url={c.photoUrl}
          fallback={<AvatarFallback className="type-title">{initial}</AvatarFallback>}
          className="rounded-full"
        />
      </Avatar>
      <span className="absolute -right-1 -bottom-1 rounded-md ring-2 ring-card">
        <PlatformMark platform={c.platform} size={18} />
      </span>
    </span>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  website: "Linked from the website",
  link_in_bio: "Linked from a link-in-bio page",
  social_profile: "Profile lookup",
  web_search: "Web search",
  typed: "You typed it",
};
const sentenceCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Where a candidate came from, as labelled rows (shown on hover, like the page rows). */
/** Where a candidate came from, as THE peek's record — or null when there is nothing to say. */
function candidatePeek(c: Candidate, title: string, sub: string): PeekRecord | null {
  const src = c.anchor.source;
  const page = src.url && /^https?:\/\//i.test(src.url) ? src.url : null;
  const weThink = parseSuggestion(c.anchor.suggestion);
  const reasons = c.certaintyReasons?.filter(Boolean) ?? [];
  const body: PeekBlock[] = [];
  if (SOURCE_LABEL[src.kind]) body.push({ property: "Found by", value: SOURCE_LABEL[src.kind]! });
  if (page) body.push({ property: "Page", value: page.replace(/^https?:\/\/(www\.)?/i, ""), href: page });
  if (c.certainty) body.push({ property: "Certainty", value: sentenceCase(String(c.certainty)) });
  if (reasons.length) body.push({ property: "Reason", value: reasons.join(" ") });
  if (weThink?.reason) body.push({ property: "We think", value: weThink.reason });
  if (!body.length) return null;
  return {
    kind: "Candidate",
    id: c.id,
    title,
    ...(sub ? { subtitle: sub } : {}),
    body,
    copyData: { name: title, about: sub, foundBy: SOURCE_LABEL[src.kind] ?? null, page, certainty: c.certainty ?? null, reasons, weThink: weThink?.reason ?? null },
  };
}

/** One candidate: who it is (hover for where it came from), Open, and the page's Yes / No / Other. */
function CandidateCard({
  c,
  decision,
  relation,
  kinds,
  skipped,
  onClaim,
  onRelate,
  onCustom,
  onSkip,
}: {
  c: Candidate;
  decision: Decision | undefined;
  relation: Relation | null;
  kinds: BrandRelationKind[];
  skipped: boolean;
  onClaim: (c: Candidate, decision: "yes" | "no") => void;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  onCustom: (c: Candidate, label: string) => Promise<void>;
  onSkip: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const ours = isOurs(decision);
  const rejected = decision === "no";
  // "We think" glows one answer until the person answers; it never answers for them.
  const weThink = decision || relation ? null : parseSuggestion(c.anchor.suggestion);
  const suggested = !weThink ? null : ["ours", "preferred", "alias"].includes(weThink.choice) ? "yes" : weThink.choice === "not_us" ? "no" : "other";
  const handleLine = c.platform === "website" ? (c.url ? websiteHost(c.url) : null) : accountHandleLine(c.platform, c.handle);
  const title = c.name ?? handleLine ?? c.anchor.value;
  const sub = [handleLine !== title ? handleLine : null, c.followers != null ? `${formatCount(c.followers)} followers` : null].filter(Boolean).join(" · ");
  const peek = candidatePeek(c, title, sub);
  const who = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <CandidateAvatar c={c} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1">
          <span className="type-title truncate">{title}</span>
          {c.verified ? <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" /> : null}
        </span>
        {sub ? <span className="type-secondary truncate text-muted-foreground">{sub}</span> : null}
        {c.bio ? <span className="type-secondary line-clamp-2 text-muted-foreground">{c.bio}</span> : null}
      </div>
    </div>
  );
  return (
    <article
      className={`flex min-w-0 flex-col gap-4 rounded-xl border p-4 transition-colors ${
        ours ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
      data-testid="smart-add-candidate"
      data-candidate={c.id}
    >
      <div className="flex min-w-0 items-start gap-2">
        {peek ? (
          <PeekHoverCard side="bottom" align="start" trigger={who}>
            <Peek size="sm" record={peek} />
          </PeekHoverCard>
        ) : (
          who
        )}
        {c.url ? (
          <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open">
            <OutboundLink href={/^https?:\/\//i.test(c.url) ? c.url : `https://${c.url}`} />
          </Button>
        ) : null}
      </div>
      <DecisionControl
        value={ours ? "yes" : rejected ? "no" : relation || skipped ? "other" : null}
        suggested={suggested}
        onChange={(a) => onClaim(c, a)}
        wayOut={relationWayOut(kinds)}
        wayOutValue={relation ? `rel:${relation.key}` : null}
        onWayOut={(v) => {
          if (v === CUSTOM_RELATION) return setCustom(true);
          const k = kinds.find((x) => `rel:${x.key}` === v);
          if (k) onRelate(c, { key: k.key, label: k.label, routesTo: k.routesTo });
        }}
        onSkip={onSkip}
        skipped={skipped}
      />
      {custom ? (
        <CustomRelation
          onCancel={() => setCustom(false)}
          onSave={async (label) => {
            await onCustom(c, label);
            setCustom(false);
          }}
        />
      ) : null}
    </article>
  );
}
