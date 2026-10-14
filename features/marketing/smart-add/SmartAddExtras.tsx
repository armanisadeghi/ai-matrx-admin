"use client";

/**
 * Smart Add — the pieces around the slots: "Custom" (type your own value into any slot), the live
 * brand card (the primary choices, shown as they confirm), the situation guide (brand-new /
 * conflicted / established) and the shared pieces the compare dialog (compare/CompareDialog.tsx) uses.
 */

import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ExternalLink, Globe, Plus, X } from "lucide-react";
import { Button, Field, Select, type SelectOption, type WayOutItem } from "@ai-matrx/design-system/controls";
import { Skeleton } from "@ai-matrx/design-system";
import { addUtmSource } from "@/utils/url-utm";
import { extractErrorMessage } from "@/utils/errors";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import {
  listBrandRelationKinds,
  saveCustomRelationKind,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import {
  customItem,
  websiteHost,
  type BrandBasics,
  type Candidate,
  type EvidenceField,
  type EvidenceItem,
  type Relation,
} from "./evidence";
import { STANCE_LABEL, STANCE_ORDER } from "./webKinds";

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
  inline,
}: {
  field: EvidenceField | "contact";
  placeholder: string;
  /** The button's words when one slot has several Custom entries ("Tagline"). */
  label?: string;
  onAdd: (item: EvidenceItem) => void;
  disabled?: boolean;
  /** Sits beside its siblings in a parent row that supplies the slot padding. */
  inline?: boolean;
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
      <div className={inline ? undefined : "px-4 pb-1"}>
        <Button variant="quiet" icon={<Plus />} disabled={disabled} onClick={() => setOpen(true)}>
          {label}
        </Button>
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 pb-2 ${inline ? "w-full" : "px-4"}`}>
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
  waiting = false,
  screenshot = null,
  person,
  kind,
  onKind,
  location,
}: {
  basics: BrandBasics;
  /** A round is still working: an empty picture box shimmers ("working on it"), never an icon. */
  waiting?: boolean;
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
      <span
        className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border ${shade === "dark" ? "bg-zinc-800" : "bg-white"} ${person ? "rounded-full" : "rounded-xl"}`}
        data-testid="smart-add-card-picture"
        data-state={primary && dead !== primary.url ? "ready" : waiting ? "waiting" : "empty"}
      >
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
        ) : waiting ? (
          <Skeleton motion="shimmer" aria-hidden="true" className="absolute inset-0 rounded-none bg-muted" />
        ) : (
          <Globe className="size-7 text-muted-foreground" />
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
      {person ? null : <HomepageShot url={screenshot} waiting={waiting} />}
    </section>
  );
}

/** The homepage picture's slot: always the same size (no layout shift), empty until the picture loads. */
function HomepageShot({ url, waiting }: { url: string | null; waiting: boolean }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [dead, setDead] = useState<string | null>(null);
  const show = url && dead !== url;
  return (
    <span
      className="relative hidden h-[5.625rem] w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:block"
      data-testid="smart-add-homepage-shot"
      data-state={show && loaded === url ? "ready" : (waiting && !dead) || (show && loaded !== url) ? "waiting" : "empty"}
    >
      {/* Still coming (the round is working, or the picture is loading): a soft shimmer, never a spinner. */}
      {(show && loaded !== url) || (!show && waiting) ? (
        <Skeleton motion="shimmer" aria-hidden="true" className="absolute inset-0 rounded-none bg-muted" />
      ) : null}
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
