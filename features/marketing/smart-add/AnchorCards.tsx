"use client";

/**
 * Smart Add — "Which of these is you?" (the person branch's anchor stage; PEOPLE-AND-CREATORS §3.1, §4).
 *
 * Findings that carry `anchor` (aidream brand.identify.person_anchor_extract) become cards: the raw
 * profile photo, the exact handle, the platform, one bio line and the location, with an Open link
 * (referral params). Several can be picked. Why the rules ranked a card (reasons, queries, ranks) lives
 * in a hover card only. "Namesake" = a different person with my name (web.brand_relation_kind
 * `namesake`, kept on the exclusion list). A job, company or profile link also grounds the person (Part 9).
 */

import { useState } from "react";
import { Plus, SearchX } from "lucide-react";
import { CandidateCard } from "@ai-matrx/design-system";
import { Button, Field } from "@ai-matrx/design-system/controls";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { useCandidateImage } from "./candidateImage";
import { rankByAnchors, type PersonAnchors } from "./anchorRank";
import { websiteHost, type Decision, type EvidenceItem } from "./evidence";
import { maskOffensive } from "@/lib/text/maskOffensive";
import { accountHandleLine, outboundHref } from "./SmartAddExtras";

export type AnchorAnswer = "me" | "not_me" | "namesake";

/** Anchor candidates, best rule score first. */
export function anchorItems(items: EvidenceItem[]): EvidenceItem[] {
  return items
    .filter((i) => i.anchor && (i.field === "social" || i.field === "website"))
    .sort((a, b) => (b.anchor?.score ?? 0) - (a.anchor?.score ?? 0));
}

function answerOf(item: EvidenceItem, decisions: Record<string, Decision>, namesakes: Set<string>): AnchorAnswer | null {
  if (namesakes.has(item.key)) return "namesake";
  const d = decisions[item.key];
  if (d === "yes" || d === "preferred") return "me";
  if (d === "no") return "not_me";
  return null;
}

/** One candidate card. Also rendered by the Smart Add helper panels (./helpers), the same answers. */
export function AnchorCard({
  item,
  answer,
  onAnswer,
}: {
  item: EvidenceItem;
  answer: AnchorAnswer | null;
  onAnswer: (answer: AnchorAnswer | null) => void;
}) {
  const a = item.anchor;
  const platform = item.field === "website" ? "website" : (item.platform ?? "");
  const handle = item.field === "website" ? websiteHost(item.url ?? item.value) : accountHandleLine(item.platform, item.handle);
  // A bare number is never a name (MKT-098): the exact handle or address stands in.
  const nameOf = (v: string | null | undefined) => (v && /\p{L}/u.test(v) ? v : null);
  const name = nameOf(a?.display_name) ?? nameOf(item.label) ?? handle ?? item.value;
  const url = item.url ?? item.value;
  const followers = a?.followers ?? item.followers;
  const image = useCandidateImage(item.profile_id ? profileAvatarDoor(item.profile_id) : null, item.image_url);
  // The shared card needs a way out on every decision; here it sets the card aside (no answer), remembered while shown.
  const [skipped, setSkipped] = useState(false);
  const set = (next: AnchorAnswer | null) => {
    setSkipped(false);
    onAnswer(next);
  };
  const value = answer === "me" ? "yes" : answer === "not_me" ? "no" : answer === "namesake" || skipped ? "other" : null;
  return (
    <li data-testid="smart-add-anchor-card" data-answer={answer ?? "open"} className="flex w-full">
      <CandidateCard
        className="w-full"
        aria-label="Is this you?"
        candidate={{
          id: item.key,
          name,
          handle: handle !== name ? handle : null,
          imageUrl: image,
          mark: <PlatformMark platform={platform} size={24} />,
          followers,
          detail: [platformLabel(platform), a?.location].filter(Boolean).join(" · "),
          bio: a?.bio_line ? maskOffensive(a.bio_line) : null,
          href: outboundHref(url),
        }}
        peek={{
          kind: "Profile",
          id: item.key,
          title: name,
          subtitle: `${platformLabel(platform)}${handle ? ` · ${handle}` : ""}`,
          body: [
            ...(a?.reasons?.length ? [{ section: "Why this was found", items: a.reasons }] : []),
            ...(item.hits?.length ? [{ section: "Found in search", items: item.hits.map((h) => `${h.engine} #${h.rank}: ${h.query}`), limit: 4 }] : []),
          ],
          ...(url ? { href: url } : {}),
          copyData: { name, platform: platformLabel(platform), handle, reasons: a?.reasons ?? [], hits: item.hits ?? [] },
        }}
        value={value}
        labels={{ yes: "This is me", no: "Not me" }}
        onChange={(v) => set(v === "yes" ? (answer === "me" ? null : "me") : answer === "not_me" ? null : "not_me")}
        wayOut={[{ value: "namesake", label: "Namesake" }]}
        wayOutValue={answer === "namesake" ? "namesake" : null}
        onWayOut={(v) => v === "namesake" && set(answer === "namesake" ? null : "namesake")}
        onClear={() => set(null)}
        onSkip={() => {
          onAnswer(null);
          setSkipped(true);
        }}
        skipped={skipped && !answer}
      />
    </li>
  );
}

export function AnchorCards({
  items,
  decisions,
  namesakes,
  affiliations,
  searching,
  onAnswer,
  onAddLink,
  onAddAffiliation,
  anchors: known,
  onDigDeeper,
}: {
  items: EvidenceItem[];
  /** What is known about the person: cards carrying it rank first, other-city namesakes last. */
  anchors?: PersonAnchors;
  /** One rung down the find-you ladder; offered until a firm anchor is confirmed. */
  onDigDeeper?: () => void;
  decisions: Record<string, Decision>;
  namesakes: Set<string>;
  affiliations: string[];
  /** The anchor round is still looking. */
  searching: boolean;
  onAnswer: (item: EvidenceItem, answer: AnchorAnswer | null) => void;
  onAddLink: (url: string) => void;
  onAddAffiliation: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const anchors = rankByAnchors(anchorItems(items), known ?? {});
  const add = () => {
    const t = text.trim();
    if (!t) return;
    // A profile address (or a site) grounds by account; anything else is a job or affiliation (Part 9).
    if (/^(https?:\/\/)?[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(t)) onAddLink(t);
    else onAddAffiliation(t);
    setText("");
  };
  return (
    <section aria-label="Which of these is you?" data-testid="smart-add-anchors" className="flex w-full flex-col gap-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Which of these is you?</h2>
        {searching ? <span className="text-xs text-muted-foreground">Searching…</span> : null}
      </header>
      {anchors.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {anchors.map((i) => (
            <AnchorCard key={i.key} item={i} answer={answerOf(i, decisions, namesakes)} onAnswer={(a) => onAnswer(i, a)} />
          ))}
        </ul>
      ) : !searching ? (
        <p className="text-sm text-muted-foreground">No accounts found for this name.</p>
      ) : null}
      {onDigDeeper && !searching ? (
        <Button variant="quiet" icon={<SearchX aria-hidden />} className="self-start" onClick={onDigDeeper} data-testid="smart-add-anchor-dig-deeper">
          Not here? Dig deeper
        </Button>
      ) : null}
      {affiliations.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {affiliations.map((a) => (
            <li key={a} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground">
              {a}
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Field
          // ui-exception: a short raw value (a job, a company or a profile address)
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add your job, company, or a profile link"
          aria-label="Add your job, company, or a profile link"
          data-testid="smart-add-anchor-add"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" icon={<Plus aria-hidden />} disabled={!text.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
}
