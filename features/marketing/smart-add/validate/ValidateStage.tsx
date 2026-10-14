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

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, type Transition } from "motion/react";
import { Check, ChevronUp, ExternalLink, Globe, Info, LayoutDashboard, Pencil, RotateCcw, Users, X } from "lucide-react";
import { PANEL_MOTION_CLASS } from "@ai-matrx/design-system";
import { Badge, Button, DecisionControl, Field, type WayOutItem } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount } from "@ai-matrx/kit/format";
import { useMediaQuery } from "@ai-matrx/kit/media-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { websiteHost } from "../evidence";
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

type Throw = "yes" | "no" | "later";

/** Quick and physical: the card leaves on a stiff spring, the next one rises on a softer one. */
const THROW: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.7 };
const RISE: Transition = { type: "spring", stiffness: 380, damping: 32 };
const FLY: Transition = { type: "spring", stiffness: 420, damping: 36 };

const cardVariants = {
  enter: { opacity: 0, y: 18, scale: 0.955 },
  center: { opacity: 1, y: 0, scale: 1, x: 0, rotate: 0, transition: RISE },
  exit: (dir: Throw) =>
    dir === "yes"
      ? { opacity: 0, x: 160, y: -24, rotate: 7, transition: THROW }
      : dir === "no"
        ? { opacity: 0, x: -160, y: -12, rotate: -7, transition: THROW }
        : { opacity: 0, y: 60, scale: 0.94, transition: THROW },
};

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

/** Everything that grounds a finding — in a hover card, never on the page. */
function Grounding({ item }: { item: FocusItem }) {
  const lines: [string, ReactNode][] = [];
  if (item.source) lines.push(["Found", item.source]);
  if (item.certainty) lines.push(["Certainty", item.certainty]);
  if (item.followers !== null && item.followers !== undefined) lines.push(["Followers", formatCount(item.followers)]);
  if (item.detail) lines.push([item.kind === "fact" ? "Why" : "Snippet", item.detail]);
  if (item.spellings && item.spellings.length > 1) lines.push(["Spelled two ways", item.spellings.join(" · ")]);
  const copies = item.folded ?? [];
  const evidence = [...new Set([...item.evidenceUrls, ...copies.flatMap((c) => c.evidenceUrls)])].slice(0, 6);
  if (!lines.length && !evidence.length && !copies.length) return null;
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <button type="button" aria-label="Where this came from" className="text-muted-foreground" data-testid="validate-grounding">
          <Info className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent>
        <dl className="flex flex-col gap-2">
          {lines.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="type-label">{k}</dt>
              <dd className="type-body line-clamp-4 break-words">{v}</dd>
            </div>
          ))}
          {copies.length ? (
            <div className="flex flex-col">
              <dt className="type-label">Also found as</dt>
              {copies.slice(0, 6).map((c) => (
                <dd key={c.key} className="truncate">
                  {c.kind === "web" ? (c.title ?? c.value) : c.value}
                </dd>
              ))}
              {copies.length > 6 ? <dd className="text-muted-foreground">+{copies.length - 6}</dd> : null}
            </div>
          ) : null}
          {evidence.length ? (
            <div className="flex flex-col">
              <dt className="type-label">Evidence</dt>
              {evidence.map((u) => (
                <dd key={u} className="truncate">
                  <OutboundLink href={outboundHref(u)} className="text-primary">
                    {websiteHost(u)}
                  </OutboundLink>
                </dd>
              ))}
            </div>
          ) : null}
        </dl>
      </HoverCardContent>
    </HoverCard>
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
}: {
  item: FocusItem;
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
                <span className="max-w-[28ch] truncate">{m.value}</span>
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
        aria-label="Value"
        // ui-exception: the fact's own raw value, edited in place
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
  kinds,
  onAnswer,
  editing,
  setEditing,
  off,
  toggleOff,
}: {
  item: FocusItem;
  kinds: BrandRelationKind[];
  onAnswer: (answer: Answer, opts?: AnswerOptions) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  off: ReadonlySet<string>;
  toggleOff: (key: string) => void;
}) {
  const [draft, setDraft] = useState(item.value);
  const set = Boolean(item.members?.length);
  const options = set ? (["correct", "wrong", "later", "ignore"] as Answer[]) : optionsFor(item.kind);
  const { yes, no } = set ? { yes: "correct" as Answer, no: "wrong" as Answer } : yesNo(item);
  const glowOther = ["related", "alias", "later", "ignore"].includes(item.suggestion?.choice ?? "");
  const glow = (a: Answer) => item.suggestion?.choice === a;
  const suggestedRelation =
    item.suggestion?.choice === "related" && item.suggestion.relation_key ? kinds.find((k) => k.key === item.suggestion?.relation_key) : undefined;
  const section = SECTION_LABEL[sectionOf(item)];
  const eyebrow = set || section.toLowerCase().startsWith(item.label.toLowerCase()) ? (set ? item.label : section) : `${section} · ${item.label}`;
  const canEdit = item.kind === "fact" && !set;
  return (
    <div
      className="flex h-full flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_48px_-20px_rgb(0_0_0/0.28)] sm:p-8"
      data-testid="validate-focus"
      data-key={item.key}
      data-kind={item.kind}
    >
      <div className="flex items-center gap-2">
        {item.kind === "account" && item.platform ? <PlatformMark platform={item.platform} size={16} /> : null}
        <span className="truncate text-sm font-medium text-muted-foreground" data-testid="validate-label">
          {eyebrow}
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
          editing={editing}
          draft={draft}
          setDraft={setDraft}
          onSubmitEdit={() => onAnswer("correct", { value: draft })}
          onCancelEdit={() => setEditing(false)}
          off={off}
          toggleOff={toggleOff}
        />
      </div>
      <WeThink item={item} kinds={kinds} />
      <div className="flex flex-wrap items-center gap-2">
        <DecisionControl
          aria-label="Answer"
          value={null}
          shortcuts={KEY}
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
            else if (v.startsWith("rel:")) onAnswer("related", { relationKey: v.slice(4) });
          }}
          onSkip={() => onAnswer("later")}
          skipLabel={ANSWER_LABEL.later}
        />
      </div>
    </div>
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
      <span className="shrink-0 text-xs text-muted-foreground" title={entry.error ?? undefined}>
        {entry.state === "failed" ? "Not saved" : (entry.relationLabel ?? ANSWER_LABEL[entry.answer])}
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
      <div className="relative mt-[10vh] h-[24rem] w-full max-w-[40rem] overflow-hidden rounded-3xl border border-border bg-card">
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-muted to-transparent motion-safe:animate-[validate-sweep_1.6s_ease-in-out_infinite]" />
      </div>
      <style>{"@keyframes validate-sweep{to{transform:translateX(100%)}}"}</style>
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
  const [trayOpen, setTrayOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 1024px)");
  const total = answered.length + queue.length;
  const left = queue.length;

  useEffect(() => {
    setEditing(false);
    setOff(new Set());
  }, [current?.key]);

  // The next cards' images load before they are needed.
  useEffect(() => {
    for (const q of queue.slice(1, 4)) {
      const src = q.imageUrl ?? (q.openUrl && (q.kind === "web" || q.kind === "website") ? faviconUrl(q.openUrl) : null);
      if (src) new Image().src = src;
    }
  }, [queue]);

  const answer = (item: FocusItem, a: Answer, opts?: AnswerOptions) => {
    setDir(a === "later" ? "later" : ["not_us", "wrong", "ignore"].includes(a) ? "no" : "yes");
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
  const tray = (
    <ul className="flex flex-col gap-0.5">
      <AnimatePresence initial={false}>
        {answered.map((e) => (
          <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
        ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="smart-add-validate">
          <div ref={stageRef} className="flex flex-col items-center px-4 pt-[calc(var(--shell-header-h,0px)+1.5rem)] pb-28 lg:pb-10">
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
                      <span className="text-base text-destructive">{loadError}</span>
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
                  {answered.slice(1).map((e) => (
                    <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
                  ))}
                </ul>
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
              <Badge>{answered.length}</Badge>
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
