"use client";

/**
 * Smart Add — the intake stage (the first thing a person sees). Champions and what this takes:
 *  - Stripe: a living mesh/aurora behind a single message (StageBackdrop, built from theme tokens).
 *  - Linear: one calm question in display type with tight tracking; keyboard first (1/2/3, Enter, Esc).
 *  - Raycast: ONE big frosted command input that understands what you type (favicon for a domain,
 *    the platform's mark for a profile) and grows a second row instead of a second field.
 *  - Vercel import: the work shows as quiet ticks under a live centerpiece, never a spinner.
 *  - Arc: choices morph into the input, and every real finding flies into its slot on the
 *    structured page as a shared element (motion `layoutId`, see stage/Shared.tsx).
 * Nothing animates that is not real: the centerpiece shows the typed site's own favicon or the
 * typed account's platform until a real logo/name/account arrives from the identify run.
 */

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "@ai-matrx/design-system/controls";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Briefcase,
  Building2,
  Check,
  Globe,
  MapPin,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { needsPlatformPick, resolveAccountInput } from "@/features/marketing/social/account-input";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import type { SocialPlatform } from "@/features/marketing/social/types";
import { customItem, websiteHost, type EvidenceItem } from "./evidence";
import type { RoundView } from "./SmartAddRound";
import { AiTestReplayBadge } from "@/features/ai-test-mode/AiTestReplayBadge";
import { SMART_ADD_ADDRESS_DEBOUNCE_MS, type SmartAddPatch, type SmartAddPrefill, type SmartAddVia } from "./smartAddUrl";
import { Shared } from "./stage/Shared";
import { entryCopy, handleProblem, websiteProblem, type EntryOutcome } from "./entryOutcome";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import styles from "./stage/stage.module.css";
import { withReferral } from "@ai-matrx/kit/outbound";

type Mode = "website" | "social" | "name";

const STEP_LABEL: Record<string, string> = {
  probe: "Website",
  page: "Page",
  avatars: "Photos",
  socials: "Accounts",
};

/** The platforms offered for a bare @handle, most common first. */
const PICKABLE: SocialPlatform[] = ["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "threads", "pinterest"];

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

function looksLikeDomain(text: string): boolean {
  return /^[^\s@]+\.[a-z]{2,}(\/.*)?$/i.test(text.trim().replace(/^https?:\/\//i, ""));
}

/** What a person typed beside the name and city (all optional). */
export interface PersonMore {
  occupation: string;
  company: string;
  extra: string;
}

export function SmartAddHero({
  person,
  onPerson,
  onFindPerson,
  onWebsite,
  onSocial,
  onPick,
  working,
  views,
  items,
  nothingFound,
  failed,
  onAdd,
  initial,
  via,
  initialVia = null,
  onVia,
  onDraft,
  autoStart = false,
  resumed = false,
  outcome = null,
  slow = false,
  onRestart,
  onStarted,
}: {
  person: boolean;
  onPerson: (person: boolean) => void;
  /** Person name mode: start the anchor round ("Which of these is you?") on the typed name, city and clues. */
  onFindPerson?: (name: string, city: string, more: PersonMore) => void;
  onWebsite: (v: string) => void;
  onSocial: (v: string) => void;
  onPick: (p: SocialPlatform | null) => void;
  working: boolean;
  views: RoundView[];
  /** Every finding so far (ordered); the centerpiece shows only real ones. */
  items: EvidenceItem[];
  nothingFound: boolean;
  /** A round broke (not "searched and found nothing"). */
  failed: boolean;
  onAdd: (items: EvidenceItem[]) => void;
  /** The Smart Add page's address (smartAddUrl.ts): typed values from a deep link or a resumed session. */
  initial?: SmartAddPrefill;
  /** `via=` as Back/Forward move it; undefined = no address (the lab). */
  via?: SmartAddVia | null;
  initialVia?: SmartAddVia | null;
  /** Choosing or leaving a way in (a history entry, so Back closes the card). */
  onVia?: (via: SmartAddVia | null) => void;
  /** What is typed, debounced, for the address. */
  onDraft?: (draft: SmartAddPatch) => void;
  /** Opened from a link carrying a prefill: start as if Go was pressed (it spends points). */
  autoStart?: boolean;
  /** A resumed session: the search is already running or done. */
  resumed?: boolean;
  /** What was typed does not exist (or cannot be read): the stage ends on this answer, never on findings. */
  outcome?: EntryOutcome | null;
  /** No new step for the quiet-time knob while a round runs. */
  slow?: boolean;
  /** Stop and reset the session ("over" also clears the address); false = the person kept going. */
  onRestart?: (how: "edit" | "retry" | "over") => Promise<boolean>;
  /** A search starts (one history entry: Back returns here). */
  onStarted?: () => void;
}) {
  const [mode, setModeState] = useState<Mode | null>(initialVia);
  const setMode = (m: Mode | null) => {
    setModeState(m);
    onVia?.(m);
  };
  // Back / Forward move `via=`: the card follows the address.
  const lastVia = useRef(via);
  useEffect(() => {
    if (via === undefined || via === lastVia.current) return;
    lastVia.current = via;
    setModeState(via);
  }, [via]);
  const [site, setSite] = useState(initial?.website ?? "");
  const [social, setSocial] = useState(initial?.social ?? "");
  const [picked, setPicked] = useState<SocialPlatform | null>(initial?.platform ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  // Person clues beside the city (VISION Part 10): occupation, company, anything else (school, a profile link).
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [extra, setExtra] = useState("");
  // Name + city only: ask once for the job or company before searching (a location never grounds a person).
  const [askedClue, setAskedClue] = useState(false);
  const [second, setSecond] = useState(false);
  const [submitted, setSubmitted] = useState(resumed);

  const parsed = resolveAccountInput({ text: social, picked });
  // Up-front checks: an address or handle that cannot exist never starts a paid run; the reason shows inline.
  const siteProblem = websiteProblem(site);
  const handleIssue = parsed.status === "ok" ? handleProblem(parsed.platform, parsed.handle) : null;
  const socialOk = parsed.status === "ok" && (parsed.detected || Boolean(picked)) && !handleIssue;
  const siteOk = looksLikeDomain(site) && !siteProblem;
  const host = siteOk ? websiteHost(site.trim()) : null;
  const needsPick = social.trim() !== "" && needsPlatformPick(parsed, null);

  const socialOkFor = (pk: SocialPlatform | null) => {
    const p = resolveAccountInput({ text: social, picked: pk });
    return p.status === "ok" && (p.detected || Boolean(pk)) && !handleProblem(p.platform, p.handle);
  };
  // The one inline problem the entry row shows (only for what the open card holds).
  const typedProblem =
    mode === "website" ? (site.trim() ? siteProblem : null) ?? (second && social.trim() ? handleIssue : null)
    : mode === "social" ? (social.trim() ? handleIssue : null) ?? (second && site.trim() ? siteProblem : null)
    : null;
  const readyFor = (pk: SocialPlatform | null) => {
    const ok = socialOkFor(pk);
    return mode === "website" ? siteOk && (!second || !social.trim() || ok)
      : mode === "social" ? ok && (!second || !site.trim() || siteOk)
      : mode === "name" ? name.trim().length > 1
      : false;
  };
  const ready = readyFor(picked);

  const phase: "choose" | "enter" | "identifying" | "nothing" | "outcome" =
    submitted && outcome ? "outcome" : submitted && nothingFound ? "nothing" : submitted ? "identifying" : mode ? "enter" : "choose";

  /** Back to the field (what was typed kept): the search stops; asks first when findings or answers would go. */
  const edit = async () => {
    if ((await onRestart?.("edit")) === false) return;
    setSubmitted(false);
  };
  /** The same way in, an empty field. */
  const another = async () => {
    if ((await onRestart?.("edit")) === false) return;
    if (mode === "website") setSite("");
    else setSocial("");
    setPicked(null);
    setSecond(false);
    setSubmitted(false);
  };
  /** The name way in instead (a handle that does not exist is often a business that does). */
  const byName = async () => {
    if ((await onRestart?.("edit")) === false) return;
    setSecond(false);
    setSubmitted(false);
    setMode("name");
  };

  const submit = (pk: SocialPlatform | null = picked) => {
    if (!readyFor(pk)) return;
    if (mode === "name" && person && onFindPerson) {
      if (!occupation.trim() && !company.trim() && !askedClue) {
        setAskedClue(true);
        return;
      }
      onFindPerson(name.trim(), city.trim(), { occupation: occupation.trim(), company: company.trim(), extra: extra.trim() });
      setSubmitted(true);
      return;
    }
    if (mode === "name") {
      const answers = [customItem("name", name)];
      if (city.trim()) answers.push(customItem("address", city));
      onAdd(answers);
      setSubmitted(true);
      return;
    }
    onWebsite(siteOk ? site.trim() : "");
    onSocial(socialOkFor(pk) ? social.trim() : "");
    onPick(pk);
    onStarted?.();
    setSubmitted(true);
  };
  /** Try the same input again (a lookup service hiccup, a slow site). */
  const retry = async () => {
    if ((await onRestart?.("retry")) === false) return;
    submit();
  };
  // Picking the platform is the last thing a bare handle needs: it starts the search.
  const pickPlatform = (p: SocialPlatform) => {
    setPicked(p);
    submit(p);
  };

  const choose = (m: Mode) => {
    setMode(m);
    setSecond(false);
  };

  // A link with something typed in it starts once, as if Go was pressed.
  const autoStarted = useRef(false);
  const startFromLink = useEffectEvent(() => submit());
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    startFromLink();
  }, [autoStart]);

  // What is typed rides the address (debounced replace; a blank field leaves it).
  const draft = useEffectEvent(() =>
    onDraft?.({
      website: site.trim() || null,
      social: social.trim() || null,
      platform: picked,
      name: name.trim() || null,
      city: city.trim() || null,
      occupation: occupation.trim() || null,
      company: company.trim() || null,
    }),
  );
  useEffect(() => {
    const timer = setTimeout(draft, SMART_ADD_ADDRESS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [site, social, picked, name, city, occupation, company]);

  // 1 / 2 / 3 pick a way in while nothing is focused for typing.
  useEffect(() => {
    if (phase !== "choose") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const m = ({ "1": "website", "2": "social", "3": "name" } as const)[e.key as "1" | "2" | "3"];
      if (m) {
        e.preventDefault();
        choose(m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onFieldKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && phase === "enter") {
      e.preventDefault();
      setMode(null);
    }
  };

  const compact = phase === "identifying" || phase === "nothing" || phase === "outcome";
  const answer = phase === "outcome" && outcome ? entryCopy(outcome) : null;

  return (
    <MotionConfig reducedMotion="user">
      <section
        // The shell gives this <main> a bottom runway (the page end once, clear of floating chrome). The stage fills the frame LESS that
        // runway so the two never add up to a scroll when the content fits, and carries no bottom padding of its own.
        className={`relative flex min-h-[calc(100%-var(--matrx-floating-clearance))] w-full flex-col items-center px-4 ${
          compact
            ? "justify-start pt-[calc(var(--shell-header-h,3rem)+5vh)]"
            : "justify-center pt-[calc(var(--shell-header-h,3rem)+2rem)]"
        }`}
        data-smart-add-stage="intake"
        data-testid="smart-add-hero"
      >
        <motion.div layout transition={SPRING} className={`flex w-full flex-col items-center ${phase === "choose" ? "max-w-[60rem]" : "max-w-[44rem]"}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            {compact ? null : (
              <motion.div
                key="headline"
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="mb-9 flex flex-col items-center gap-3 text-center sm:mb-12"
              >
                <h1 className="text-balance text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-[3.75rem]">
                  {mode === "name" && person ? (
                    <>
                      Let&apos;s find <span className={styles.shimmer}>you</span>
                    </>
                  ) : (
                    <>
                      Let&apos;s find your <span className={styles.shimmer}>brand</span>
                    </>
                  )}
                </h1>
                <p className="text-base text-muted-foreground sm:text-lg">Start with anything you have.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {phase === "choose" ? (
              <ChoiceCards key="cards" onChoose={choose} />
            ) : (
              <motion.div
                key={`shell-${mode}`}
                layoutId={`smart-add:card-${mode}`}
                transition={SPRING}
                className={`${styles.shell} w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.4rem]`}
              >
                <Shared id="signals" as="div" className="block">
                  {compact ? (
                    <CompactSignals
                      mode={mode}
                      host={host}
                      site={siteOk ? site.trim() : ""}
                      parsedLabel={parsed.status === "ok" && socialOk ? parsed.label : null}
                      platform={parsed.status === "ok" && socialOk ? parsed.platform : null}
                      name={name.trim()}
                      person={person}
                      onEdit={() => void edit()}
                    />
                  ) : mode === "name" ? (
                    <>
                      <BigRow
                        icon={person ? <UserRound className="size-6" /> : <Building2 className="size-6" />}
                        value={name}
                        onChange={setName}
                        onKeyDown={onFieldKey}
                        placeholder={person ? "Your full name" : "Business name"}
                        label={person ? "Your name" : "Business name"}
                        go={<GoButton disabled={!ready} onClick={() => submit()} />}
                      />
                      <SubRow
                        icon={<MapPin className="size-[1.1rem]" />}
                        value={city}
                        onChange={setCity}
                        onKeyDown={onFieldKey}
                        placeholder="City (optional)"
                        label="City"
                      />
                      {person ? (
                        <>
                          <SubRow
                            icon={<Briefcase className="size-[1.1rem]" />}
                            value={occupation}
                            onChange={setOccupation}
                            onKeyDown={onFieldKey}
                            placeholder="Occupation (optional)"
                            label="Occupation"
                          />
                          <SubRow
                            icon={<Building2 className="size-[1.1rem]" />}
                            value={company}
                            onChange={setCompany}
                            onKeyDown={onFieldKey}
                            placeholder="Company or employer (optional)"
                            label="Company or employer"
                          />
                          <SubRow
                            icon={<PenLine className="size-[1.1rem]" />}
                            value={extra}
                            onChange={setExtra}
                            onKeyDown={onFieldKey}
                            placeholder="Anything else: school, a profile link"
                            label="Anything else"
                          />
                          {askedClue && !occupation.trim() && !company.trim() ? (
                            <div
                              data-testid="smart-add-ask-clue"
                              className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2 text-sm"
                            >
                              <span className="text-foreground">Your job or company finds you faster</span>
                              <button
                                type="button"
                                className="shrink-0 text-sm font-medium text-primary hover:underline"
                                onClick={() => {
                                  onFindPerson?.(name.trim(), city.trim(), { occupation: "", company: "", extra: extra.trim() });
                                  setSubmitted(true);
                                }}
                              >
                                Search anyway
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {mode === "website" ? (
                        <BigRow
                          icon={<SiteMark host={host} />}
                          value={site}
                          onChange={setSite}
                          onKeyDown={onFieldKey}
                          // ui-exception: a web address is a raw value, not prose
                          placeholder="yourbrand.com"
                          label="Website"
                          inputMode="url"
                          go={<GoButton disabled={!ready} onClick={() => submit()} />}
                        />
                      ) : (
                        <BigRow
                          icon={<SocialMark parsed={parsed} ok={socialOk} />}
                          value={social}
                          onChange={setSocial}
                          onKeyDown={onFieldKey}
                          // ui-exception: a handle or address is a raw value, not prose
                          placeholder="@handle or profile link"
                          label="Handle or link"
                          tag={socialOk && parsed.status === "ok" ? platformLabel(parsed.platform) : null}
                          go={<GoButton disabled={!ready} onClick={() => submit()} />}
                        />
                      )}
                      {mode === "social" && needsPick ? <PlatformPick picked={picked} onPick={pickPlatform} /> : null}
                      <AnimatePresence initial={false}>
                        {second ? (
                          <motion.div
                            key="second"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                          >
                            {mode === "website" ? (
                              <>
                                <SubRow
                                  icon={<SocialMark parsed={parsed} ok={socialOk} small />}
                                  value={social}
                                  onChange={setSocial}
                                  onKeyDown={onFieldKey}
                                  // ui-exception: a handle or address is a raw value, not prose
                                  placeholder="@handle or profile link"
                                  label="Handle or link"
                                  autoFocus
                                  tag={socialOk && parsed.status === "ok" ? platformLabel(parsed.platform) : null}
                                  onRemove={() => {
                                    setSecond(false);
                                    setSocial("");
                                  }}
                                />
                                {needsPick ? <PlatformPick picked={picked} onPick={pickPlatform} /> : null}
                              </>
                            ) : (
                              <SubRow
                                icon={<SiteMark host={host} small />}
                                value={site}
                                onChange={setSite}
                                onKeyDown={onFieldKey}
                                // ui-exception: a web address is a raw value, not prose
                                placeholder="yourbrand.com"
                                label="Website"
                                autoFocus
                                onRemove={() => {
                                  setSecond(false);
                                  setSite("");
                                }}
                              />
                            )}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </>
                  )}
                </Shared>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Below the input: one quiet row of options while entering (fixed height, never shifts). */}
          {phase === "enter" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="mt-5 flex h-9 w-full items-center justify-between px-1 text-sm"
            >
              <QuietButton onClick={() => setMode(null)} icon={<ArrowLeft className="size-4" />}>
                Back
              </QuietButton>
              {typedProblem ? (
                <span role="alert" data-testid="smart-add-entry-problem" className="min-w-0 flex-1 truncate px-3 text-destructive-ink">
                  {typedProblem}
                </span>
              ) : null}
              {mode === "name" ? (
                <KindToggle person={person} onPerson={onPerson} />
              ) : (
                <div className="flex items-center gap-2">
                  {/* A creator entered by handle is marked a person here (PEOPLE-AND-CREATORS §10). */}
                  {mode === "social" ? <KindToggle person={person} onPerson={onPerson} /> : null}
                  {second ? null : (
                    <QuietButton onClick={() => setSecond(true)} icon={<Plus className="size-4" />}>
                      {mode === "website" ? "Add a social" : "Add a website"}
                    </QuietButton>
                  )}
                </div>
              )}
            </motion.div>
          ) : null}

          {compact ? (
            <Centerpiece
              items={items}
              views={views}
              working={phase === "outcome" ? false : working || (phase === "identifying" && mode !== "name")}
              settled={phase === "nothing" || phase === "outcome"}
              failed={failed}
              answerTitle={answer?.title ?? null}
              host={host}
              platform={parsed.status === "ok" && socialOk ? parsed.platform : null}
              typedName={mode === "name" ? name.trim() : null}
            />
          ) : null}

          {phase === "identifying" && slow ? (
            <StillWorking onStop={() => void edit()} onStartOver={() => void onRestart?.("over")} />
          ) : null}
          {answer ? (
            <EntryAnswer
              line={answer.line}
              onEdit={() => void edit()}
              onAnother={() => void another()}
              onName={mode === "name" ? undefined : () => void byName()}
              onRetry={answer.retry ? () => void retry() : undefined}
            />
          ) : null}
          {phase === "nothing" ? <NothingFound failed={failed} person={person} onAnswer={onAdd} onRetry={() => void edit()} /> : null}
        </motion.div>
      </section>
    </MotionConfig>
  );
}

// ── Choices ──────────────────────────────────────────────────────────────────

const CHOICES: { mode: Mode; title: string; hint: string }[] = [
  { mode: "website", title: "Website", hint: "yourbrand.com" },
  { mode: "social", title: "Social", hint: "Any profile or @handle" },
  { mode: "name", title: "Company or Person", hint: "A name and a city" },
];

/** A tiny browser window: the site you already have. */
function WebsiteVisual() {
  return (
    <span className="relative flex h-[5.5rem] w-36 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_14px_30px_-16px_hsl(var(--foreground)/0.45)] transition-transform duration-300 group-hover:-rotate-1 group-hover:scale-[1.04]">
      <span className="flex h-4 items-center gap-1 border-b border-border/70 px-1.5">
        <span className="size-1.5 rounded-full bg-foreground/25" />
        <span className="size-1.5 rounded-full bg-foreground/25" />
        <span className="size-1.5 rounded-full bg-foreground/25" />
        <span className="ml-1.5 h-2 flex-1 rounded-full bg-foreground/[0.08]" />
      </span>
      <span className="flex flex-1 gap-2 p-2">
        <span className="w-10 rounded bg-gradient-to-br from-primary/60 to-primary/20" />
        <span className="flex flex-1 flex-col gap-1 pt-0.5">
          <span className="h-1.5 w-full rounded-full bg-foreground/20" />
          <span className="h-1.5 w-4/5 rounded-full bg-foreground/[0.12]" />
          <span className="h-1.5 w-3/5 rounded-full bg-foreground/[0.12]" />
          <span className="mt-auto h-2.5 w-10 rounded-sm bg-primary/70" />
        </span>
      </span>
    </span>
  );
}

const CLUSTER: { p: SocialPlatform; x: number; y: number; r: number }[] = [
  { p: "instagram", x: 0, y: 0, r: -8 },
  { p: "facebook", x: 38, y: -10, r: 6 },
  { p: "x", x: 76, y: 4, r: -4 },
  { p: "tiktok", x: 14, y: 40, r: 7 },
  { p: "linkedin", x: 52, y: 32, r: -6 },
  { p: "youtube", x: 90, y: 42, r: 5 },
];

/** The real platform marks, as they are, loosely stacked; they fan out on hover. */
function SocialVisual() {
  return (
    <span className="relative block h-[5.5rem] w-[8.5rem]">
      {CLUSTER.map((c, i) => (
        <span
          key={c.p}
          className="absolute transition-transform duration-300 ease-out group-hover:[transform:translate(var(--dx),var(--dy))_rotate(0deg)]"
          style={{
            left: c.x,
            top: c.y + 10,
            transform: `rotate(${c.r}deg)`,
            ["--dx" as string]: `${(i % 3) * 3 - 3}px`,
            ["--dy" as string]: `${i < 3 ? -4 : 4}px`,
          }}
        >
          <PlatformMark platform={c.p} size={34} />
        </span>
      ))}
    </span>
  );
}

/** A building beside a portrait: a business or a person. */
function NameVisual() {
  return (
    <span className="relative flex h-[5.5rem] w-36 items-end justify-center gap-1">
      <Building2 className="size-[4.5rem] text-foreground/70 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={1.1} />
      <svg viewBox="0 0 64 64" className="size-[3.75rem] text-foreground/70 transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
        <circle cx="32" cy="22" r="11" fill="currentColor" opacity="0.85" />
        <path d="M10 62c1.5-13 10.5-21 22-21s20.5 8 22 21z" fill="currentColor" opacity="0.85" />
      </svg>
    </span>
  );
}

const VISUAL: Record<Mode, () => ReactNode> = {
  website: WebsiteVisual,
  social: SocialVisual,
  name: NameVisual,
};

function ChoiceCards({ onChoose }: { onChoose: (m: Mode) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = refs.current.findIndex((el) => el === document.activeElement);
    if (i < 0) return;
    const next = ["ArrowRight", "ArrowDown"].includes(e.key) ? i + 1 : ["ArrowLeft", "ArrowUp"].includes(e.key) ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    refs.current[(next + CHOICES.length) % CHOICES.length]?.focus();
  };
  return (
    <motion.div
      role="group"
      aria-label="Start with"
      onKeyDown={onKey}
      initial={false}
      exit={{ opacity: 0 }}
      className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5"
    >
      {CHOICES.map((c, i) => {
        const Visual = VISUAL[c.mode];
        return (
          <motion.button
            key={c.mode}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            layoutId={`smart-add:card-${c.mode}`}
            transition={SPRING}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.08 + i * 0.07, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={() => onChoose(c.mode)}
            data-clickable
            className={`${styles.card} group flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-glass-edge p-3 pr-4 text-left sm:min-h-[19rem] sm:flex-col sm:items-stretch sm:gap-0 sm:p-0`}
          >
            {/* The picture: a phone shows it small at the left, a desktop gives it the stage. */}
            <span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden sm:h-44 sm:w-full">
              <span className="origin-center scale-[0.6] sm:scale-125">
                <Visual />
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none sm:px-6 sm:pb-6">
              <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{c.title}</span>
              <span className="text-sm text-muted-foreground sm:text-[0.95rem]">{c.hint}</span>
            </span>
            <kbd className="absolute right-4 top-4 hidden rounded-md border border-border/70 px-1.5 font-mono text-[11px] text-muted-foreground/70 sm:block">
              {i + 1}
            </kbd>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 sm:hidden" />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ── The big input ────────────────────────────────────────────────────────────

function BigRow({
  icon,
  value,
  onChange,
  onKeyDown,
  placeholder,
  label,
  tag,
  go,
  inputMode,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  label: string;
  tag?: string | null;
  go: ReactNode;
  inputMode?: "url" | "text";
}) {
  return (
    <div className="flex h-16 items-center gap-2 pl-3 pr-2 sm:h-[4.5rem] sm:gap-3 sm:pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
      <input
        aria-label={label}
        autoFocus
        value={value}
        inputMode={inputMode}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${styles.bigInput} h-full min-w-0 flex-1 text-[1.3rem] font-medium tracking-tight text-foreground sm:text-2xl`}
      />
      <AnimatePresence initial={false}>
        {tag ? (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="hidden shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline"
          >
            {tag}
          </motion.span>
        ) : null}
      </AnimatePresence>
      {go}
    </div>
  );
}

function SubRow({
  icon,
  value,
  onChange,
  onKeyDown,
  placeholder,
  label,
  tag,
  autoFocus,
  onRemove,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  label: string;
  tag?: string | null;
  autoFocus?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="flex h-14 items-center gap-2 border-t border-border/60 pl-3 pr-3 sm:gap-3 sm:pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
      <input
        aria-label={label}
        autoFocus={autoFocus}
        value={value}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${styles.bigInput} h-full min-w-0 flex-1 text-lg text-foreground`}
      />
      {tag ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{tag}</span> : null}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function GoButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Find"
      disabled={disabled}
      onClick={onClick}
      className={`${styles.go} flex size-12 shrink-0 items-center justify-center rounded-[0.9rem] text-primary-foreground sm:size-14 sm:rounded-2xl`}
    >
      <ArrowRight className="size-6" strokeWidth={2.25} />
    </button>
  );
}

function QuietButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      {icon}
      {children}
    </button>
  );
}

function KindToggle({ person, onPerson }: { person: boolean; onPerson: (p: boolean) => void }) {
  return (
    <div role="radiogroup" aria-label="Brand kind" className="relative flex h-9 items-center rounded-full bg-foreground/5 p-1">
      {([false, true] as const).map((p) => {
        const on = person === p;
        return (
          <button
            key={String(p)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPerson(p)}
            className={`relative z-10 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {on ? (
              <motion.span layoutId="smart-add:kind-pill" transition={SPRING} className="absolute inset-0 -z-10 rounded-full bg-card shadow-sm" />
            ) : null}
            {p ? <UserRound className="size-3.5" /> : <Building2 className="size-3.5" />}
            {p ? "Person" : "Company"}
          </button>
        );
      })}
    </div>
  );
}

/** The typed domain's own favicon (fetched from the site itself), else the globe. */
function SiteMark({ host, small }: { host: string | null; small?: boolean }) {
  const [settled, setSettled] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState<string | null>(null);
  // Debounced, so a half-typed domain never requests icons.
  useEffect(() => {
    const t = setTimeout(() => {
      setSettled(host);
      setStep(0);
    }, 350);
    return () => clearTimeout(t);
  }, [host]);
  const sources = settled ? [`https://${settled}/favicon.ico`, `https://${settled}/apple-touch-icon.png`] : [];
  const src = sources[step] ?? null;
  const size = small ? "size-5" : "size-7";
  const shown = src !== null && loaded === src;
  return (
    <span className="relative flex items-center justify-center">
      {/* The icon loads hidden; the globe holds the slot until it is really there. */}
      {src && !shown ? (
        <img
          key={src}
          src={src}
          alt=""
          className="pointer-events-none absolute size-px opacity-0"
          onLoad={(e) => (e.currentTarget.naturalWidth > 1 ? setLoaded(src) : setStep((s) => s + 1))}
          onError={() => setStep((s) => s + 1)}
        />
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {shown ? (
          <motion.img
            key={src}
            src={src}
            alt=""
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={SPRING}
            className={`${size} object-contain`}
          />
        ) : (
          <motion.span key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Globe className={small ? "size-5" : "size-6"} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** The detected platform's mark as soon as the text names one; the @ until then. */
function SocialMark({ parsed, ok, small }: { parsed: ReturnType<typeof resolveAccountInput>; ok: boolean; small?: boolean }) {
  const platform = ok && parsed.status === "ok" ? parsed.platform : null;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {platform ? (
        <motion.span
          key={platform}
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={SPRING}
          className="flex"
        >
          <PlatformMark platform={platform} size={small ? 20 : 28} />
        </motion.span>
      ) : (
        <motion.span key="at" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AtSign className={small ? "size-5" : "size-6"} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** A bare @handle: which platform is it on? One tap. */
function PlatformPick({ picked, onPick }: { picked: SocialPlatform | null; onPick: (p: SocialPlatform) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap items-center gap-1 border-t border-border/60 px-3 py-2 sm:px-4"
      role="radiogroup"
      aria-label="Platform"
    >
      <span className="mr-1 shrink-0 text-xs font-medium text-muted-foreground">On</span>
      {PICKABLE.map((p) => {
        const on = picked === p;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={platformLabel(p)}
            title={platformLabel(p)}
            onClick={() => onPick(p)}
            className="relative flex size-12 shrink-0 items-center justify-center transition-transform hover:-translate-y-0.5"
          >
            <PlatformMark platform={p} size={32} />
            {on ? (
              <motion.span layoutId="smart-add:platform-pick" transition={SPRING} className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
            ) : null}
          </button>
        );
      })}
    </motion.div>
  );
}

/** The submitted signals, one calm line, once the input has glided up. */
function CompactSignals({
  mode,
  host,
  site,
  parsedLabel,
  platform,
  name,
  person,
  onEdit,
}: {
  person: boolean;
  mode: Mode | null;
  host: string | null;
  site: string;
  parsedLabel: string | null;
  platform: SocialPlatform | null;
  name: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex h-14 items-center gap-3 pl-4 pr-2">
      {mode === "name" ? (
        <span className="flex min-w-0 items-center gap-2 text-lg font-medium">
          {person ? (
            <UserRound className="size-5 shrink-0 text-muted-foreground" />
          ) : (
            <Building2 className="size-5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{name}</span>
        </span>
      ) : (
        <span className="flex min-w-0 items-center gap-4 text-lg font-medium">
          {site ? (
            <span className="flex min-w-0 items-center gap-2">
              <SiteMark host={host} small />
              <span className="truncate">{host ?? site}</span>
            </span>
          ) : null}
          {parsedLabel && platform ? (
            <span className="flex min-w-0 items-center gap-2">
              <PlatformMark platform={platform} size={18} />
              <span className="truncate">{parsedLabel}</span>
            </span>
          ) : null}
        </span>
      )}
      <button
        type="button"
        aria-label="Edit"
        title="Edit"
        onClick={onEdit}
        className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      >
        <PenLine className="size-4" />
      </button>
    </div>
  );
}

// ── Identifying ──────────────────────────────────────────────────────────────

function Centerpiece({
  items,
  views,
  working,
  settled,
  failed,
  host,
  platform,
  typedName,
  answerTitle = null,
}: {
  items: EvidenceItem[];
  views: RoundView[];
  working: boolean;
  settled: boolean;
  failed: boolean;
  /** The entry's answer ("No account found"): wins over any name, so nothing is ever made from what was typed. */
  answerTitle?: string | null;
  host: string | null;
  platform: SocialPlatform | null;
  typedName: string | null;
}) {
  const real = realFindings(items);
  const logos = real.filter((i) => i.field === "logo" && (i.image_url || i.profile_id));
  const logo = stageLogo(items);
  const names = real.filter((i) => i.field === "name");
  const nameItem = stageName(items);
  const colors = useLogoColors(logo?.image_url ?? null);
  const sub = real.find((i) => i.field === "tagline") ?? real.find((i) => i.field === "category") ?? null;
  const socials = real.filter((i) => i.field === "social").slice(0, 5);
  const photoByPlatform = new Map<string, EvidenceItem>();
  for (const l of logos) if (l.profile_id && l.platform) photoByPlatform.set(l.platform, l);
  const steps = views.flatMap((v) => v.steps).filter((s) => !s.skipped && s.phase !== "idle" && STEP_LABEL[s.step]);
  // AI test mode: a round answered from saved results says so (a stand-in outranks a replay).
  const savedReplays = views.flatMap((v) => v.replays ?? []);
  const savedAnswer = savedReplays.find((r) => r.match === "stand_in") ?? savedReplays[0] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex w-full flex-col items-center ${settled ? `mt-8 ${styles.settled}` : "mt-12 sm:mt-14"}`}
      aria-live="polite"
    >
      {/* The mark, inside its orbit. */}
      <div className={`relative flex items-center justify-center transition-transform duration-500 ${settled ? "size-40 scale-75 sm:scale-90" : "size-40 sm:size-44"}`}>
        <span className={`${styles.halo} absolute -inset-10 rounded-full`} />
        <span className={`${styles.orbitSlow} absolute inset-0 rounded-full`}>
          <span className={`${styles.satellite} absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full`} />
        </span>
        <span className={`${styles.orbit} absolute inset-3 rounded-full`} />
        <span className="relative flex size-28 items-center justify-center sm:size-[7.5rem]">
          <AnimatePresence mode="popLayout" initial={false}>
            {logo ? (
              <Shared key={logo.key} id={logo.key} className="flex size-full items-center justify-center">
                {logo.profile_id ? (
                  <SocialImage
                    door={profileAvatarDoor(logo.profile_id)}
                    url={logo.image_url}
                    fallback={<Globe className="size-8 text-muted-foreground/40" />}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <img src={logo.image_url ?? ""} alt="" className="max-h-[78%] max-w-[78%] object-contain drop-shadow-[0_10px_24px_hsl(var(--foreground)/0.18)]" />
                )}
              </Shared>
            ) : (
              <motion.span key="mark" exit={{ opacity: 0, scale: 0.7 }} className="flex items-center justify-center">
                {host ? (
                  <span className="scale-[1.6]">
                    <SiteMark host={host} />
                  </span>
                ) : platform ? (
                  <PlatformMark platform={platform} size={44} />
                ) : typedName ? (
                  <span className="text-4xl font-semibold tracking-tight text-primary">{typedName.slice(0, 1).toUpperCase()}</span>
                ) : (
                  <Globe className="size-9 text-muted-foreground/50" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>

      {/* The name types out as it arrives; reserved height so nothing below moves. */}
      <div className={`flex h-11 w-full items-center justify-center px-2 sm:h-12 ${settled ? "mt-2" : "mt-8"}`}>
        {answerTitle ? (
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="smart-add-entry-answer">
            {answerTitle}
          </span>
        ) : nameItem ? (
          <Shared id={nameItem.key} positionOnly className="max-w-full truncate text-[1.75rem] font-semibold tracking-[-0.03em] sm:text-4xl">
            <Typewriter text={nameItem.value} />
          </Shared>
        ) : typedName ? (
          // Their own word, already confirmed: it flies to the name slot like any finding.
          <Shared id={customItem("name", typedName).key} positionOnly className="max-w-full truncate text-[1.75rem] font-semibold tracking-[-0.03em] sm:text-4xl">
            {typedName}
          </Shared>
        ) : settled ? (
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{failed ? "The lookup didn't finish" : "Nothing online yet"}</span>
        ) : (
          <span className="h-3 w-44 rounded-full bg-foreground/[0.07] motion-safe:animate-pulse" />
        )}
      </div>
      <div className="flex h-6 w-full items-center justify-center px-2">
        <AnimatePresence>
          {sub ? (
            <motion.span
              key={sub.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full truncate text-sm text-muted-foreground sm:text-base"
            >
              {sub.value}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* The logo's own colors, sampled from the real image; nothing shows when it cannot be read. */}
      <div className={`flex w-full items-center justify-center gap-2 ${settled ? "hidden" : "mt-3 h-7"}`}>
        <AnimatePresence>
          {colors.map((c, i) => (
            <motion.span
              key={c}
              title={c}
              initial={{ opacity: 0, y: -14, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: 0.25 + i * 0.08 }}
              className="size-6 rounded-full shadow-[0_6px_14px_-6px_hsl(var(--foreground)/0.5)] ring-1 ring-inset ring-foreground/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Accounts pop in with their real photos. */}
      <div className={`flex w-full flex-wrap items-center justify-center gap-2 ${settled ? "hidden" : "mt-5 min-h-11"}`}>
        <AnimatePresence>
          {socials.map((s, i) => {
            const photo = s.profile_id ? s : photoByPlatform.get(s.platform ?? "");
            return (
              <motion.a
                key={s.key}
                href={withReferral(/^https?:\/\//i.test(s.url ?? s.value) ? (s.url ?? s.value) : `https://${s.url ?? s.value}`)}
                target="_blank"
                rel="noopener"
                title={platformLabel(s.platform ?? "")}
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.06 }}
                className="inline-flex min-h-11 max-w-[18rem] items-center gap-2.5 rounded-2xl border border-glass-edge bg-card/70 px-1.5 py-1.5 text-left text-sm font-medium leading-tight shadow-sm backdrop-blur-md transition-colors hover:bg-card"
              >
                <Shared id={s.key} className="flex size-8 shrink-0 items-center justify-center">
                  {photo?.profile_id ? (
                    <SocialImage
                      door={profileAvatarDoor(photo.profile_id)}
                      url={photo.image_url}
                      fallback={<PlatformMark platform={s.platform ?? ""} size={28} />}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <PlatformMark platform={s.platform ?? ""} size={28} />
                  )}
                </Shared>
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{accountLabel(s, names)}</span>
                {photo?.profile_id ? <PlatformMark platform={s.platform ?? ""} size={16} className="mr-1 shrink-0" /> : <span className="w-1 shrink-0" />}
              </motion.a>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quiet ticks for the real steps: a breathing dot while running, a check when done. */}
      <div className={`flex h-6 flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground ${settled ? "mt-1" : "mt-6"}`}>
        {working && steps.length === 0 ? <span className={`${styles.tickDot} size-1.5 rounded-full`} /> : null}
        {steps.map((s) => {
          const done = s.phase === "settled";
          return (
            <motion.span
              key={s.step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-flex items-center gap-1.5 ${done ? "text-foreground/80" : ""}`}
            >
              {done ? <Check className="size-3.5 text-primary" strokeWidth={2.5} /> : <span className={`${styles.tickDot} size-1.5 rounded-full`} />}
              {STEP_LABEL[s.step]}
            </motion.span>
          );
        })}
        {savedAnswer ? <AiTestReplayBadge replay={savedAnswer} /> : null}
      </div>
    </motion.div>
  );
}

/** Real findings only: never the typed address echoed back, never the person's own words. */
function realFindings(items: EvidenceItem[]): EvidenceItem[] {
  return items.filter((i) => i.source.where !== "the address itself" && i.source.kind !== "typed");
}

/** The logo the stage shows: the site's own first, else a profile photo. */
export function stageLogo(items: EvidenceItem[]): EvidenceItem | null {
  return stageLogos(items)[0] ?? null;
}

/** Every logo the landing card may fall back through, the site's own first, then profile photos. */
export function stageLogos(items: EvidenceItem[]): EvidenceItem[] {
  const logos = realFindings(items).filter((i) => i.field === "logo" && (i.image_url || i.profile_id));
  return [...logos.filter((i) => i.source.kind === "website"), ...logos.filter((i) => i.source.kind !== "website")];
}

/** The name the stage shows (and the landing card uses): the site's own first. */
export function stageName(items: EvidenceItem[]): EvidenceItem | null {
  const names = realFindings(items).filter((i) => i.field === "name");
  return names.find((i) => i.source.kind === "website") ?? names[0] ?? null;
}

/**
 * A found account opens with our referral mark (utm_source=aimatrx, utm_medium=referral).
 * TODO(outbound-referral): the comparison lane's outboundHref (SmartAddExtras) is the same rule and
 * lands separately; both move to the canonical primitive together.
 */
/** A YouTube channel id ("UC…") is not something a person reads. */
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{20,}$/;

/** How an account reads on its chip: its @handle, or its real name when all we have is an id. */
function accountLabel(s: EvidenceItem, names: EvidenceItem[]): string {
  const handle = s.handle ?? "";
  if (handle && !CHANNEL_ID.test(handle)) return `@${handle}`;
  const fromProfile = names.find(
    (n) => n.source.kind === "social_profile" && n.source.url && (n.source.url === s.url || (handle && n.source.url.includes(handle))),
  );
  return s.label ?? fromProfile?.value ?? platformLabel(s.platform ?? "");
}

/**
 * The dominant colors of the real logo, sampled on a small canvas. A host that does not allow the
 * read (no CORS) leaves the list empty, so nothing is ever invented.
 */
function useLogoColors(url: string | null): string[] {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    setColors([]);
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        for (let k = 0; k < data.length; k += 4) {
          const [r, g, b, a] = [data[k], data[k + 1], data[k + 2], data[k + 3]];
          if (a < 200) continue;
          if (r > 236 && g > 236 && b > 236) continue; // paper white is the canvas, not the brand
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          buckets.set(key, { n: cur.n + 1, r: cur.r + r, g: cur.g + g, b: cur.b + b });
        }
        const ranked = [...buckets.values()]
          .filter((v) => v.n >= 6)
          .sort((x, y) => y.n - x.n)
          .map((v) => [Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)] as const);
        const picked: (readonly [number, number, number])[] = [];
        for (const c of ranked) {
          if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 64)) picked.push(c);
          if (picked.length === 4) break;
        }
        setColors(picked.map((c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`));
      } catch {
        // A tainted canvas (the host refused the read): no swatches, never made-up ones.
        setColors([]);
      }
    };
    // Through our image proxy: same origin, so the canvas may read the pixels.
    img.src = proxiedExternalImageUrl(url);
    return () => {
      alive = false;
    };
  }, [url]);
  return colors;
}

function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 38);
    return () => clearInterval(id);
  }, [text]);
  return <span className={shown < text.length ? styles.caret : undefined}>{text.slice(0, shown) || " "}</span>;
}

// ── The entry's answer ───────────────────────────────────────────────────────

/** What was typed does not exist (or cannot be read): one line, then the next moves. Never a findings page. */
function EntryAnswer({
  line,
  onEdit,
  onAnother,
  onName,
  onRetry,
}: {
  line: string;
  onEdit: () => void;
  onAnother: () => void;
  onName?: () => void;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-4 flex w-full flex-col items-center gap-5"
      data-testid="smart-add-entry-outcome"
      role="status"
    >
      <p className="text-center text-base text-muted-foreground">{line}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" onClick={onEdit}>
          <PenLine className="size-4" />
          Edit
        </Button>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
        ) : null}
        <Button variant="outline" onClick={onAnother}>
          Try another
        </Button>
        {onName ? (
          <Button variant="quiet" onClick={onName}>
            <Search className="size-4" />
            Search by name
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Quiet past the knob while a round runs: say so, and offer the way out. */
function StillWorking({ onStop, onStartOver }: { onStop: () => void; onStartOver: () => void }) {
  return (
    <div className="mt-6 flex items-center gap-2 text-sm" role="status" data-testid="smart-add-still-working">
      <span className="text-foreground">Still working…</span>
      <Button variant="quiet" onClick={onStop}>
        Stop
      </Button>
      <Button variant="quiet" onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}

// ── Nothing found ────────────────────────────────────────────────────────────

function NothingFound({
  failed,
  person,
  onAnswer,
  onRetry,
}: {
  failed: boolean;
  person: boolean;
  onAnswer: (items: EvidenceItem[]) => void;
  onRetry: () => void;
}) {
  const [name, setName] = useState("");
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const ready = Boolean(name.trim() || what.trim() || where.trim());
  const send = () => {
    if (!ready) return;
    const answers: EvidenceItem[] = [];
    if (name.trim()) answers.push(customItem("name", name));
    if (what.trim()) answers.push(customItem("description", what));
    if (where.trim()) answers.push(customItem("address", where));
    onAnswer(answers);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-6 flex w-full flex-col items-center gap-4"
      data-testid="smart-add-situation"
    >
      <p className="text-base text-muted-foreground">
        {failed ? "Try again, or give three quick answers." : "Three quick answers and you're set."}
      </p>
      <div className={`${styles.shell} w-full overflow-hidden rounded-[1.25rem]`}>
        <SubRow
          icon={person ? <UserRound className="size-5" /> : <Building2 className="size-5" />}
          value={name}
          onChange={setName}
          onKeyDown={onKey}
          placeholder={person ? "Your name" : "Business name"}
          label={person ? "Your name" : "Business name"}
          autoFocus
        />
        <SubRow
          icon={<Briefcase className="size-5" />}
          value={what}
          onChange={setWhat}
          onKeyDown={onKey}
          placeholder="What you do"
          label="What you do"
        />
        <div className="flex items-center border-t border-border/60 pr-2">
          <div className="min-w-0 flex-1 [&>div]:border-t-0">
            <SubRow
              icon={<MapPin className="size-5" />}
              value={where}
              onChange={setWhere}
              onKeyDown={onKey}
              placeholder="City or address"
              label="Where you are"
            />
          </div>
          <GoButton disabled={!ready} onClick={send} />
        </div>
      </div>
      <QuietButton onClick={onRetry} icon={<ArrowLeft className="size-4" />}>
        Try another
      </QuietButton>
    </motion.div>
  );
}
