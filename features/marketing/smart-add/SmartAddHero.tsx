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

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
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
import { Shared } from "./stage/Shared";
import styles from "./stage/stage.module.css";

type Mode = "website" | "social" | "name";

const STEP_LABEL: Record<string, string> = {
  probe: "Website",
  page: "Page",
  avatars: "Photos",
  socials: "Accounts",
};

/** The platforms offered for a bare @handle, most common first. */
const PICKABLE: SocialPlatform[] = ["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "threads", "pinterest"];

const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

function looksLikeDomain(text: string): boolean {
  return /^[^\s@]+\.[a-z]{2,}(\/.*)?$/i.test(text.trim().replace(/^https?:\/\//i, ""));
}

export function SmartAddHero({
  person,
  onPerson,
  onWebsite,
  onSocial,
  onPick,
  working,
  views,
  items,
  nothingFound,
  onAdd,
}: {
  person: boolean;
  onPerson: (person: boolean) => void;
  onWebsite: (v: string) => void;
  onSocial: (v: string) => void;
  onPick: (p: SocialPlatform | null) => void;
  working: boolean;
  views: RoundView[];
  /** Every finding so far (ordered); the centerpiece shows only real ones. */
  items: EvidenceItem[];
  nothingFound: boolean;
  onAdd: (items: EvidenceItem[]) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [site, setSite] = useState("");
  const [social, setSocial] = useState("");
  const [picked, setPicked] = useState<SocialPlatform | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [second, setSecond] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const parsed = resolveAccountInput({ text: social, picked });
  const socialOk = parsed.status === "ok" && (parsed.detected || Boolean(picked));
  const siteOk = looksLikeDomain(site);
  const host = siteOk ? websiteHost(site.trim()) : null;
  const needsPick = social.trim() !== "" && needsPlatformPick(parsed, null);

  const ready =
    mode === "website" ? siteOk && (!second || !social.trim() || socialOk)
    : mode === "social" ? socialOk && (!second || !site.trim() || siteOk)
    : mode === "name" ? name.trim().length > 1
    : false;

  const phase: "choose" | "enter" | "identifying" | "nothing" =
    submitted && nothingFound ? "nothing" : submitted ? "identifying" : mode ? "enter" : "choose";

  const submit = () => {
    if (!ready) return;
    if (mode === "name") {
      const answers = [customItem("name", name)];
      if (city.trim()) answers.push(customItem("address", city));
      onAdd(answers);
      setSubmitted(true);
      return;
    }
    onWebsite(siteOk ? site.trim() : "");
    onSocial(socialOk ? social.trim() : "");
    onPick(picked);
    setSubmitted(true);
  };

  const choose = (m: Mode) => {
    setMode(m);
    setSecond(false);
  };

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

  const compact = phase === "identifying" || phase === "nothing";

  return (
    <MotionConfig reducedMotion="user">
      <section
        className="relative flex min-h-full w-full flex-col items-center px-4 pb-16 pt-[calc(var(--shell-header-h,3rem)+9vh)] sm:pt-[calc(var(--shell-header-h,3rem)+13vh)]"
        data-smart-add-stage="intake"
        data-testid="smart-add-hero"
      >
        <motion.div layout transition={SPRING} className="flex w-full max-w-[44rem] flex-col items-center">
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
                      onEdit={() => setSubmitted(false)}
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
                        go={<GoButton disabled={!ready} onClick={submit} />}
                      />
                      <SubRow
                        icon={<MapPin className="size-[1.1rem]" />}
                        value={city}
                        onChange={setCity}
                        onKeyDown={onFieldKey}
                        placeholder="City (optional)"
                        label="City"
                      />
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
                          go={<GoButton disabled={!ready} onClick={submit} />}
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
                          go={<GoButton disabled={!ready} onClick={submit} />}
                        />
                      )}
                      {mode === "social" && needsPick ? <PlatformPick picked={picked} onPick={setPicked} /> : null}
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
                                {needsPick ? <PlatformPick picked={picked} onPick={setPicked} /> : null}
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
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-4 flex h-9 w-full items-center justify-between px-1 text-sm"
            >
              <QuietButton onClick={() => setMode(null)} icon={<ArrowLeft className="size-4" />}>
                Back
              </QuietButton>
              {mode === "name" ? (
                <KindToggle person={person} onPerson={onPerson} />
              ) : second ? (
                <span />
              ) : (
                <QuietButton onClick={() => setSecond(true)} icon={<Plus className="size-4" />}>
                  {mode === "website" ? "Add a social" : "Add a website"}
                </QuietButton>
              )}
            </motion.div>
          ) : null}

          {compact ? (
            <Centerpiece
              items={items}
              views={views}
              working={working || (phase === "identifying" && mode !== "name")}
              settled={phase === "nothing"}
              host={host}
              platform={parsed.status === "ok" && socialOk ? parsed.platform : null}
              typedName={mode === "name" ? name.trim() : null}
            />
          ) : null}

          {phase === "nothing" ? <NothingFound person={person} onAnswer={onAdd} onRetry={() => setSubmitted(false)} /> : null}
        </motion.div>
      </section>
    </MotionConfig>
  );
}

// ── Choices ──────────────────────────────────────────────────────────────────

const CHOICES: { mode: Mode; title: string; hint: string; icon: typeof Globe }[] = [
  { mode: "website", title: "Website", hint: "yourbrand.com", icon: Globe },
  { mode: "social", title: "Social", hint: "Any profile or @handle", icon: AtSign },
  { mode: "name", title: "Company or Person", hint: "A name and a city", icon: Building2 },
];

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
      className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
    >
      {CHOICES.map((c, i) => {
        const Icon = c.icon;
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
            className={`${styles.card} group flex items-center gap-4 rounded-[1.25rem] border border-glass-edge p-4 text-left sm:min-h-44 sm:flex-col sm:items-start sm:justify-between sm:gap-6 sm:p-6`}
          >
            <span className={`${styles.cardIcon} flex size-12 shrink-0 items-center justify-center rounded-2xl text-primary sm:size-14`}>
              <Icon className="size-6 sm:size-7" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none">
              <span className="text-lg font-semibold tracking-tight text-foreground">{c.title}</span>
              <span className="truncate text-sm text-muted-foreground">{c.hint}</span>
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
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
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
      className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 sm:px-4"
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
            className="relative flex size-10 shrink-0 items-center justify-center transition-transform hover:-translate-y-0.5"
          >
            <PlatformMark platform={p} size={24} />
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
  onEdit,
}: {
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
  host,
  platform,
  typedName,
}: {
  items: EvidenceItem[];
  views: RoundView[];
  working: boolean;
  settled: boolean;
  host: string | null;
  platform: SocialPlatform | null;
  typedName: string | null;
}) {
  const real = items.filter((i) => i.source.where !== "the address itself" && i.source.kind !== "typed");
  const logos = real.filter((i) => i.field === "logo" && (i.image_url || i.profile_id));
  const logo = logos.find((i) => i.source.kind === "website") ?? logos[0] ?? null;
  const names = real.filter((i) => i.field === "name");
  const nameItem = names.find((i) => i.source.kind === "website") ?? names[0] ?? null;
  const sub = real.find((i) => i.field === "tagline") ?? real.find((i) => i.field === "category") ?? null;
  const socials = real.filter((i) => i.field === "social").slice(0, 5);
  const photoByPlatform = new Map<string, EvidenceItem>();
  for (const l of logos) if (l.profile_id && l.platform) photoByPlatform.set(l.platform, l);
  const steps = views.flatMap((v) => v.steps).filter((s) => !s.skipped && s.phase !== "idle" && STEP_LABEL[s.step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className={`mt-12 flex w-full flex-col items-center sm:mt-14 ${settled ? styles.settled : ""}`}
      aria-live="polite"
    >
      {/* The mark, inside its orbit. */}
      <div className="relative flex size-40 items-center justify-center sm:size-44">
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
      <div className="mt-8 flex h-11 w-full items-center justify-center px-2 sm:h-12">
        {nameItem ? (
          <Shared id={nameItem.key} className="max-w-full truncate text-[1.75rem] font-semibold tracking-[-0.03em] sm:text-4xl">
            <Typewriter text={nameItem.value} />
          </Shared>
        ) : settled ? (
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl">Nothing online yet</span>
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

      {/* Accounts pop in with their real photos. */}
      <div className="mt-5 flex min-h-11 w-full flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {socials.map((s, i) => {
            const photo = s.profile_id ? s : photoByPlatform.get(s.platform ?? "");
            return (
              <motion.span
                key={s.key}
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.06 }}
                className="inline-flex h-11 items-center gap-2.5 rounded-2xl border border-glass-edge bg-card/70 px-1.5 text-sm font-medium shadow-sm backdrop-blur-md"
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
                <span className="max-w-40 truncate">@{s.handle ?? ""}</span>
                {photo?.profile_id ? <PlatformMark platform={s.platform ?? ""} size={16} className="mr-1" /> : <span className="w-1" />}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quiet ticks for the real steps: a breathing dot while running, a check when done. */}
      <div className="mt-6 flex h-6 flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
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
      </div>
    </motion.div>
  );
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

// ── Nothing found ────────────────────────────────────────────────────────────

function NothingFound({
  person,
  onAnswer,
  onRetry,
}: {
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
      <p className="text-base text-muted-foreground">Three quick answers and you&apos;re set.</p>
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
