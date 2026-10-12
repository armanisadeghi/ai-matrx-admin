"use client";

/**
 * Smart Add — the pieces around the slots: "Custom" (type your own value into any slot), the live
 * brand card (the primary choices, shown as they confirm), the situation guide (brand-new /
 * conflicted / established) and the side-by-side compare used when look-alikes are found.
 */

import { useState } from "react";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { Check, Globe, Plus, X } from "lucide-react";
import { Button, Field, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { customItem, websiteHost, type BrandBasics, type Decision, type EvidenceField, type EvidenceItem } from "./evidence";

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

/** The primary choices, laid out like an official profile card — builds as the person confirms. */
export function BrandCard({
  basics,
  person,
  location,
}: {
  basics: BrandBasics;
  person: boolean;
  location: string | null;
}) {
  const primary = basics.images.find((i) => i.primary) ?? null;
  const empty = !basics.name && !primary && !basics.websiteUrl;
  return (
    <section
      className="flex min-h-28 items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm"
      aria-label="Your brand"
      data-testid="smart-add-brand-card"
    >
      <span className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border bg-white ${person ? "rounded-full" : "rounded-xl"}`}>
        {primary ? (
          <img src={primary.url} alt="" className={person ? "size-full object-cover" : "max-h-full max-w-full object-contain p-1.5"} />
        ) : (
          <Globe className="size-7 text-muted-foreground/40" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate text-xl font-semibold ${empty ? "text-muted-foreground/50" : ""}`}>
          {basics.name ?? (person ? "Your name" : "Your brand")}
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
    </section>
  );
}

// ── Situations ──────────────────────────────────────────────────────────────────

export type Situation = "new" | "conflicted" | "established" | null;

/** Which of the three intake situations this is, once identification has settled. */
export function situationOf(items: EvidenceItem[], settled: boolean): Situation {
  if (!settled || items.length === 0) return items.length === 0 && settled ? "new" : null;
  const names = new Set(items.filter((i) => i.field === "name").map((i) => i.value.toLowerCase()));
  const perPlatform = new Map<string, number>();
  for (const s of items.filter((i) => i.field === "social")) perPlatform.set(s.platform ?? "", (perPlatform.get(s.platform ?? "") ?? 0) + 1);
  if (names.size >= 3 || [...perPlatform.values()].some((n) => n >= 2)) return "conflicted";
  const has = (f: EvidenceField) => items.some((i) => i.field === f);
  if (!has("name") || items.length <= 3) return "new";
  if (has("logo") && has("website") && has("social")) return "established";
  return null;
}

/** One finding source (the website, each profile) as a column the person can claim or reject. */
interface SourceGroup {
  id: string;
  title: string;
  photo: EvidenceItem | null;
  items: EvidenceItem[];
}

function groupBySource(items: EvidenceItem[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const item of items) {
    const id = item.source.kind === "typed" ? "typed" : (item.source.url ?? item.source.node);
    const g = groups.get(id) ?? { id, title: "", photo: null, items: [] };
    g.items.push(item);
    if (item.field === "social" && item.source.kind === "social_profile") {
      g.title = item.label ?? `@${item.handle}`;
      g.photo = item;
    }
    if (!g.title && item.source.url) g.title = websiteHost(item.source.url);
    groups.set(id, g);
  }
  return [...groups.values()].filter((g) => g.id !== "typed");
}

export function CompareSources({
  items,
  decisions,
  onClaim,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  onClaim: (keys: string[], decision: Decision) => void;
}) {
  const groups = groupBySource(items);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="smart-add-compare">
      {groups.map((g) => {
        const name = g.items.find((i) => i.field === "name")?.value ?? g.title;
        const rejected = g.items.every((i) => decisions[i.key] === "no");
        const claimed = g.items.some((i) => decisions[i.key] === "yes" || decisions[i.key] === "preferred");
        return (
          <div key={g.id} className={`flex flex-col gap-2 rounded-xl border bg-card p-3 ${claimed ? "border-primary" : "border-border"} ${rejected ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-2">
              {g.photo?.profile_id ? (
                <SocialImage door={profileAvatarDoor(g.photo.profile_id)} url={g.photo.image_url} fallback={<Globe className="size-4" />} className="size-9 rounded-full object-cover" />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                  {g.photo ? <PlatformMark platform={g.photo.platform ?? ""} size={16} /> : <Globe className="size-4 text-muted-foreground" />}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {g.photo ? `${platformLabel(g.photo.platform ?? "")}${g.photo.followers != null ? ` · ${formatCount(g.photo.followers)}` : ""}` : g.title}
                </span>
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{g.items.length} findings</span>
            <div className="flex gap-1">
              <Button variant={claimed ? "primary" : "outline"} icon={<Check />} onClick={() => onClaim(g.items.filter((i) => i.field !== "name").map((i) => i.key), "yes")}>
                This is us
              </Button>
              <Button variant={rejected ? "danger" : "quiet"} icon={<X />} onClick={() => onClaim(g.items.map((i) => i.key), "no")}>
                Not us
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
