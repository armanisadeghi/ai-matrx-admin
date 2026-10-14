"use client";

/**
 * Smart Add — the pieces around the slots: "Custom" (type your own value into any slot), the live
 * brand card (the primary choices, shown as they confirm), the situation guide (brand-new /
 * conflicted / established) and the side-by-side compare used when look-alikes are found.
 */

import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { BadgeCheck, Check, ChevronLeft, ChevronRight, ExternalLink, Globe, Plus, X } from "lucide-react";
import { Button, DecisionControl, Field, Select, type SelectOption, type WayOutItem } from "@ai-matrx/design-system/controls";
import { addUtmSource } from "@/utils/url-utm";
import { extractErrorMessage } from "@/utils/errors";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import {
  listBrandRelationKinds,
  saveCustomRelationKind,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import {
  compareRows,
  customItem,
  isOurs,
  websiteHost,
  type BrandBasics,
  type Candidate,
  type Decision,
  type EvidenceField,
  type EvidenceItem,
  type Relation,
} from "./evidence";
import { STANCE_LABEL, STANCE_ORDER } from "./webKinds";
import { parseSuggestion } from "./validate/queue";

// ── Custom ──────────────────────────────────────────────────────────────────────

const CONTACT_KINDS: SelectOption<"phone" | "email" | "address">[] = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "address", label: "Address" },
];

/**
 * "+ Custom" for one slot: a quiet button that opens one inline field. Enter adds the value as the
 * person's own finding (confirmed at once); a social link or handle is parsed like the Social link field.
 */
export function CustomAdd({
  field,
  placeholder,
  label = "Custom",
  onAdd,
  disabled,
}: {
  field: EvidenceField | "contact";
  placeholder: string;
  /** The button's words when one slot has several Custom entries ("Tagline"). */
  label?: string;
  onAdd: (item: EvidenceItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [contactKind, setContactKind] = useState<"phone" | "email" | "address">("phone");
  const [problem, setProblem] = useState<string | null>(null);

  const add = () => {
    const value = text.trim();
    if (!value) return;
    if (field === "social") {
      const parsed = resolveAccountInput({ text: value });
      if (parsed.status !== "ok") {
        setProblem(parsed.status === "needs_platform" ? "Paste the profile link" : "Not a social account");
        return;
      }
      onAdd(customItem("social", parsed.url, { platform: parsed.platform, handle: parsed.handle, url: parsed.url }));
    } else {
      onAdd(customItem(field === "contact" ? contactKind : field, value));
    }
    setText("");
    setProblem(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="px-4 pb-1">
        <Button variant="quiet" icon={<Plus />} disabled={disabled} onClick={() => setOpen(true)}>
          {label}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
      {field === "contact" ? (
        <Select aria-label="Contact kind" value={contactKind} options={CONTACT_KINDS} onValueChange={setContactKind} className="w-28" />
      ) : null}
      <Field
        aria-label={placeholder}
        // ui-exception: a short raw value typed into one slot
        placeholder={placeholder}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
          if (e.key === "Escape") setOpen(false);
        }}
        className="min-w-0 flex-1"
      />
      <Button variant="primary" onClick={add} disabled={!text.trim()}>
        Add
      </Button>
      <Button variant="quiet" aria-label="Cancel" icon={<X />} onClick={() => setOpen(false)} />
      {problem ? (
        <span className="flex w-full items-center gap-1 text-xs text-destructive">
          {problem}
          <ErrorAlchemyMenu error={problem} />
        </span>
      ) : null}
    </div>
  );
}

// ── Brand card ──────────────────────────────────────────────────────────────────

const KIND_LABEL = { business: "Business", person: "Person", both: "Person with a business" } as const;

/** The primary choices, laid out like an official profile card — builds as the person confirms. */
export function BrandCard({
  basics,
  screenshot = null,
  person,
  kind,
  onKind,
  location,
}: {
  basics: BrandBasics;
  /** The homepage on a computer (lasting address); its slot is reserved for a business, so it swaps in. */
  screenshot?: string | null;
  person: boolean;
  kind: "person" | "business" | "both";
  onKind: (kind: "person" | "business" | "both") => void;
  location: string | null;
}) {
  const primary = basics.images.find((i) => i.primary) ?? null;
  const empty = !basics.name && !primary && !basics.websiteUrl;
  const [shade, setShade] = useState<"light" | "dark" | "checker">("light");
  const [dead, setDead] = useState<string | null>(null);
  const primaryRaw = primary?.url ?? null;
  const primarySrc = primaryRaw && /^https?:\/\//i.test(primaryRaw) ? proxiedExternalImageUrl(primaryRaw) : primaryRaw;
  return (
    <section
      className="flex min-h-28 items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm"
      aria-label="Your brand"
      data-testid="smart-add-brand-card"
    >
      <span className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border ${shade === "dark" ? "bg-zinc-800" : "bg-white"} ${person ? "rounded-full" : "rounded-xl"}`}>
        {primary && dead !== primary.url ? (
          <img
            src={primarySrc ?? primary.url}
            alt=""
            onError={() => setDead(primary.url)}
            onLoad={(ev) => {
              const b = brightnessOf(ev.currentTarget);
              setShade(b === null ? "light" : shadeForBrightness(b));
            }}
            className={person ? "size-full object-cover" : "max-h-full max-w-full object-contain p-1.5"}
          />
        ) : (
          <Globe className="size-7 text-muted-foreground/40" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className={`truncate text-xl font-semibold ${empty ? "text-muted-foreground/50" : ""}`}>
            {basics.name ?? (person ? "Your name" : "Your brand")}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2"
              data-testid="smart-add-kind-label"
            >
              {KIND_LABEL[kind]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => onKind(k)} data-testid={`smart-add-kind-${k}`}>
                  {KIND_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        {basics.tagline || basics.category ? (
          <span className="truncate text-sm text-muted-foreground">{basics.tagline ?? basics.category}</span>
        ) : null}
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {basics.websiteUrl ? <span className="truncate">{websiteHost(basics.websiteUrl)}</span> : null}
          {location ? <span className="truncate">{location}</span> : null}
          {basics.accounts.slice(0, 6).map((a) => (
            <span key={a.key} className="flex items-center gap-1">
              <PlatformMark platform={a.platform ?? ""} size={12} />@{a.handle}
            </span>
          ))}
        </span>
        {person && basics.expertise.length ? (
          <span className="truncate text-xs text-muted-foreground">{basics.expertise.join(" · ")}</span>
        ) : null}
      </div>
      {person ? null : <HomepageShot url={screenshot} />}
    </section>
  );
}

/** The homepage picture's slot: always the same size (no layout shift), empty until the picture loads. */
function HomepageShot({ url }: { url: string | null }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [dead, setDead] = useState<string | null>(null);
  const show = url && dead !== url;
  return (
    <span
      className="hidden h-[5.625rem] w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40 sm:block"
      data-testid="smart-add-homepage-shot"
      data-state={show && loaded === url ? "ready" : "empty"}
    >
      {show ? (
        <img
          src={url}
          alt="Homepage"
          loading="lazy"
          onLoad={() => setLoaded(url)}
          onError={() => setDead(url)}
          className={`size-full object-cover object-top transition-opacity duration-500 ${loaded === url ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}

// ── Situations ──────────────────────────────────────────────────────────────────

export type Situation = "new" | "conflicted" | "established" | null;

/** Which of the three intake situations this is, once identification has settled. */
export function situationOf(items: EvidenceItem[], settled: boolean): Situation {
  if (!settled || items.length === 0) return items.length === 0 && settled ? "new" : null;
  const names = new Set(items.filter((i) => i.field === "name").map((i) => i.value.toLowerCase()));
  // A profile that points to a DIFFERENT website than the site's own is most likely another brand
  // with a look-alike name ("Ritual" the vitamin company vs Ritual Coffee).
  const siteHosts = new Set(
    items.filter((i) => i.field === "website" && i.source.kind !== "social_profile").map((i) => websiteHost(i.value)),
  );
  const profileHosts = items
    .filter((i) => i.field === "website" && i.source.kind === "social_profile")
    .map((i) => websiteHost(i.value));
  const sourcesDisagree =
    siteHosts.size > 0 && profileHosts.some((h) => ![...siteHosts].some((s) => s === h || s.endsWith(`.${h}`) || h.endsWith(`.${s}`)));
  const perPlatform = new Map<string, number>();
  for (const s of items.filter((i) => i.field === "social")) perPlatform.set(s.platform ?? "", (perPlatform.get(s.platform ?? "") ?? 0) + 1);
  if (names.size >= 3 || sourcesDisagree || [...perPlatform.values()].some((n) => n >= 2)) return "conflicted";
  const has = (f: EvidenceField) => items.some((i) => i.field === f);
  if (!has("name") || items.length <= 3) return "new";
  if (has("logo") && has("website") && has("social")) return "established";
  return null;
}

// ── Compare ─────────────────────────────────────────────────────────────────────

const OWN_HOSTS = ["aimatrx.com", "matrxserver.com"];

/**
 * Every link out of this flow carries our referral mark (the existing UTM helper plus the medium);
 * our own addresses are left alone.
 * TODO(outbound-referral): replace with the canonical primitive.
 */
export function outboundHref(url: string): string {
  const absolute = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const host = websiteHost(absolute);
  if (OWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return absolute;
  try {
    const out = new URL(addUtmSource(absolute));
    out.searchParams.set("utm_medium", "referral");
    return out.toString();
  } catch {
    return absolute;
  }
}

/** Open a found page in a new tab. */
export function OpenLink({ url, label = "Open" }: { url: string; label?: string }) {
  return (
    <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label={label} title={label}>
      <a href={outboundHref(url)} target="_blank" rel="noopener" />
    </Button>
  );
}

/**
 * The line under an account's name. A YouTube channel id is not a handle (nobody types it), so it
 * reads as the channel address it is; every other platform shows its exact "@handle".
 */
export function accountHandleLine(platform: string | null | undefined, handle: string | null | undefined): string | null {
  const h = (handle ?? "").replace(/^@/, "");
  if (!h) return null;
  if (platform === "youtube" && /^UC[\w-]{22}$/.test(h)) return `youtube.com/channel/${h}`;
  return `@${h}`;
}

/** The relationship vocabulary (data: web.brand_relation_kind) plus saving a person's own custom one. */
export function useRelationKinds(onRelate: (c: Candidate, relation: Relation | null) => void) {
  const [kinds, setKinds] = useState<BrandRelationKind[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    listBrandRelationKinds()
      .then((k) => live && setKinds(k))
      .catch((error) => live && setLoadError(extractErrorMessage(error)));
    return () => {
      live = false;
    };
  }, []);
  const onCustom = async (c: Candidate, label: string) => {
    const organizationId = await ensureOrgId(null); // org-filter: server-call smart-add research runs in the selected organization
    const kind = await saveCustomRelationKind(organizationId, label);
    setKinds((list) => (list.some((k) => k.key === kind.key) ? list : [...list, kind]));
    onRelate(c, { key: kind.key, label: kind.label, routesTo: kind.routesTo });
  };
  return { kinds, loadError, onCustom };
}

const CUSTOM = "__custom";

function CandidateAvatar({ c }: { c: Candidate }) {
  if (c.platform === "website") {
    return c.iconUrl ? (
      <img src={c.iconUrl} alt="" className="size-10 shrink-0 rounded-md object-contain" />
    ) : (
      <PlatformMark platform="website" size={40} />
    );
  }
  const initial = (c.name ?? c.handle ?? "?").replace(/^@/, "").charAt(0).toUpperCase();
  return (
    <span className="relative size-10 shrink-0">
      <SocialImage
        door={c.profileId ? profileAvatarDoor(c.profileId) : null}
        url={c.photoUrl}
        fallback={
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {initial}
          </span>
        }
        className="size-10 rounded-full object-cover"
      />
      <span className="absolute -right-1 -bottom-1 rounded-md ring-2 ring-card">
        <PlatformMark platform={c.platform} size={16} />
      </span>
    </span>
  );
}

/** A relationship the vocabulary lacks, named in place (saved for the whole organization). */
export function CustomRelation({ onSave, onCancel }: { onSave: (label: string) => Promise<void>; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave(label.trim());
    } catch (error) {
      setProblem(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-1 pt-1">
      <Field
        aria-label="Relationship"
        // ui-exception: a short relationship name
        placeholder="How it's related"
        value={label}
        autoFocus
        maxLength={60}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-0 max-w-56 flex-1"
      />
      <Button variant="primary" onClick={() => void save()} disabled={!label.trim() || saving}>
        Save
      </Button>
      <Button variant="quiet" aria-label="Cancel" icon={<X />} onClick={onCancel} />
      {problem ? (
        <span className="flex w-full items-center gap-1 text-xs text-destructive">
          {problem}
          <ErrorAlchemyMenu error={problem} />
        </span>
      ) : null}
    </span>
  );
}

/** Related · <stance> groups of every relationship but Ours / Not us (the row's own Yes / No), then Custom…. */
export function relationWayOut(kinds: BrandRelationKind[], exclude: string[] = []): WayOutItem[] {
  const list = [...kinds]
    .filter((k) => k.stance !== "ours" && k.key !== "not_us" && !exclude.includes(k.key))
    .sort((a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || Number(b.isKnown) - Number(a.isKnown));
  return [
    ...list.map((k, n) => ({
      value: `rel:${k.key}`,
      label: k.label,
      group: n === 0 || list[n - 1].stance !== k.stance ? `Related · ${STANCE_LABEL[k.stance]}` : undefined,
    })),
    { value: CUSTOM, label: "Custom…" },
  ];
}
export const CUSTOM_RELATION = CUSTOM;

/** One candidate, compact: who it is, and Yes / No / Other (Other's picker names the relationship). */
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
  const handleLine = c.platform === "website" ? (c.url ? websiteHost(c.url) : null) : accountHandleLine(c.platform, c.handle);
  const title = c.name ?? handleLine ?? c.anchor.value;
  const sub = [handleLine !== title ? handleLine : null, c.followers != null ? `${formatCount(c.followers)} followers` : null].filter(Boolean).join(" · ");
  const suggested = !weThink ? null : ["ours", "preferred", "alias"].includes(weThink.choice) ? "yes" : weThink.choice === "not_us" ? "no" : "other";
  return (
    <article
      className={`flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-2.5 ${
        ours ? "border-primary ring-1 ring-primary/30" : relation ? "border-foreground/30" : "border-border"
      } ${rejected ? "opacity-60" : ""}`}
      data-testid="smart-add-candidate"
      data-candidate={c.id}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CandidateAvatar c={c} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <span className="truncate" title={title}>{title}</span>
            {c.verified ? <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" /> : null}
          </span>
          {sub ? <span className="truncate text-xs text-muted-foreground" title={sub}>{sub}</span> : null}
          {c.bio ? <span className="truncate text-xs text-muted-foreground/80" title={c.bio}>{c.bio}</span> : null}
        </div>
        {c.url ? <OpenLink url={c.url} /> : null}
      </div>
      <DecisionControl
        labels={{ yes: "Ours", no: "Not us" }}
        value={ours ? "yes" : rejected ? "no" : relation || skipped ? "other" : null}
        suggested={suggested}
        onChange={(a) => onClaim(c, a)}
        wayOut={relationWayOut(kinds)}
        wayOutValue={relation ? `rel:${relation.key}` : null}
        onWayOut={(v) => {
          if (v === CUSTOM) return setCustom(true);
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

/**
 * The compare: ONE comparison at a time — only slots where 2+ candidates compete (a single finding is
 * never here). Each candidate is Yes / No / Other; once every one has an answer it moves on. "2 of 5",
 * Back and Close are always on screen.
 */
export function CompareSources({
  items,
  decisions,
  relations,
  onClaim,
  onRelate,
  onClose,
  skipped,
  onSkip,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  relations: Record<string, Relation>;
  /** Candidates set aside with "Other → Skip for now" (kept by the session). */
  skipped: ReadonlySet<string>;
  onSkip: (id: string, on: boolean) => void;
  onClaim: (c: Candidate, decision: "yes" | "no") => void;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  onClose?: () => void;
}) {
  const rows = compareRows(items).filter((r) => r.candidates.length >= 2);
  const { kinds, loadError, onCustom } = useRelationKinds(onRelate);
  const [step, setStep] = useState(0);
  const at = Math.min(step, Math.max(rows.length - 1, 0));
  const row = rows[at];
  const answered = (c: Candidate) => Boolean(decisions[c.anchor.key] || relations[c.id] || skipped.has(c.id));
  const done = row ? row.candidates.every(answered) : false;
  // Picked every candidate in this comparison: on to the next one.
  const advance = useRef<string | null>(null);
  useEffect(() => {
    if (!row || !done || advance.current === row.platform || at >= rows.length - 1) return;
    advance.current = row.platform;
    const t = setTimeout(() => setStep(at + 1), 350);
    return () => clearTimeout(t);
  }, [done, row, at, rows.length]);
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card" data-testid="smart-add-compare">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        {row ? (
          <>
            <PlatformMark platform={row.platform} size={18} />
            <span className="text-sm font-medium">{row.platform === "website" ? "Website" : platformLabel(row.platform)}</span>
            <span className="text-xs text-muted-foreground">Which is yours?</span>
          </>
        ) : (
          <span className="text-sm font-medium">Nothing to compare</span>
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground" data-testid="smart-add-compare-progress">
          {rows.length ? `${at + 1} of ${rows.length}` : ""}
        </span>
        <Button variant="quiet" aria-label="Back" icon={<ChevronLeft />} disabled={at === 0} onClick={() => setStep(at - 1)} />
        <Button variant="quiet" aria-label="Next" icon={<ChevronRight />} disabled={at >= rows.length - 1} onClick={() => setStep(at + 1)} />
        {onClose ? <Button variant="quiet" aria-label="Close" icon={<X />} onClick={onClose} /> : null}
      </header>
      {loadError ? (
        <span className="flex items-center gap-1 px-3 py-2 text-xs text-destructive">
          {loadError}
          <ErrorAlchemyMenu error={loadError} />
        </span>
      ) : null}
      {row ? (
        <section className="grid gap-2 p-3 sm:grid-cols-2" data-testid="smart-add-compare-row" data-platform={row.platform}>
          {row.candidates.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              decision={decisions[c.anchor.key]}
              relation={relations[c.id] ?? null}
              kinds={kinds}
              skipped={skipped.has(c.id)}
              onClaim={(x, d) => {
                onSkip(x.id, false);
                onClaim(x, d);
              }}
              onRelate={(x, relation) => {
                onSkip(x.id, false);
                onRelate(x, relation);
              }}
              onCustom={async (x, label) => {
                await onCustom(x, label);
                onSkip(x.id, false);
              }}
              onSkip={() => {
                if (decisions[c.anchor.key]) onClaim(c, decisions[c.anchor.key] === "no" ? "no" : "yes");
                if (relations[c.id]) onRelate(c, null);
                onSkip(c.id, true);
              }}
            />
          ))}
        </section>
      ) : (
        <p className="px-3 py-3 text-sm text-muted-foreground">Every finding has one candidate.</p>
      )}
    </div>
  );
}
