"use client";

/**
 * Smart Add validation — the stage (presentational; SmartAddValidate saves, the lab story feeds fixtures).
 *
 * A flagship screen built from named champions (common-docs smart-add-brand SPEC § Validation page):
 *   Tinder / Hinge  — one card, the deck faintly behind it; an answer throws the card (Yes right, No left,
 *                     Later down) on a quick spring and the next one rises into place.
 *   Apple Photos    — "Is this you?": the subject is huge (the real avatar, logo or value), one question,
 *                     big answers; a set of values is reviewed at once, each one switchable.
 *   Superhuman      — every answer has one key (Y N O L I E U, Cmd+Z), shown on the control; zero chrome.
 *   Linear triage   — the Answered tray: every answer stays one press from Undo.
 *   Duolingo        — momentum: a springy progress line, "12 left", and a finish that says what happens next.
 *
 * Grounding (where found, how sure, why, evidence, the copies folded in) lives in a hover card only.
 * A suggestion only glows; it is never chosen. The stage height is fixed: nothing moves around a new card.
 */

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useMotionValue, useTransform, type PanInfo, type Transition } from "motion/react";
import { Check, ChevronUp, ExternalLink, Globe, Info, LayoutDashboard, Pencil, RotateCcw, Users, X } from "lucide-react";
import { PANEL_MOTION_CLASS, Peek, PeekHoverCard, Skeleton, type PeekBlock } from "@ai-matrx/design-system";
import { Badge, Button, DecisionControl, Field, type WayOutItem } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount } from "@ai-matrx/kit/format";
import { useMediaQuery } from "@ai-matrx/kit/media-query";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { websiteHost } from "../evidence";
import { personNameOnPage } from "../personParty";
import { outboundHref } from "../SmartAddExtras";
import { STANCE_LABEL, STANCE_ORDER } from "../webKinds";
import { WeThinkHint } from "../WeThinkHint";
import { useLogoGroups } from "../logoGroups";
import { ANSWER_LABEL, optionsFor, type Answer, type FocusItem } from "./queue";
import { SECTION_LABEL, sectionOf } from "./fold";

export interface AnsweredEntry {
  /** Unique per answer (an item answered, undone and answered again has two). */
  id: string;
  item: FocusItem;
  answer: Answer;
  relationLabel: string | null;
  value: string;
  state: "saving" | "saved" | "failed";
  error: string | null;
}

export interface AnswerOptions {
  relationKey?: string | null;
  value?: string;
  /** A set card: the member keys switched off (they are saved as Wrong). */
  off?: string[];
}

/** "instant": answered right after the last answer: the card is gone at once, never a pile of leaving cards. */
type Throw = "yes" | "no" | "later" | "instant";

/** Quick and physical: the card leaves on a stiff spring, the next one rises on a softer one. */
const THROW: Transition = { type: "tween", duration: 0.14, ease: "easeOut" };
const RISE: Transition = { type: "spring", stiffness: 380, damping: 32 };
const FLY: Transition = { type: "spring", stiffness: 420, damping: 36 };

const cardVariants = {
  enter: { opacity: 0, y: 18, scale: 0.955 },
  center: { opacity: 1, y: 0, scale: 1, x: 0, rotate: 0, transition: RISE },
  // A card that was answered leaves at once: a fixed short tween (a spring keeps old cards on screen for
  // seconds when answers come fast) and it can no longer be clicked while it goes (MKT-131).
  exit: (dir: Throw) =>
    dir === "instant"
      ? { opacity: 0, pointerEvents: "none" as const, transition: { duration: 0 } }
      : dir === "yes"
      ? { opacity: 0, x: 160, y: -24, rotate: 7, pointerEvents: "none" as const, transition: THROW }
      : dir === "no"
        ? { opacity: 0, x: -160, y: -12, rotate: -7, pointerEvents: "none" as const, transition: THROW }
        : { opacity: 0, y: 60, scale: 0.94, pointerEvents: "none" as const, transition: THROW },
};

/** Two answers closer than this: the earlier card leaves without its throw animation (MKT-131). */
const RAPID_MS = 600;

/** How many answers the tray lists before the rest fold behind one button. */
const TRAY_LIMIT = 5;

/** Keys: one per answer, the same on every card. */
const KEY = { yes: "Y", no: "N", other: "O" } as const;

function thumbId(key: string) {
  return `validate:${key}`;
}

function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(websiteHost(url))}&sz=128`;
}

/** The finding's own image, raw — never tinted or boxed. */
function Media({ item, size }: { item: FocusItem; size: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (item.kind === "account") {
    const initial = (item.title ?? item.value).replace(/^@/, "").charAt(0).toUpperCase();
    return (
      <span className="relative shrink-0" style={style}>
        <SocialImage
          door={item.profileId ? profileAvatarDoor(item.profileId) : null}
          url={item.imageUrl}
          className="size-full rounded-full object-cover"
          fallback={
            item.platform ? (
              <span className="flex size-full items-center justify-center">
                <PlatformMark platform={item.platform} size={Math.round(size * 0.86)} />
              </span>
            ) : (
              <span className="flex size-full items-center justify-center rounded-full bg-muted font-semibold text-foreground" style={{ fontSize: size * 0.4 }}>
                {initial}
              </span>
            )
          }
        />
        {item.platform && (item.profileId || item.imageUrl) ? (
          <span className="absolute -right-0.5 -bottom-0.5 rounded-md ring-2 ring-card">
            <PlatformMark platform={item.platform} size={Math.max(14, Math.round(size * 0.3))} />
          </span>
        ) : null}
      </span>
    );
  }
  const page = item.kind === "website" || item.kind === "web" ? item.openUrl : item.fact && /^https?:\/\//i.test(item.value) ? item.value : null;
  const src = item.imageUrl ?? (page ? faviconUrl(page) : null);
  if (src && !broken) {
    return <img src={src} alt="" style={style} className="shrink-0 rounded-md object-contain" onError={() => setBroken(true)} />;
  }
  if (item.kind === "website" || item.kind === "web") {
    return (
      <span className="flex shrink-0 items-center justify-center" style={style}>
        <PlatformMark platform="website" size={Math.round(size * 0.8)} />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground"
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
    >
      {item.label.charAt(0).toUpperCase()}
    </span>
  );
}

function Thumb({ item, size }: { item: FocusItem; size: number }) {
  return (
    <motion.span layoutId={thumbId(item.key)} transition={FLY} className="inline-flex shrink-0">
      <Media item={item} size={size} />
    </motion.span>
  );
}

/** Everything that grounds a finding — in THE peek on hover, never on the page. */
function Grounding({ item }: { item: FocusItem }) {
  const body: PeekBlock[] = [];
  if (item.source) body.push({ property: "Found", value: item.source });
  if (item.certainty) body.push({ property: "Certainty", value: item.certainty });
  if (item.followers !== null && item.followers !== undefined) body.push({ property: "Followers", value: formatCount(item.followers) });
  if (item.detail) body.push({ section: item.kind === "fact" ? "Why" : "Snippet", text: item.detail, clamp: 4 });
  if (item.spellings && item.spellings.length > 1) body.push({ property: "Spelled two ways", value: item.spellings.join(" · ") });
  const copies = item.folded ?? [];
  if (copies.length) body.push({ section: "Also found as", items: copies.map((c) => (c.kind === "web" ? (c.title ?? c.value) : c.value)), limit: 6 });
  const evidence = [...new Set([...item.evidenceUrls, ...copies.flatMap((c) => c.evidenceUrls)])].slice(0, 6);
  if (evidence.length) body.push({ section: "Evidence", links: evidence.map((u) => ({ text: websiteHost(u), href: outboundHref(u) })) });
  if (!body.length) return null;
  return (
    <PeekHoverCard
      side="bottom"
      align="end"
      trigger={<Button variant="quiet" icon={<Info aria-hidden />} aria-label="Where this came from" data-testid="validate-grounding" />}
    >
      <Peek
        size="sm"
        record={{
          kind: item.label,
          id: item.key,
          title: item.title ?? item.value,
          subtitle: item.label,
          body,
          copyData: { label: item.label, value: item.value, source: item.source, certainty: item.certainty, detail: item.detail, evidence },
        }}
      />
    </PeekHoverCard>
  );
}

/** Related ▸ every relationship but Ours / Not us, grouped by stance. */
function relationItems(kinds: BrandRelationKind[]): WayOutItem[] {
  const list = [...kinds]
    .filter((k) => k.key !== "ours" && k.key !== "not_us")
    .sort((a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || Number(b.isKnown) - Number(a.isKnown));
  return list.map((k, n) => ({
    value: `rel:${k.key}`,
    label: k.label,
    group: n === 0 || list[n - 1].stance !== k.stance ? `Related · ${STANCE_LABEL[k.stance]}` : undefined,
  }));
}

function WeThink({ item, kinds }: { item: FocusItem; kinds: BrandRelationKind[] }) {
  const evidence = (item.evidence?.suggestion as { evidence?: unknown } | undefined)?.evidence;
  return <WeThinkHint suggestion={item.suggestion} kinds={kinds} evidence={Array.isArray(evidence) ? evidence.filter((e): e is string => typeof e === "string") : undefined} />;
}

/** Yes / No answers per kind: Yes = "this is it", No = "not us" / "wrong". */
function yesNo(item: FocusItem): { yes: Answer; no: Answer } {
  if (item.kind === "fact") return { yes: "correct", no: "wrong" };
  if (item.kind === "name") return { yes: "preferred", no: "not_us" };
  return { yes: "ours", no: "not_us" };
}

const NOTHING_SEPARATED: ReadonlySet<string> = new Set();

/** Logos: one tile per picture (the same image found on five platforms is one tile), raw, never boxed. */
function LogoHero({ item }: { item: FocusItem }) {
  const sources = [item, ...(item.folded ?? [])].map((i) => i.evidence).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const groups = useLogoGroups(sources, NOTHING_SEPARATED);
  return (
    <ul className="flex flex-wrap items-center gap-5" data-testid="validate-logos">
      {groups.slice(0, 8).map((g) => (
        <li key={g.id} className="relative">
          <img src={g.lead.image_url ?? g.lead.value} alt="" className="h-20 max-w-[10rem] object-contain" />
          {g.members.length > 1 ? (
            <span className="absolute -top-2 -right-2">
              <Badge>{g.members.length}</Badge>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The hero: the subject itself, large — the real avatar / logo / value, the exact handle. */
function Hero({
  item,
  editing,
  draft,
  setDraft,
  onSubmitEdit,
  onCancelEdit,
  off,
  toggleOff,
  ask,
}: {
  item: FocusItem;
  /** Set while the card asks for a person's name (Founder / Key person): the field's label. */
  ask?: string | null;
  editing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  off: ReadonlySet<string>;
  toggleOff: (key: string) => void;
}) {
  if (item.members?.length) {
    return (
      <ul className="-m-1 flex max-h-56 flex-wrap gap-2 overflow-y-auto p-1" data-testid="validate-set">
        {item.members.map((m) => {
          const isOff = off.has(m.key);
          return (
            <li key={m.key}>
              <button
                type="button"
                aria-pressed={!isOff}
                onClick={() => toggleOff(m.key)}
                className={`flex min-h-10 items-center gap-2 rounded-full border px-4 text-base transition-colors ${
                  isOff ? "border-border text-muted-foreground line-through" : "border-primary bg-primary/10 text-foreground"
                }`}
                data-testid="validate-set-value"
              >
                {isOff ? <X className="size-3.5 shrink-0" aria-hidden /> : <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
                {/* Pixel cap, not ch: px-4 + icon + gap + this stays under the 320px pill budget at any font (MKT-129); the full value is the tooltip. */}
                <span className="max-w-56 truncate" title={m.value}>{m.value}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  if (item.kind === "logo") return <LogoHero item={item} />;
  if (editing) {
    return (
      <Field
        aria-label={ask ?? "Value"}
        // ui-exception: the fact's own raw value, or a person's name, typed in place
        placeholder={ask ? "Their name" : undefined}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) onSubmitEdit();
          if (e.key === "Escape") onCancelEdit();
        }}
      />
    );
  }
  if (item.kind === "account") {
    return (
      <div className="flex items-center gap-5">
        <Thumb item={item} size={96} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-3xl font-semibold tracking-tight" data-testid="validate-value">
            {item.value}
          </span>
          {item.title ? <span className="truncate text-base text-muted-foreground">{item.title}</span> : null}
        </div>
      </div>
    );
  }
  if (item.kind === "website" || item.kind === "web" || (item.fact && /^https?:\/\//i.test(item.value))) {
    const host = websiteHost(item.openUrl ?? item.value);
    return (
      <div className="flex items-center gap-5">
        <Thumb item={item} size={56} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-2xl font-semibold tracking-tight" data-testid="validate-value">
            {host}
          </span>
          {item.title ? <span className="line-clamp-2 text-base text-muted-foreground">{item.title}</span> : null}
        </div>
      </div>
    );
  }
  const long = item.value.length > 60;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span
        className={`break-words font-semibold tracking-tight ${long ? "line-clamp-5 text-xl leading-snug" : item.kind === "name" ? "text-4xl" : "text-3xl"}`}
        data-testid="validate-value"
      >
        {item.value}
      </span>
      {item.fact?.conflict_with ? <span className="truncate text-base text-muted-foreground">On file: {item.fact.conflict_with}</span> : null}
    </div>
  );
}

function FocusCard({
  item,
  brandName,
  kinds,
  onAnswer,
  editing,
  setEditing,
  off,
  toggleOff,
}: {
  item: FocusItem;
  brandName: string;
  kinds: BrandRelationKind[];
  onAnswer: (answer: Answer, opts?: AnswerOptions) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  off: ReadonlySet<string>;
  toggleOff: (key: string) => void;
}) {
  const [draft, setDraft] = useState(item.value);
  // Founder / Key person on a page asks for the person's name before anything is saved (MKT-043).
  const [personFor, setPersonFor] = useState<BrandRelationKind | null>(null);
  const set = Boolean(item.members?.length);
  const options = set ? (["correct", "wrong", "later", "ignore"] as Answer[]) : optionsFor(item.kind);
  const { yes, no } = set ? { yes: "correct" as Answer, no: "wrong" as Answer } : yesNo(item);
  const glowOther = ["related", "alias", "later", "ignore"].includes(item.suggestion?.choice ?? "");
  const glow = (a: Answer) => item.suggestion?.choice === a;
  const suggestedRelation =
    item.suggestion?.choice === "related" && item.suggestion.relation_key ? kinds.find((k) => k.key === item.suggestion?.relation_key) : undefined;
  const section = SECTION_LABEL[sectionOf(item)];
  // The section leads on wide screens; a phone shows only what the card is.
  const sectionLead = !set && !section.toLowerCase().startsWith(item.label.toLowerCase());
  const canEdit = item.kind === "fact" && !set;
  // Key hints only where there is a keyboard: a phone shows clean buttons.
  const keys = useMediaQuery("(pointer: fine)");
  // Phones: the card itself is swiped — right = Yes, left = No, up = Skip for now (MKT-046). Buttons stay.
  const touch = useMediaQuery("(pointer: coarse)");
  const swipeable = touch && !editing && !personFor;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tilt = useTransform(x, [-200, 0, 200], [-6, 0, 6]);
  const yesHint = useTransform(x, [20, 110], [0, 1]);
  const noHint = useTransform(x, [-110, -20], [1, 0]);
  const laterHint = useTransform(y, [-110, -20], [1, 0]);
  const [thrown, setThrown] = useState(false);
  const onSwipe = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x + info.velocity.x * 0.15;
    const dy = info.offset.y + info.velocity.y * 0.15;
    const far = 110;
    const decide = (a: Answer, opts?: AnswerOptions) => {
      setThrown(true);
      onAnswer(a, opts);
    };
    if (Math.abs(dx) >= far && Math.abs(dx) > Math.abs(dy)) decide(dx > 0 ? yes : no, dx > 0 && set ? { off: [...off] } : undefined);
    else if (!set && dy <= -far) decide("later");
  };
  return (
    <motion.div
      drag={swipeable ? (set ? "x" : true) : false}
      dragSnapToOrigin={!thrown}
      dragElastic={0.6}
      dragMomentum={false}
      onDragEnd={onSwipe}
      style={{ x, y, rotate: tilt }}
      className="relative flex h-full flex-col gap-6 rounded-3xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_48px_-20px_rgb(0_0_0/0.28)] sm:p-8"
      data-testid="validate-focus"
      data-key={item.key}
      data-kind={item.kind}
    >
      {swipeable ? (
        <>
          <motion.span aria-hidden style={{ opacity: yesHint }} className="pointer-events-none absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            {ANSWER_LABEL[yes]}
          </motion.span>
          <motion.span aria-hidden style={{ opacity: noHint }} className="pointer-events-none absolute top-4 right-4 rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">
            {ANSWER_LABEL[no]}
          </motion.span>
          <motion.span aria-hidden style={{ opacity: laterHint }} className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
            {ANSWER_LABEL.later}
          </motion.span>
        </>
      ) : null}
      <div className="flex items-center gap-2">
        {item.kind === "account" && item.platform ? <PlatformMark platform={item.platform} size={16} /> : null}
        <span className="truncate text-sm font-medium text-muted-foreground" data-testid="validate-label">
          {sectionLead ? <span className="max-sm:hidden">{section} · </span> : null}
          {set || sectionLead ? item.label : section}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {canEdit ? (
            <Button
              variant="quiet"
              icon={editing ? <X aria-hidden /> : <Pencil aria-hidden />}
              aria-label={editing ? "Cancel edit" : "Edit"}
              title={editing ? "Cancel (Esc)" : "Edit (E)"}
              onClick={() => setEditing(!editing)}
              data-testid="validate-edit"
            />
          ) : null}
          <Grounding item={item} />
          {item.openUrl ? (
            <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
              <OutboundLink href={outboundHref(item.openUrl)} data-testid="validate-open" />
            </Button>
          ) : null}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <Hero
          item={item}
          editing={editing || Boolean(personFor)}
          ask={personFor ? `${personFor.label}'s name` : null}
          draft={draft}
          setDraft={setDraft}
          onSubmitEdit={() => (personFor ? onAnswer("related", { relationKey: personFor.key, value: draft }) : onAnswer("correct", { value: draft }))}
          onCancelEdit={() => (personFor ? setPersonFor(null) : setEditing(false))}
          off={off}
          toggleOff={toggleOff}
        />
      </div>
      <WeThink item={item} kinds={kinds} />
      <div className="flex flex-wrap items-center gap-2">
        <DecisionControl
          aria-label="Answer"
          size="stage"
          value={null}
          shortcuts={keys ? KEY : undefined}
          suggested={glow(yes) ? "yes" : glow(no) ? "no" : glowOther ? "other" : null}
          onChange={(a) => {
            const answer = a === "yes" ? yes : no;
            if (editing && answer === "correct") onAnswer("correct", { value: draft });
            else onAnswer(answer, set ? { off: [...off] } : undefined);
          }}
          wayOut={[
            ...(suggestedRelation ? [{ value: `rel:${suggestedRelation.key}`, label: suggestedRelation.label, meta: "We think" }] : []),
            ...(options.includes("alias") ? [{ value: "alias", label: "Another name we use", meta: "A" }] : []),
            { value: "ignore", label: ANSWER_LABEL.ignore, meta: "I" },
            ...(options.includes("related") ? relationItems(kinds.filter((k) => k.key !== suggestedRelation?.key)) : []),
          ]}
          onWayOut={(v) => {
            if (v === "ignore" || v === "alias") onAnswer(v);
            else if (v.startsWith("rel:")) {
              const kind = kinds.find((k) => k.key === v.slice(4));
              const person = kind?.routesTo === "owns" || kind?.routesTo === "key_person";
              // An account is the person's own page (its name is the name); anything else asks.
              if (kind && person && item.kind !== "account") {
                setDraft(personNameOnPage({ title: item.title, snippet: item.detail }, brandName) ?? "");
                setPersonFor(kind);
              } else onAnswer("related", { relationKey: v.slice(4) });
            }
          }}
          onSkip={() => onAnswer("later")}
          skipLabel={ANSWER_LABEL.later}
        />
      </div>
    </motion.div>
  );
}

function TrayRow({ entry, onUndo }: { entry: AnsweredEntry; onUndo: () => void }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={FLY}
      className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted"
      data-testid="validate-answered"
      data-key={entry.item.key}
      data-answer={entry.answer}
      data-state={entry.state}
    >
      <Thumb item={entry.item} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm">{entry.value}</span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={entry.error ?? undefined}>
        {entry.state === "failed" ? "Not saved" : (entry.relationLabel ?? ANSWER_LABEL[entry.answer])}
        {entry.state === "failed" && entry.error ? <ErrorAlchemyMenu error={entry.error} /> : null}
      </span>
      {entry.state === "failed" ? <X className="size-3.5 shrink-0 text-destructive" aria-label="Not saved" /> : null}
      <Button variant="quiet" icon={<RotateCcw aria-hidden />} aria-label="Undo" title="Undo" onClick={onUndo} data-testid="validate-undo" />
    </motion.li>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.getAttribute("role") === "combobox" || Boolean(target.closest("[role=menu]"));
}

/** The calm stand-in while saved findings load: the stage itself, with a soft sweep — never a spinner. */
export function ValidateStageSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 pt-[calc(var(--shell-header-h,0px)+1.5rem)]" data-testid="validate-skeleton">
      <div className="h-7 w-full max-w-[40rem]" />
      <div className="mt-3 h-1 w-full max-w-[40rem] rounded-full bg-muted" />
      <Skeleton motion="shimmer" className="mt-[10vh] h-[24rem] w-full max-w-[40rem] rounded-3xl border border-border bg-card" />
    </div>
  );
}

export function ValidateStage({
  brandName,
  brandLogo,
  queue,
  answered,
  laterCount,
  kinds,
  working,
  loading = false,
  loadError = null,
  brandHref,
  websiteHost: site,
  accountCount = 0,
  onAnswer,
  onUndo,
}: {
  brandName: string;
  brandLogo: string | null;
  queue: FocusItem[];
  /** Newest first. */
  answered: AnsweredEntry[];
  laterCount: number;
  kinds: BrandRelationKind[];
  working: boolean;
  /** Saved findings still loading: the stage shows its calm sweep. */
  loading?: boolean;
  loadError?: string | null;
  brandHref: string;
  websiteHost?: string | null;
  accountCount?: number;
  onAnswer: (item: FocusItem, answer: Answer, opts?: AnswerOptions) => void;
  onUndo: (entry: AnsweredEntry) => void;
}) {
  const current = queue[0] ?? null;
  const [editing, setEditing] = useState(false);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [dir, setDir] = useState<Throw>("yes");
  const lastAnswerAt = useRef(0);
  const [trayOpen, setTrayOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 1024px)");
  const total = answered.length + queue.length;
  const left = queue.length;

  // A new card starts clean: adjusted during render, not in an effect.
  const [seenKey, setSeenKey] = useState(current?.key);
  if (seenKey !== current?.key) {
    setSeenKey(current?.key);
    setEditing(false);
    setOff(new Set());
  }

  // The next cards' images load before they are needed.
  useEffect(() => {
    for (const q of queue.slice(1, 4)) {
      const src = q.imageUrl ?? (q.openUrl && (q.kind === "web" || q.kind === "website") ? faviconUrl(q.openUrl) : null);
      if (src) new Image().src = src;
    }
  }, [queue]);

  const answer = (item: FocusItem, a: Answer, opts?: AnswerOptions) => {
    const now = Date.now();
    const fast = now - lastAnswerAt.current < RAPID_MS;
    lastAnswerAt.current = now;
    setDir(fast ? "instant" : a === "later" ? "later" : ["not_us", "wrong", "ignore"].includes(a) ? "no" : "yes");
    onAnswer(item, a, opts);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (answered[0] && !isTyping(e.target)) {
          e.preventDefault();
          onUndo(answered[0]);
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !current) return;
      const k = e.key.toLowerCase();
      const set = Boolean(current.members?.length);
      const { yes, no } = set ? { yes: "correct" as Answer, no: "wrong" as Answer } : yesNo(current);
      const press = (a: Answer, opts?: AnswerOptions) => {
        e.preventDefault();
        answer(current, a, opts);
      };
      if (k === "u" && answered[0]) return onUndo(answered[0]);
      if (k === "y") return press(yes, set ? { off: [...off] } : undefined);
      if (k === "n") return press(no);
      if (k === "l") return press("later");
      if (k === "i") return press("ignore");
      if (k === "a" && current.kind === "name") return press("alias");
      if (k === "e" && current.kind === "fact" && !set) {
        e.preventDefault();
        return setEditing(true);
      }
      if (k === "o") {
        e.preventDefault();
        stageRef.current?.querySelector<HTMLElement>("[data-testid=validate-focus] [data-decision-option=other]")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = total ? answered.length / total : 0;
  // The tray never grows into a long list beside a calm card: the latest few, the rest one press away (MKT-055).
  const [allAnswered, setAllAnswered] = useState(false);
  const shown = allAnswered ? answered : answered.slice(0, TRAY_LIMIT);
  const hidden = answered.length - shown.length;
  const tray = (
    <>
      <ul className="flex flex-col gap-0.5">
        <AnimatePresence initial={false}>
          {shown.map((e) => (
            <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
          ))}
        </AnimatePresence>
      </ul>
      {answered.length > TRAY_LIMIT ? (
        <Button variant="quiet" className="mt-1" onClick={() => setAllAnswered((v) => !v)} data-testid="validate-answered-more">
          {allAnswered ? "Show fewer" : `${hidden} earlier`}
        </Button>
      ) : null}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="smart-add-validate">
          <div ref={stageRef} className="flex flex-col items-center px-3 pt-[calc(var(--shell-header-h,0px)+1.5rem)] pb-28 sm:px-4 lg:pb-10">
            <header className="flex w-full max-w-[40rem] items-center gap-3">
              {brandLogo ? <img src={brandLogo} alt="" className="size-7 shrink-0 rounded-md object-contain" /> : null}
              <span className="truncate text-base font-semibold">{brandName}</span>
              <span className="ml-auto flex items-center gap-2 text-sm font-medium tabular-nums" data-testid="validate-progress">
                {working ? (
                  <span className="relative flex size-2" title="Finding more">
                    <span className="absolute inline-flex size-full rounded-full bg-primary motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                ) : null}
                {loading ? null : left ? `${left} left` : null}
              </span>
            </header>
            <div className="mt-3 h-1 w-full max-w-[40rem] overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full origin-left rounded-full bg-primary" initial={false} animate={{ scaleX: progress }} transition={RISE} />
            </div>

            {/* Fixed stage height: a new card never moves anything around it. */}
            <div className="relative mt-[8vh] h-[26rem] w-full max-w-[40rem]" aria-live="polite">
              {loading ? (
                <div className="absolute inset-0 overflow-hidden rounded-3xl border border-border bg-card">
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-muted to-transparent motion-safe:animate-[validate-sweep_1.6s_ease-in-out_infinite]" />
                  <style>{"@keyframes validate-sweep{to{transform:translateX(100%)}}"}</style>
                </div>
              ) : null}
              {/* The deck: the next cards wait faintly behind the one in focus. */}
              {!loading && queue.length > 2 ? (
                <div aria-hidden className="absolute inset-x-10 top-6 -bottom-5 rounded-3xl border border-border bg-muted" />
              ) : null}
              {!loading && queue.length > 1 ? (
                <div aria-hidden className="absolute inset-x-5 top-3 -bottom-2.5 rounded-3xl border border-border bg-card" />
              ) : null}
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                {loading ? null : current ? (
                  <motion.div
                    key={current.key}
                    custom={dir}
                    variants={cardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0"
                  >
                    <FocusCard
                      item={current}
                      brandName={brandName}
                      kinds={kinds}
                      editing={editing}
                      setEditing={setEditing}
                      off={off}
                      toggleOff={(key) =>
                        setOff((cur) => {
                          const next = new Set(cur);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                      onAnswer={(a, o) => answer(current, a, o)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-card p-8 text-center"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={RISE}
                    data-testid="validate-done"
                  >
                    {loadError ? (
                      <span className="flex items-center gap-1 text-base text-destructive">
                        {loadError}
                        <ErrorAlchemyMenu error={loadError} />
                      </span>
                    ) : (
                      <>
                        <motion.span
                          className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          initial={{ scale: 0.4 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 520, damping: 18 }}
                        >
                          <Check className="size-8" strokeWidth={2.5} />
                        </motion.span>
                        <span className="text-2xl font-semibold tracking-tight">{working ? "Looking for more" : "All set"}</span>
                        <ul className="flex w-full max-w-xs flex-col gap-3 text-left text-base">
                          {site ? (
                            <li className="flex items-center gap-3">
                              <Globe className="size-4 shrink-0 text-primary" aria-hidden />
                              <span className="truncate">Reading {websiteHost(site)}</span>
                            </li>
                          ) : null}
                          <li className="flex items-center gap-3">
                            <Users className="size-4 shrink-0 text-primary" aria-hidden />
                            <span>{accountCount ? `Collecting posts from ${accountCount} accounts` : "Collecting your posts"}</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <LayoutDashboard className="size-4 shrink-0 text-primary" aria-hidden />
                            <span>Building your brand page</span>
                          </li>
                        </ul>
                        <Button asChild variant="primary">
                          <a href={brandHref} data-testid="validate-open-brand">
                            Open brand page
                          </a>
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-8 h-5 text-sm text-muted-foreground" data-testid="validate-later">
              {laterCount ? `${laterCount} for later` : null}
            </div>
          </div>

          {wide ? (
            <aside className="flex flex-col border-l border-border" aria-label="Answered">
              <div className="sticky top-0 flex max-h-dvh flex-col pt-[calc(var(--shell-header-h,0px)+1.5rem)]">
                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm font-semibold">Answered</span>
                  {answered.length ? <Badge>{answered.length}</Badge> : null}
                </div>
                <div className="mt-3 overflow-y-auto px-2 pb-6">{tray}</div>
              </div>
            </aside>
          ) : null}
        </div>

        {wide ? null : (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-safe" data-matrx-floating-bottom data-testid="validate-tray-phone">
            <div className={`grid ${PANEL_MOTION_CLASS} transition-[grid-template-rows] ${trayOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="min-h-0 overflow-hidden" inert={!trayOpen} aria-hidden={!trayOpen}>
                <ul className="max-h-[45dvh] overflow-y-auto px-2 pt-2">
                  {shown.slice(1).map((e) => (
                    <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
                  ))}
                </ul>
                {answered.length > TRAY_LIMIT ? (
                  <Button variant="quiet" className="mx-2 mb-1" onClick={() => setAllAnswered((v) => !v)}>
                    {allAnswered ? "Show fewer" : `${hidden} earlier`}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex h-14 items-center gap-2 px-3">
              <Button
                variant="quiet"
                icon={<ChevronUp aria-hidden className={trayOpen ? "rotate-180" : ""} />}
                onClick={() => setTrayOpen((v) => !v)}
                disabled={answered.length < 2}
              >
                Answered
              </Button>
              {answered.length ? <Badge>{answered.length}</Badge> : null}
              {answered[0] ? (
                <ul className="ml-auto min-w-0 flex-1">
                  <TrayRow entry={answered[0]} onUndo={() => onUndo(answered[0])} />
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </LayoutGroup>
    </MotionConfig>
  );
}
