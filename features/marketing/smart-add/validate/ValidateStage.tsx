"use client";

/**
 * Smart Add validation — the stage. One finding in focus (the next one waits faintly behind it),
 * its raw image, its exact value, Open, and every answer it can take, each with a key. An answer
 * sends the card to the Answered tray (right on desktop, a strip at the bottom on a phone) where Undo
 * brings it back. Grounding (where it was found, how sure, why, evidence links) and the "we think"
 * reason live in hover cards only — the page itself stays calm. A suggestion only glows; it is never
 * chosen. Presentational: the container (SmartAddValidate) saves; the lab story feeds fixtures.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { Check, ChevronUp, ExternalLink, Info, Loader2, RotateCcw, X } from "lucide-react";
import { PANEL_MOTION_CLASS } from "@ai-matrx/design-system";
import { Badge, Button, Field, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { useMediaQuery } from "@ai-matrx/kit/media-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { websiteHost } from "../evidence";
import { outboundHref } from "../SmartAddExtras";
import { STANCE_LABEL, STANCE_ORDER } from "../webKinds";
import { ANSWER_KEY, ANSWER_LABEL, optionsFor, type Answer, type FocusItem } from "./queue";

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
}

const FLY = { duration: 0.34, ease: [0.4, 0, 0.2, 1] as const };
/** A card leaving gets out of the way fast, so quick answers never pile up on screen. */
const LEAVE = { duration: 0.14, ease: [0.4, 0, 1, 1] as const };

function thumbId(key: string) {
  return `validate:${key}`;
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
            <span className="flex size-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">{initial}</span>
          }
        />
        {item.platform ? (
          <span className="absolute -right-0.5 -bottom-0.5 rounded-md ring-2 ring-card">
            <PlatformMark platform={item.platform} size={Math.max(12, Math.round(size * 0.32))} />
          </span>
        ) : null}
      </span>
    );
  }
  if (item.imageUrl && !broken) {
    return <img src={item.imageUrl} alt="" style={style} className="shrink-0 object-contain" onError={() => setBroken(true)} />;
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
      className="flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground"
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
  if (item.followers !== null && item.followers !== undefined) lines.push(["Followers", item.followers.toLocaleString()]);
  if (item.detail) lines.push([item.kind === "fact" ? "Why" : "Snippet", item.detail]);
  if (!lines.length && !item.evidenceUrls.length) return null;
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button type="button" aria-label="Where this came from" className="text-muted-foreground" data-testid="validate-grounding">
          <Info className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-xs">
        <dl className="flex flex-col gap-1.5">
          {lines.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
          {item.evidenceUrls.length ? (
            <div className="flex flex-col">
              <dt className="text-[11px] font-medium text-muted-foreground">Evidence</dt>
              {item.evidenceUrls.map((u) => (
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

function relationOptions(kinds: BrandRelationKind[]): SelectOption<string>[] {
  return [
    { value: "", label: "Related…" },
    ...[...kinds]
      .filter((k) => k.key !== "ours" && k.key !== "not_us")
      .sort((a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || Number(b.isKnown) - Number(a.isKnown))
      .map((k) => ({ value: k.key, label: k.label, meta: STANCE_LABEL[k.stance] })),
  ];
}

/** The "we think" hint: the matching option glows; the reason sits in a hover card. */
function WeThink({ item, kinds }: { item: FocusItem; kinds: BrandRelationKind[] }) {
  const s = item.suggestion;
  if (!s) return <span className="h-5" aria-hidden />;
  const rel = s.relation_key ? kinds.find((k) => k.key === s.relation_key)?.label : null;
  const label = rel ?? ANSWER_LABEL[s.choice];
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <span className="flex h-5 items-center gap-1.5 text-xs text-primary" data-testid="validate-we-think" data-choice={s.choice}>
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          We think: {label}
          {s.probability !== null ? <span className="tabular-nums text-muted-foreground">{Math.round(s.probability * 100)}%</span> : null}
        </span>
      </HoverCardTrigger>
      {s.reason ? <HoverCardContent className="w-72 text-xs">{s.reason}</HoverCardContent> : null}
    </HoverCard>
  );
}

function Glow({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-flex" data-glow={on ? "true" : undefined}>
      {on ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-full bg-primary/25 blur-md motion-safe:animate-pulse"
        />
      ) : null}
      <span className={`relative inline-flex rounded-full ${on ? "ring-2 ring-primary" : ""}`}>{children}</span>
    </span>
  );
}

function FocusCard({
  item,
  kinds,
  onAnswer,
  editing,
  setEditing,
}: {
  item: FocusItem;
  kinds: BrandRelationKind[];
  onAnswer: (answer: Answer, opts?: AnswerOptions) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState(item.value);
  const options = optionsFor(item.kind).filter((a) => a !== "later" && a !== "ignore");
  const glow = (a: Answer) => item.suggestion?.choice === a;
  const fact = item.kind === "fact";
  const web = item.kind === "web";
  // A suggested relationship is offered as its own one-press option (it glows; it is never chosen).
  const suggestedRelation =
    item.suggestion?.choice === "related" && item.suggestion.relation_key
      ? kinds.find((k) => k.key === item.suggestion?.relation_key)
      : undefined;
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm" data-testid="validate-focus" data-key={item.key} data-kind={item.kind}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{item.label}</span>
        <span className="ml-auto flex items-center gap-2">
          <Grounding item={item} />
          {item.openUrl ? (
            <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
              <OutboundLink href={outboundHref(item.openUrl)} data-testid="validate-open" />
            </Button>
          ) : null}
        </span>
      </div>
      <div className="flex min-h-16 items-center gap-4">
        {fact || item.kind === "name" ? null : <Thumb item={item} size={64} />}
        <div className="flex min-w-0 flex-col gap-1">
          {editing ? (
            <Field
              aria-label="Value"
              // ui-exception: the fact's own raw value, edited in place
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) onAnswer("correct", { value: draft });
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : web ? (
            // A web result: its title leads; the exact address sits under it.
            <span className="line-clamp-2 text-xl font-semibold break-words">{item.title ?? item.value}</span>
          ) : (
            <span className={`font-semibold break-words ${fact || item.kind === "name" ? "text-2xl" : "text-xl"}`} data-testid="validate-value">
              {item.value}
            </span>
          )}
          {web ? (
            <span className="line-clamp-1 text-xs break-all text-muted-foreground" data-testid="validate-value">
              {item.value}
            </span>
          ) : item.title ? (
            <span className="truncate text-sm text-muted-foreground">{item.title}</span>
          ) : null}
        </div>
      </div>
      <WeThink item={item} kinds={kinds} />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Answer">
        {options.map((a) =>
          a === "related" ? (
            suggestedRelation ? (
              <span key={a} className="inline-flex flex-wrap items-center gap-2">
                <Glow on>
                  <Button variant="outline" onClick={() => onAnswer("related", { relationKey: suggestedRelation.key })} data-testid="validate-answer-suggested-relation">
                    {suggestedRelation.label}
                  </Button>
                </Glow>
                <span data-testid="validate-related">
                  <Select
                    aria-label="Related"
                    value=""
                    options={relationOptions(kinds)}
                    onValueChange={(key) => key && onAnswer("related", { relationKey: key })}
                    className="min-w-28"
                  />
                </span>
              </span>
            ) : (
            <Glow key={a} on={glow(a)}>
              <span data-testid="validate-related">
                <Select
                  aria-label="Related"
                  value=""
                  options={relationOptions(kinds)}
                  onValueChange={(key) => key && onAnswer("related", { relationKey: key })}
                  className="min-w-32"
                />
              </span>
            </Glow>
            )
          ) : (
            <Glow key={a} on={glow(a)}>
              <Button
                variant="outline"
                meta={ANSWER_KEY[a].toUpperCase()}
                onClick={() => (editing && a === "correct" ? onAnswer("correct", { value: draft }) : onAnswer(a))}
                data-testid={`validate-answer-${a}`}
              >
                {ANSWER_LABEL[a]}
              </Button>
            </Glow>
          ),
        )}
        {fact ? (
          <Button variant="quiet" meta="E" onClick={() => setEditing(!editing)} data-testid="validate-edit">
            {editing ? "Cancel" : "Edit"}
          </Button>
        ) : null}
      </div>
      <div className="-mt-2 flex items-center gap-1">
        {(["later", "ignore"] as const).map((a) => (
          <Glow key={a} on={glow(a)}>
            <Button variant="quiet" meta={ANSWER_KEY[a].toUpperCase()} onClick={() => onAnswer(a)} data-testid={`validate-answer-${a}`}>
              {ANSWER_LABEL[a]}
            </Button>
          </Glow>
        ))}
      </div>
    </div>
  );
}

function TrayRow({ entry, onUndo }: { entry: AnsweredEntry; onUndo: () => void }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FLY}
      className="flex items-center gap-2.5 py-1.5"
      data-testid="validate-answered"
      data-key={entry.item.key}
      data-answer={entry.answer}
      data-state={entry.state}
    >
      <Thumb item={entry.item} size={28} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{entry.value}</span>
        <span className="truncate text-[11px] text-muted-foreground" title={entry.error ?? undefined}>
          {entry.state === "failed" ? "Not saved" : (entry.relationLabel ?? ANSWER_LABEL[entry.answer])}
        </span>
      </div>
      {entry.state === "saving" ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : entry.state === "failed" ? (
        <X className="size-3.5 shrink-0 text-destructive" />
      ) : (
        <Check className="size-3.5 shrink-0 text-primary" />
      )}
      <Button variant="quiet" icon={<RotateCcw aria-hidden />} aria-label="Undo" title="Undo" onClick={onUndo} data-testid="validate-undo" />
    </motion.li>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.getAttribute("role") === "combobox";
}

export function ValidateStage({
  brandName,
  brandLogo,
  queue,
  answered,
  laterCount,
  kinds,
  working,
  onAnswer,
  onUndo,
  footer,
}: {
  brandName: string;
  brandLogo: string | null;
  queue: FocusItem[];
  /** Newest first. */
  answered: AnsweredEntry[];
  laterCount: number;
  kinds: BrandRelationKind[];
  working: boolean;
  onAnswer: (item: FocusItem, answer: Answer, opts?: AnswerOptions) => void;
  onUndo: (entry: AnsweredEntry) => void;
  footer?: ReactNode;
}) {
  const current = queue[0] ?? null;
  const next = queue[1] ?? null;
  const [editing, setEditing] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  // One tray mounted at a time, so each answer's image has exactly one place to fly to.
  const wide = useMediaQuery("(min-width: 1024px)");
  const total = answered.length + queue.length;

  useEffect(() => setEditing(false), [current?.key]);

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
      if (k === "u" && answered[0]) return onUndo(answered[0]);
      if (k === "e" && current.kind === "fact") {
        e.preventDefault();
        return setEditing(true);
      }
      const answer = optionsFor(current.kind).find((a) => ANSWER_KEY[a] === k);
      if (!answer) return;
      e.preventDefault();
      if (answer === "related") {
        stageRef.current?.querySelector<HTMLElement>("[data-testid=validate-related] button")?.click();
        return;
      }
      onAnswer(current, answer);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = total ? answered.length / total : 0;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="grid min-h-[calc(100dvh-var(--shell-header-h,0px))] lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="smart-add-validate">
          <div ref={stageRef} className="flex flex-col items-center px-4 pt-[calc(var(--shell-header-h,0px)+1.5rem)] pb-28 lg:pb-10">
            <header className="flex w-full max-w-xl items-center gap-3">
              {brandLogo ? <img src={brandLogo} alt="" className="size-7 shrink-0 object-contain" /> : null}
              <span className="truncate text-sm font-semibold">{brandName}</span>
              <span className="ml-auto flex items-center gap-2 text-xs tabular-nums text-muted-foreground" data-testid="validate-progress">
                {working ? (
                  <span className="relative flex size-2" title="Finding more">
                    <span className="absolute inline-flex size-full rounded-full bg-primary/60 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                ) : null}
              </span>
            </header>
            <div className="mt-2 h-0.5 w-full max-w-xl overflow-hidden rounded-full bg-muted">
              <div className="h-full origin-left bg-primary transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
            </div>

            {/* Fixed stage height: a new card never moves anything around it. */}
            <div className="relative mt-[12vh] h-[22rem] w-full max-w-xl">
              <AnimatePresence mode="popLayout" initial={false}>
                {current ? (
                  <motion.div
                    key={current.key}
                    className="absolute inset-x-0 top-0 isolate"
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97, transition: LEAVE }}
                    transition={FLY}
                  >
                    {next ? (
                      <div aria-hidden className="pointer-events-none absolute inset-x-5 top-3 -bottom-3 -z-10 rounded-2xl border border-border bg-card opacity-60" />
                    ) : null}
                    <FocusCard
                      item={current}
                      kinds={kinds}
                      editing={editing}
                      setEditing={setEditing}
                      onAnswer={(a, o) => onAnswer(current, a, o)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 pt-16 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    data-testid="validate-done"
                  >
                    <Check className="size-8 text-primary" />
                    <span className="text-lg font-semibold">{working ? "Looking for more" : "All caught up"}</span>
                    {footer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {laterCount ? (
              <span className="mt-4 text-xs text-muted-foreground" data-testid="validate-later">
                {laterCount} for later
              </span>
            ) : null}
          </div>

          {/* Answered: a side tray on desktop… */}
          {wide ? (
          <aside className="flex flex-col border-l border-border" aria-label="Answered">
            <div className="sticky top-0 flex max-h-dvh flex-col pt-[calc(var(--shell-header-h,0px)+1.5rem)]">
              <span className="px-4 text-xs font-medium text-muted-foreground">Answered {answered.length || ""}</span>
              <ul className="mt-2 flex flex-col overflow-y-auto px-4 pb-6">
                <AnimatePresence initial={false}>
                  {answered.map((e) => (
                    <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </aside>
          ) : null}
        </div>

        {/* …and a strip at the bottom on a phone. */}
        {wide ? null : (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-safe lg:hidden" data-matrx-floating-bottom data-testid="validate-tray-phone">
          <div className={`grid ${PANEL_MOTION_CLASS} transition-[grid-template-rows] ${trayOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden" inert={!trayOpen} aria-hidden={!trayOpen}>
              <ul className="max-h-[45dvh] overflow-y-auto px-4">
                {answered.slice(1).map((e) => (
                  <TrayRow key={e.id} entry={e} onUndo={() => onUndo(e)} />
                ))}
              </ul>
            </div>
          </div>
          <div className="flex h-14 items-center gap-2 px-4">
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
