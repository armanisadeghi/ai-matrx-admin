"use client";

/**
 * Smart Add — the slotted results form. Every finding goes to the slot it belongs to (Brand
 * name, Logo, Website, Social accounts, Contact, About) instead of one long list. Every slot is
 * on screen from the start with a quiet placeholder, so nothing moves when findings arrive; each
 * finding fades in where it belongs. Answers per slot:
 *   name: Preferred / Alias / Not us · logo: pick one (the rest are not us) · website: Primary /
 *   Ours / Not us · accounts: Ours / Not us · contact: Primary / Ours / Not us · about: Use / Not us.
 */

import { Check, Globe, Star, Tag, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { websiteHost, type Decision, type EvidenceField, type EvidenceItem } from "./evidence";

interface Choice {
  decision: Decision;
  label: string;
}

const NAME_CHOICES: Choice[] = [
  { decision: "preferred", label: "Preferred" },
  { decision: "alias", label: "Alias" },
  { decision: "no", label: "Not us" },
];
const PRIMARY_CHOICES: Choice[] = [
  { decision: "preferred", label: "Primary" },
  { decision: "yes", label: "Ours" },
  { decision: "no", label: "Not us" },
];
const OURS_CHOICES: Choice[] = [
  { decision: "yes", label: "Ours" },
  { decision: "no", label: "Not us" },
];
const USE_CHOICES: Choice[] = [
  { decision: "preferred", label: "Use" },
  { decision: "no", label: "Not us" },
];

export function SmartAddSlots({
  items,
  decisions,
  working,
  started,
  locked,
  onDecide,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  working: boolean;
  /** False until the first identify round starts: empty slots stay quiet. */
  started: boolean;
  locked: boolean;
  onDecide: (key: string, decision: Decision) => void;
}) {
  const of = (...fields: EvidenceField[]) => items.filter((i) => fields.includes(i.field));
  const socials = of("social");
  const platforms = [...new Set(socials.map((s) => s.platform ?? "other"))];
  const empty = working ? "Looking…" : started ? "Nothing found" : "—";
  const row = (item: EvidenceItem, choices: Choice[], children: React.ReactNode) => (
    <SlotRow key={item.key} item={item} decision={decisions[item.key] ?? null} choices={choices} locked={locked} onDecide={onDecide}>
      {children}
    </SlotRow>
  );

  return (
    <div className="flex flex-col divide-y divide-border" data-testid="smart-add-slots">
      <Slot title="Brand name" empty={of("name").length ? null : empty}>
        {of("name").map((i) => row(i, NAME_CHOICES, <span className="truncate text-sm font-medium">{i.value}</span>))}
      </Slot>

      <Slot title="Logo" empty={of("logo").length ? null : empty}>
        <div className="flex flex-wrap gap-2 px-3 py-2">
          {of("logo").map((i) => (
            <LogoChoice key={i.key} item={i} decision={decisions[i.key] ?? null} locked={locked} onPick={() => onDecide(i.key, "preferred")} />
          ))}
        </div>
      </Slot>

      <Slot title="Website" empty={of("website").length ? null : empty}>
        {of("website").map((i) => row(i, PRIMARY_CHOICES, <span className="truncate text-sm">{i.label ?? websiteHost(i.value)}</span>))}
      </Slot>

      <Slot title="Social accounts" empty={socials.length ? null : empty}>
        {platforms.map((p) => (
          <div key={p} className="flex flex-col">
            <div className="flex items-center gap-1.5 px-3 pt-1.5 text-[11px] font-medium text-muted-foreground">
              <PlatformMark platform={p} size={12} /> {platformLabel(p)}
            </div>
            {socials
              .filter((s) => (s.platform ?? "other") === p)
              .map((i) =>
                row(
                  i,
                  OURS_CHOICES,
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar item={i} />
                    <span className="truncate text-sm">@{i.handle ?? ""}</span>
                    {i.followers != null ? (
                      <span className="shrink-0 text-xs text-muted-foreground">{formatCount(i.followers)}</span>
                    ) : null}
                  </span>,
                ),
              )}
          </div>
        ))}
      </Slot>

      <Slot title="Contact" empty={of("phone", "email", "address").length ? null : empty}>
        {of("phone", "email", "address").map((i) =>
          row(
            i,
            PRIMARY_CHOICES,
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">{CONTACT_LABEL[i.field]}</span>
              <span className="truncate">{i.value}</span>
            </span>,
          ),
        )}
      </Slot>

      <Slot title="About" empty={of("description", "category").length ? null : empty}>
        {of("description", "category").map((i) =>
          row(
            i,
            USE_CHOICES,
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">{i.field === "category" ? "Category" : "About"}</span>
              <span className="truncate">{i.value}</span>
            </span>,
          ),
        )}
      </Slot>
    </div>
  );
}

const CONTACT_LABEL: Partial<Record<EvidenceField, string>> = { phone: "Phone", email: "Email", address: "Address" };

function Slot({ title, empty, children }: { title: string; empty: string | null; children: React.ReactNode }) {
  return (
    <section className="flex min-h-14 flex-col py-1" aria-label={title}>
      <h3 className="px-3 pt-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      {empty ? <p className="px-3 py-1.5 text-xs text-muted-foreground/60">{empty}</p> : children}
    </section>
  );
}

function SlotRow({
  item,
  decision,
  choices,
  locked,
  onDecide,
  children,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  choices: Choice[];
  locked: boolean;
  onDecide: (key: string, decision: Decision) => void;
  children: React.ReactNode;
}) {
  const meta = `${item.source.where ?? item.source.kind} · ${Math.round(item.confidence * 100)}%`;
  return (
    <div
      className={`flex min-h-10 items-center gap-2 px-3 py-1 animate-in fade-in duration-300 ${decision === "no" ? "opacity-45" : ""}`}
      data-testid="smart-add-item"
      data-field={item.field}
      data-decision={decision ?? "open"}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <span className="truncate text-[11px] text-muted-foreground" title={item.source.url ?? undefined}>
          {meta}
        </span>
      </div>
      <div className="flex shrink-0 gap-1">
        {choices.map((c) => (
          <Button
            key={c.decision}
            variant={decision === c.decision ? (c.decision === "no" ? "danger" : "primary") : "quiet"}
            aria-pressed={decision === c.decision}
            aria-label={c.label}
            disabled={locked}
            onClick={() => onDecide(item.key, c.decision)}
          >
            <ChoiceIcon decision={c.decision} />
            <span className="hidden sm:inline">{c.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function LogoChoice({
  item,
  decision,
  locked,
  onPick,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  locked: boolean;
  onPick: () => void;
}) {
  const picked = decision === "preferred";
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={picked}
      aria-label={`Use this logo (${item.source.where ?? "found"})`}
      title={item.source.where ?? undefined}
      onClick={onPick}
      className={`relative flex size-16 items-center justify-center overflow-hidden rounded-md border bg-muted animate-in fade-in duration-300 ${
        picked ? "border-primary ring-2 ring-primary" : "border-border"
      } ${decision === "no" ? "opacity-40" : ""}`}
      data-testid="smart-add-logo"
    >
      {item.profile_id ? (
        <SocialImage door={profileAvatarDoor(item.profile_id)} url={item.image_url} fallback={<Globe className="size-4" />} className="size-full object-contain" />
      ) : (
        <img src={item.image_url ?? item.value} alt="" className="size-full object-contain" />
      )}
      {picked ? (
        <span className="absolute right-0.5 top-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
          <Check className="size-3" />
        </span>
      ) : null}
    </button>
  );
}

function Avatar({ item }: { item: EvidenceItem }) {
  return item.profile_id ? (
    <SocialImage
      door={profileAvatarDoor(item.profile_id)}
      url={item.image_url}
      fallback={<PlatformMark platform={item.platform ?? ""} size={16} />}
      className="size-6 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex size-6 shrink-0 items-center justify-center">
      <PlatformMark platform={item.platform ?? ""} size={16} />
    </span>
  );
}

/** On phones the choice is an icon (the label is its accessible name): one shape per meaning. */
function ChoiceIcon({ decision }: { decision: Decision }) {
  const cls = "size-3.5 sm:hidden";
  if (decision === "preferred") return <Star className={cls} />;
  if (decision === "alias") return <Tag className={cls} />;
  if (decision === "no") return <X className={cls} />;
  return <Check className={cls} />;
}
