"use client";

/**
 * Smart Add — the pieces around the slots: "Custom" (type your own value into any slot), the live
 * brand card (the primary choices, shown as they confirm), the situation guide (brand-new /
 * conflicted / established) and the side-by-side compare used when look-alikes are found.
 */

import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { BadgeCheck, Check, ExternalLink, Globe, Plus, X } from "lucide-react";
import { Button, Field, Select, type SelectOption } from "@ai-matrx/design-system/controls";
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
import { STANCE_LABEL } from "./webKinds";
import { parseSuggestion } from "./validate/queue";
import { Glow, WeThinkHint } from "./WeThinkHint";

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

export function RelationPicker({
  kinds,
  relation,
  onRelate,
  onCustom,
  emptyLabel = "Related…",
  className = "min-w-36 flex-1",
  disabled,
}: {
  kinds: BrandRelationKind[];
  relation: Relation | null;
  onRelate: (relation: Relation | null) => void;
  onCustom: (label: string) => Promise<void>;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // The same vocabulary as the "On the web" step; Ours / Not us are this row's own buttons.
  const related = kinds.filter((k) => k.stance !== "ours" && k.stance !== "not_us");
  const known = related.filter((k) => k.isKnown);
  const saved = related.filter((k) => !k.isKnown);
  const options: SelectOption<string>[] = [
    { value: "", label: emptyLabel },
    ...known.map((k) => ({ value: k.key, label: k.label, meta: STANCE_LABEL[k.stance] })),
    ...saved.map((k) => ({ value: k.key, label: k.label, meta: STANCE_LABEL[k.stance] })),
    ...(relation && !kinds.some((k) => k.key === relation.key) ? [{ value: relation.key, label: relation.label }] : []),
    { value: CUSTOM, label: "Custom…" },
  ];
  const pick = (value: string) => {
    if (value === CUSTOM) return setCustom("");
    if (!value) return onRelate(null);
    const k = kinds.find((x) => x.key === value);
    if (k) onRelate({ key: k.key, label: k.label, routesTo: k.routesTo });
  };
  const save = async () => {
    const label = (custom ?? "").trim();
    if (!label) return;
    setSaving(true);
    setProblem(null);
    try {
      await onCustom(label);
      setCustom(null);
    } catch (error) {
      setProblem(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  if (custom !== null) {
    return (
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <Field
          aria-label="Relationship"
          // ui-exception: a short relationship name
          placeholder="How it's related"
          value={custom}
          autoFocus
          maxLength={60}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setCustom(null);
          }}
          className="min-w-0 flex-1"
        />
        <Button variant="primary" onClick={() => void save()} disabled={!custom.trim() || saving}>
          Save
        </Button>
        <Button variant="quiet" aria-label="Cancel" icon={<X />} onClick={() => setCustom(null)} />
        {problem ? (
          <span className="flex w-full items-center gap-1 text-xs text-destructive">
            {problem}
            <ErrorAlchemyMenu error={problem} />
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <Select
      aria-label="Relationship"
      value={relation?.key ?? ""}
      options={options}
      onValueChange={pick}
      className={className}
      disabled={disabled}
    />
  );
}

function CandidateCard({
  c,
  decision,
  relation,
  kinds,
  wide,
  onClaim,
  onRelate,
  onCustom,
}: {
  c: Candidate;
  decision: Decision | undefined;
  relation: Relation | null;
  kinds: BrandRelationKind[];
  wide: boolean;
  onClaim: (c: Candidate, decision: "yes" | "no") => void;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  onCustom: (c: Candidate, label: string) => Promise<void>;
}) {
  const ours = isOurs(decision);
  const rejected = decision === "no";
  // "We think" glows one option until the person answers; it never answers for them.
  const weThink = decision || relation ? null : parseSuggestion(c.anchor.suggestion);
  const weThinkEvidence = (c.anchor.suggestion as { evidence?: unknown } | undefined)?.evidence;
  const glow = (choices: string[]) => Boolean(weThink && choices.includes(weThink.choice));
  const handleLine = c.platform === "website" ? (c.url ? websiteHost(c.url) : null) : accountHandleLine(c.platform, c.handle);
  const title = c.name ?? handleLine ?? c.anchor.value;
  const findings = c.items.length;
  return (
    <article
      className={`flex shrink-0 snap-start flex-col gap-2.5 rounded-lg border bg-card p-3 transition-colors ${
        wide ? "w-full sm:w-[24rem]" : "w-[min(22rem,84vw)]"
      } ${ours ? "border-primary ring-1 ring-primary/30" : relation ? "border-foreground/30" : "border-border"} ${rejected ? "opacity-50" : ""}`}
      data-testid="smart-add-candidate"
      data-candidate={c.id}
    >
      <div className="flex items-start gap-3">
        <CandidateAvatar c={c} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1 text-sm leading-snug font-semibold break-words">
            {title}
            {c.verified ? <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" /> : null}
          </span>
          {handleLine && handleLine !== title ? <span className="text-xs break-all text-foreground/80">{handleLine}</span> : null}
          {c.followers != null ? (
            <span className="text-xs text-muted-foreground tabular-nums">{formatCount(c.followers)} followers</span>
          ) : null}
        </div>
        {c.url ? <OpenLink url={c.url} /> : null}
      </div>
      {c.bio ? (
        <p className="line-clamp-2 text-xs text-muted-foreground" title={c.bio}>
          {c.bio}
        </p>
      ) : null}
      {c.url ? <span className="text-[11px] break-all text-muted-foreground/80">{c.url}</span> : null}
      <div className="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{findings === 1 ? "1 finding" : `${findings} findings`}</span>
      </div>
      {weThink ? (
        <WeThinkHint
          suggestion={weThink}
          kinds={kinds}
          evidence={Array.isArray(weThinkEvidence) ? weThinkEvidence.filter((e): e is string => typeof e === "string") : undefined}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <Glow on={glow(["ours", "preferred", "alias"])}>
          <Button variant={ours ? "primary" : "outline"} icon={<Check />} onClick={() => onClaim(c, "yes")} aria-pressed={ours}>
            This is us
          </Button>
        </Glow>
        <Glow on={glow(["not_us"])}>
          <Button variant={rejected ? "danger" : "quiet"} icon={<X />} onClick={() => onClaim(c, "no")} aria-pressed={rejected}>
            Not us
          </Button>
        </Glow>
        <Glow on={glow(["related"])}>
          <RelationPicker
            kinds={kinds}
            relation={relation}
            onRelate={(r) => onRelate(c, r)}
            onCustom={(label) => onCustom(c, label)}
          />
        </Glow>
      </div>
    </article>
  );
}

/**
 * The side-by-side check for a conflicted brand: one row per platform, that platform's candidates
 * next to each other (a row scrolls sideways, and swipes on a phone). Each one is ours, not us, or
 * related in a named way (the relationship vocabulary is data: web.brand_relation_kind).
 */
export function CompareSources({
  items,
  decisions,
  relations,
  onClaim,
  onRelate,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  relations: Record<string, Relation>;
  onClaim: (c: Candidate, decision: "yes" | "no") => void;
  onRelate: (c: Candidate, relation: Relation | null) => void;
}) {
  const rows = compareRows(items);
  const { kinds, loadError, onCustom } = useRelationKinds(onRelate);
  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card" data-testid="smart-add-compare">
      {loadError ? (
        <span className="flex items-center gap-1 px-4 py-2 text-xs text-destructive">
          {loadError}
          <ErrorAlchemyMenu error={loadError} />
        </span>
      ) : null}
      {rows.map((row) => (
        <section key={row.platform} className="flex flex-col gap-2 py-3" data-testid="smart-add-compare-row" data-platform={row.platform}>
          <header className="flex items-center gap-2 px-4">
            <PlatformMark platform={row.platform} size={18} />
            <span className="text-sm font-medium">{row.platform === "website" ? "Website" : platformLabel(row.platform)}</span>
            {row.candidates.length > 1 ? (
              <span className="text-xs text-muted-foreground tabular-nums">{row.candidates.length}</span>
            ) : null}
          </header>
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:thin]">
            {row.candidates.map((c) => (
              <CandidateCard
                key={c.id}
                c={c}
                decision={decisions[c.anchor.key]}
                relation={relations[c.id] ?? null}
                kinds={kinds}
                wide={row.candidates.length === 1}
                onClaim={onClaim}
                onRelate={onRelate}
                onCustom={onCustom}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
