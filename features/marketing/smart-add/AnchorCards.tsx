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
import { Check, Info, Plus, UserX, X } from "lucide-react";
import { Button, Field } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { websiteHost, type Decision, type EvidenceItem } from "./evidence";
import { accountHandleLine, OpenLink } from "./SmartAddExtras";

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

function AnchorCard({
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
  const name = a?.display_name ?? item.label ?? handle ?? item.value;
  const url = item.url ?? item.value;
  const followers = a?.followers ?? item.followers;
  const picked = answer === "me";
  const out = answer === "not_me" || answer === "namesake";
  return (
    <li
      data-testid="smart-add-anchor-card"
      className={`flex w-full flex-col gap-2 rounded-xl border bg-card p-3 transition-opacity ${
        picked ? "border-primary ring-2 ring-primary" : "border-border"
      } ${out ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {item.profile_id ? (
            <SocialImage
              door={profileAvatarDoor(item.profile_id)}
              url={item.image_url}
              fallback={<PlatformMark platform={platform} size={24} />}
              className="size-full object-cover"
            />
          ) : item.image_url ? (
            <img src={item.image_url} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <PlatformMark platform={platform} size={24} />
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <PlatformMark platform={platform} size={12} />
            <span className="truncate">
              {platformLabel(platform)}
              {handle ? ` · ${handle}` : ""}
            </span>
          </span>
          {a?.bio_line ? <span className="line-clamp-1 text-xs text-muted-foreground">{a.bio_line}</span> : null}
          <span className="text-xs text-muted-foreground">
            {[a?.location, followers != null ? `${formatCount(followers)} followers` : null].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <HoverCard openDelay={150}>
            <HoverCardTrigger asChild>
              <Button variant="quiet" icon={<Info aria-hidden />} aria-label="Why this was found" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-xs">
              <p className="font-medium text-foreground">Why this was found</p>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {(a?.reasons ?? []).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {item.hits?.length ? (
                <ul className="mt-2 space-y-0.5 text-muted-foreground">
                  {item.hits.slice(0, 4).map((h) => (
                    <li key={`${h.engine}:${h.query}:${h.rank}`}>
                      {h.engine} #{h.rank}: {h.query}
                    </li>
                  ))}
                </ul>
              ) : null}
            </HoverCardContent>
          </HoverCard>
          <OpenLink url={url} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={picked ? "primary" : "outline"}
          icon={<Check aria-hidden />}
          aria-pressed={picked}
          onClick={() => onAnswer(picked ? null : "me")}
        >
          This is me
        </Button>
        <Button
          variant="quiet"
          icon={<X aria-hidden />}
          aria-pressed={answer === "not_me"}
          onClick={() => onAnswer(answer === "not_me" ? null : "not_me")}
        >
          Not me
        </Button>
        <Button
          variant="quiet"
          icon={<UserX aria-hidden />}
          aria-pressed={answer === "namesake"}
          onClick={() => onAnswer(answer === "namesake" ? null : "namesake")}
        >
          Namesake
        </Button>
      </div>
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
}: {
  items: EvidenceItem[];
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
  const anchors = anchorItems(items);
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
