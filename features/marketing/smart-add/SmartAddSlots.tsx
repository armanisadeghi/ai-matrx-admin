"use client";

/**
 * Smart Add — the slotted results form. Every finding goes to the slot it belongs to, and each
 * slot has its own weight: the brand name reads large, logos are big tiles, accounts are rich
 * rows with the real profile photo, contact is compact, About is readable text. Every slot is on
 * screen from the start (no layout shift); findings fade in where they belong. Answers:
 *   name / about / category: Preferred / Alias|Use / Not us (one preferred per slot)
 *   logo: pick one (the rest become not us) · website + contact: Primary / Ours / Not us
 *   accounts: Ours / Not us / Related (a named relationship, same picker as the compare view).
 */

import { useState } from "react";
import { Check, Maximize2, Moon, Star, Sun, Tag, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { compareRows, websiteHost, type Candidate, type Decision, type EvidenceField, type EvidenceItem, type Relation } from "./evidence";
import { accountHandleLine, CustomAdd, OpenLink, RelationPicker, useRelationKinds } from "./SmartAddExtras";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { profileUrlFor } from "@/features/marketing/social/link";
import { Shared } from "./stage/Shared";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
const ABOUT_CHOICES: Choice[] = [
  { decision: "preferred", label: "Preferred" },
  { decision: "yes", label: "Use" },
  { decision: "no", label: "Not us" },
];

/** Plain words for where a finding was read. Internal names never reach the screen. */
const WHERE_LABEL: Record<string, string> = {
  "og:image": "share image",
  "homepage link": "link on the site",
  "homepage text": "text on the site",
  "header/nav image": "header image",
  "the address itself": "what you typed",
};
const KIND_LABEL: Record<string, string> = {
  website: "website",
  social_profile: "profile",
  link_in_bio: "link in bio",
  typed: "typed by you",
  web_search: "web search",
};

/** Where a finding was read, in words a person uses; "" when there is nothing meaningful to say. */
function whereOf(item: EvidenceItem): string {
  const raw = (item.source.where ?? "").trim();
  const low = raw.toLowerCase();
  if (WHERE_LABEL[low]) return WHERE_LABEL[low];
  if (!raw || low.startsWith("schema.org") || low.includes("structured") || low.includes("json-ld") || low.startsWith("og:") || low.startsWith("meta") || low === "page title" || low === "title")
    return KIND_LABEL[item.source.kind] ?? "";
  // Anything that still looks like an internal name (underscores, colons, dots, camelCase) is not shown.
  if (/[_:.]|[a-z][A-Z]/.test(raw)) return KIND_LABEL[item.source.kind] ?? "";
  return raw;
}

export function SmartAddSlots({
  items,
  decisions,
  working,
  started,
  locked,
  person,
  onDecide,
  relations,
  onRelate,
  onAdd,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  working: boolean;
  /** False until the first identify round starts: empty slots stay quiet. */
  started: boolean;
  locked: boolean;
  /** A personal brand: a headshot instead of a logo, and expertise. */
  person: boolean;
  onDecide: (key: string, decision: Decision) => void;
  /** Accounts answered "Related": candidate id (the account's key) -> its relationship. */
  relations: Record<string, Relation>;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  /** A value the person typed into a slot ("Custom"). */
  onAdd: (item: EvidenceItem) => void;
}) {
  const custom = (field: EvidenceField | "contact", placeholder: string, label?: string) => (
    <CustomAdd field={field} placeholder={placeholder} label={label} onAdd={onAdd} disabled={locked} />
  );
  const of = (...fields: EvidenceField[]) => items.filter((i) => fields.includes(i.field));
  const socials = of("social");
  const { kinds, onCustom } = useRelationKinds(onRelate);
  // The same candidates the compare view builds: an account's candidate id is its key.
  const candidateByKey = new Map<string, Candidate>();
  for (const row of compareRows(items)) for (const c of row.candidates) candidateByKey.set(c.id, c);
  // Every platform's looked-up photo (the same source as the image library): an account row whose
  // own item came from a page link still shows the real photo.
  const photoByPlatform = new Map<string, EvidenceItem>();
  for (const l of of("logo")) if (l.profile_id && l.platform) photoByPlatform.set(l.platform, l);
  // The display name that profile reported (its own "name" finding), for rows that only had a link.
  const nameByProfile = new Map<string, string>();
  for (const n of of("name")) if (n.source.kind === "social_profile" && n.source.url) nameByProfile.set(n.source.url, n.value);
  const platforms = [...new Set(socials.map((s) => s.platform ?? "other"))];
  const empty = working ? "Looking…" : started ? "Nothing found" : "—";
  const choices = (item: EvidenceItem, list: Choice[]) => (
    <Choices item={item} decision={decisions[item.key] ?? null} choices={list} locked={locked} onDecide={onDecide} />
  );

  return (
    <div className="flex flex-col divide-y divide-border" data-testid="smart-add-slots">
      <Slot title={person ? "Name" : "Brand name"} empty={of("name").length ? null : empty} after={custom("name", person ? "Your name" : "Brand name")}>
        {of("name").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, NAME_CHOICES)}>
            <Shared id={i.key} positionOnly className="inline-block max-w-full truncate align-top text-lg font-semibold leading-tight">{i.value}</Shared>
          </Row>
        ))}
      </Slot>

      <Slot title={person ? "Headshot & photos" : "Logo & images"} empty={of("logo").length ? null : empty} hint="Pick every image to keep; star the main one">
        <div className="flex flex-wrap gap-3 px-4 pb-3 pt-1">
          {of("logo").map((i) => (
            <Shared key={i.key} id={i.key} as="div" className="empty:hidden">
            <LogoChoice
              key={i.key}
              item={i}
              decision={decisions[i.key] ?? null}
              locked={locked}
              round={person}
              onToggle={() => onDecide(i.key, decisions[i.key] === "yes" || decisions[i.key] === "preferred" ? "yes" : "yes")}
              onClear={() => onDecide(i.key, decisions[i.key] ?? "yes")}
              onPrimary={() => onDecide(i.key, "preferred")}
            />
            </Shared>
          ))}
        </div>
      </Slot>

      <Slot title="Websites" empty={of("website").length ? null : empty} after={custom("website", "another-site.com")}>
        {of("website").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={
            <>
              {choices(i, PRIMARY_CHOICES)}
              <OpenLink url={i.url ?? i.value} />
            </>
          }>
            <span className="truncate text-base font-medium">{i.label ?? websiteHost(i.value)}</span>
          </Row>
        ))}
      </Slot>

      <Slot title="Social accounts" empty={socials.length ? null : empty} after={custom("social", "@handle or profile link")}>
        {platforms.map((p) => (
          <div key={p} className="flex flex-col">
            <div className="px-4 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {platformLabel(p)}
            </div>
            {socials
              .filter((s) => (s.platform ?? "other") === p)
              .map((i) => (
                <Row
                  key={i.key}
                  item={i}
                  decision={decisions[i.key] ?? null}
                  actions={
                    <>
                      {choices(i, OURS_CHOICES)}
                      {candidateByKey.get(i.key) ? (
                        <RelationPicker
                          kinds={kinds}
                          relation={relations[i.key] ?? null}
                          onRelate={(r) => onRelate(candidateByKey.get(i.key) as Candidate, r)}
                          onCustom={(label) => onCustom(candidateByKey.get(i.key) as Candidate, label)}
                        />
                      ) : null}
                      {accountUrl(i, candidateByKey.get(i.key)) ? <OpenLink url={accountUrl(i, candidateByKey.get(i.key)) as string} /> : null}
                    </>
                  }
                  hideWhere
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Shared id={i.key} className="shrink-0">
                      <Avatar item={i.profile_id ? i : { ...i, ...photoOf(photoByPlatform.get(i.platform ?? ""), i) }} />
                    </Shared>
                    <AccountText
                      item={i}
                      name={i.label ?? nameByProfile.get(photoByPlatform.get(i.platform ?? "")?.source.url ?? "") ?? null}
                    />
                  </span>
                </Row>
              ))}
          </div>
        ))}
      </Slot>

      <Slot title="Contact" empty={of("phone", "email", "address").length ? null : empty} after={custom("contact", "Phone, email or address")}>
        {of("phone", "email", "address").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, PRIMARY_CHOICES)} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{CONTACT_LABEL[i.field]}</span>
              <span className="truncate">{i.value}</span>
            </span>
          </Row>
        ))}
      </Slot>

      {person ? (
        <Slot title="Expertise" empty={of("expertise").length ? null : started ? "Add what you are known for" : "—"} after={custom("expertise", "e.g. Spanish property law")}>
          {of("expertise").map((i) => (
            <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, OURS_CHOICES)} compact>
              <span className="truncate text-sm">{i.value}</span>
            </Row>
          ))}
        </Slot>
      ) : null}

      <Slot title="About" empty={of("description", "category", "tagline").length ? null : empty} after={
        <div className="flex flex-wrap">
          {custom("tagline", "Tagline", "Tagline")}
          {custom("description", "What you do, in a sentence or two", "Description")}
          {custom("category", "Category", "Category")}
        </div>
      }>
        {of("tagline").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, ABOUT_CHOICES)} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Tagline</span>
              <span className="truncate italic">{i.value}</span>
            </span>
          </Row>
        ))}
        {of("category").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, ABOUT_CHOICES)} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Category</span>
              <span className="truncate">{i.value}</span>
            </span>
          </Row>
        ))}
        {of("description").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} actions={choices(i, ABOUT_CHOICES)} top>
            <ReadMore text={i.value} />
          </Row>
        ))}
      </Slot>
    </div>
  );
}

const CONTACT_LABEL: Partial<Record<EvidenceField, string>> = { phone: "Phone", email: "Email", address: "Address" };

function Slot({
  title,
  empty,
  hint,
  after,
  children,
}: {
  title: string;
  empty: string | null;
  hint?: string;
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-16 flex-col py-2" aria-label={title}>
      <h3 className="flex items-baseline gap-2 px-4 pb-1 text-xs font-semibold text-muted-foreground">
        {title}
        {hint && !empty ? <span className="font-normal text-muted-foreground/60">{hint}</span> : null}
      </h3>
      {empty ? <p className="px-4 py-1 text-sm text-muted-foreground/50">{empty}</p> : children}
      {after}
    </section>
  );
}

function Row({
  item,
  decision,
  actions,
  children,
  compact,
  top,
  hideWhere,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  actions: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  top?: boolean;
  hideWhere?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 px-4 animate-in fade-in duration-300 ${compact ? "py-1" : "py-2"} ${top ? "items-start" : "items-center"} ${
        decision === "no" ? "opacity-40" : ""
      }`}
      data-testid="smart-add-item"
      data-field={item.field}
      data-decision={decision ?? "open"}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {children}
        {hideWhere || !whereOf(item) ? null : (
          <span className="truncate text-[11px] text-muted-foreground/80" title={item.source.url ?? undefined}>
            {whereOf(item)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{actions}</div>
    </div>
  );
}

function Choices({
  item,
  decision,
  choices,
  locked,
  onDecide,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  choices: Choice[];
  locked: boolean;
  onDecide: (key: string, decision: Decision) => void;
}) {
  return (
    <>
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
    </>
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

/** Full text that wraps; past about four lines it folds behind "Show more". */
function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className={`whitespace-pre-line text-sm leading-relaxed ${long && !open ? "line-clamp-4" : ""}`}>{text}</span>
      {long ? (
        <Button variant="quiet" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </span>
  );
}

type Backdrop = "auto" | "light" | "dark";
const CHECKER = "bg-[repeating-conic-gradient(#d4d4d8_0%_25%,#f4f4f5_0%_50%)] bg-[length:14px_14px]";

function LogoChoice({
  item,
  decision,
  locked,
  round,
  onToggle,
  onClear,
  onPrimary,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  locked: boolean;
  round: boolean;
  onToggle: () => void;
  onClear: () => void;
  onPrimary: () => void;
}) {
  const kept = decision === "yes" || decision === "preferred";
  const primary = decision === "preferred";
  const [broken, setBroken] = useState(false);
  const [ratio, setRatio] = useState(1);
  const [backdrop, setBackdrop] = useState<Backdrop>("auto");
  const [auto, setAuto] = useState<"light" | "dark" | "checker">("checker");
  const [open, setOpen] = useState(false);
  const raw = item.image_url ?? item.value;
  // Through our image proxy: same origin, so the canvas may read the pixels (a white logo needs the dark tile).
  const src = /^https?:\/\//i.test(raw) ? proxiedExternalImageUrl(raw) : raw;
  const shade = backdrop === "auto" ? auto : backdrop;
  const bg = shade === "dark" ? "bg-zinc-800" : shade === "light" ? "bg-zinc-50" : CHECKER;
  const wide = !round && ratio > 1.5;
  const where = whereOf(item);
  const cycle = () => setBackdrop((b) => (b === "auto" ? (auto === "dark" ? "light" : "dark") : b === "dark" ? "light" : "dark"));
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
    const b = brightnessOf(img);
    if (b === null) return;
    setAuto(shadeForBrightness(b));
  };
  const picture = (className: string) =>
    item.profile_id ? (
      <SocialImage
        door={profileAvatarDoor(item.profile_id)}
        url={item.image_url}
        fallback={<PlatformMark platform={item.platform ?? ""} size={24} />}
        className="size-full rounded-full object-cover"
      />
    ) : (
      <img src={src} alt="" className={className} onLoad={onLoad} onError={() => setBroken(true)} />
    );
  // A link the site never served is not offered at all (no dead tile to keep or skip).
  if (broken) return null;
  return (
    <figure className={`flex flex-col items-center gap-1 animate-in fade-in duration-300 ${wide ? "w-40 sm:w-48" : "w-[5.25rem] sm:w-24"}`}>
      <span className="relative w-full">
        {/* ui-exception: an image tile you select; the 28px Button cannot hold a 96px image */}
        <button
          type="button"
          disabled={locked}
          aria-pressed={kept}
          aria-label={`${kept ? "Keep" : "Skip"} this image${where ? ` (${where})` : ""}`}
          onClick={kept ? onClear : onToggle}
          className={`flex h-[5.25rem] w-full items-center justify-center overflow-hidden border p-1.5 sm:h-24 ${bg} ${
            round ? "rounded-full" : "rounded-lg"
          } ${primary ? "border-primary ring-2 ring-primary" : kept ? "border-primary/60 ring-1 ring-primary/60" : "border-border"}`}
          data-testid="smart-add-logo"
        >
          {picture("max-h-full max-w-full object-contain")}
        </button>
        {kept ? (
          <span className="absolute -right-1.5 -top-1.5">
            <Button
              variant={primary ? "primary" : "outline"}
              aria-label={primary ? "Main image" : "Make this the main image"}
              title={primary ? "Main image" : "Make main"}
              icon={<Star />}
              disabled={locked}
              onClick={onPrimary}
            />
          </span>
        ) : null}
        {(
          <span className="absolute -bottom-1.5 -left-1.5 flex gap-0.5">
            <Button variant="outline" aria-label="Enlarge this image" title="Enlarge" icon={<Maximize2 />} onClick={() => setOpen(true)} />
            {item.profile_id ? null : (
              <Button
                variant="outline"
                aria-label="Change the background behind this image"
                title="Change background"
                icon={shade === "dark" ? <Sun /> : <Moon />}
                onClick={cycle}
              />
            )}
          </span>
        )}
      </span>
      <figcaption className="w-full truncate text-center text-[11px] text-muted-foreground">
        {primary ? "Main" : ""}
        {primary && where ? " · " : ""}
        {where}
      </figcaption>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{where ? `Image from ${where}` : "Image"}</DialogTitle>
          <div className={`flex min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4 ${bg}`}>
            {item.profile_id ? (
              <SocialImage
                door={profileAvatarDoor(item.profile_id)}
                url={item.image_url}
                fallback={<PlatformMark platform={item.platform ?? ""} size={48} />}
                className="max-h-[60dvh] max-w-full object-contain"
              />
            ) : (
              <img src={src} alt="" className="h-[50dvh] w-full object-contain" />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBackdrop("light")}>Light background</Button>
            <Button variant="outline" onClick={() => setBackdrop("dark")}>Dark background</Button>
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

/** The account's real profile photo (round, 40px); the platform logo sits beside the name. */
function Avatar({ item }: { item: EvidenceItem }) {
  return (
    <span className="relative size-10 shrink-0">
      {item.profile_id || item.image_url ? (
        <SocialImage
          door={item.profile_id ? profileAvatarDoor(item.profile_id) : null}
          url={item.image_url}
          fallback={<span className="flex size-10 items-center justify-center rounded-full bg-muted" />}
          className="size-10 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {(item.handle ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** Logo + name on one line, the exact handle (and followers) under it; no name: the handle is the title, once. */
function AccountText({ item, name }: { item: EvidenceItem; name: string | null }) {
  const handle = accountHandleLine(item.platform, item.handle);
  const followers = item.followers != null ? `${formatCount(item.followers)} followers` : null;
  const sub = name ? [handle, followers].filter(Boolean).join(" · ") : (followers ?? "");
  return (
    <span className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
        <PlatformMark platform={item.platform ?? ""} size={16} />
        <span className="truncate">{name ?? handle ?? ""}</span>
      </span>
      {sub ? <span className="truncate text-xs text-muted-foreground">{sub}</span> : null}
    </span>
  );
}

/** The exact address of an account: the candidate's own, else the platform's profile address for its handle. */
function accountUrl(item: EvidenceItem, candidate: Candidate | undefined): string | null {
  const own = candidate?.url ?? item.url ?? item.source.url ?? (/^https?:\/\//i.test(item.value) ? item.value : null);
  if (own) return own;
  const platform = item.platform as Parameters<typeof profileUrlFor>[0] | null;
  return platform && item.handle ? profileUrlFor(platform, item.handle) : null;
}

/** The photo fields of a looked-up profile, only when it is plausibly this account (same platform). */
function photoOf(photo: EvidenceItem | undefined, row: EvidenceItem): Partial<EvidenceItem> {
  if (!photo || photo.platform !== row.platform) return {};
  return { profile_id: photo.profile_id, image_url: photo.image_url };
}
