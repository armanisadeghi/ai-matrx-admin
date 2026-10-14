"use client";

/**
 * Smart Add — the slotted results form. Every finding goes to the slot it belongs to, and each
 * slot has its own weight: the brand name reads large, logos are big tiles, accounts are rich
 * rows with the real profile photo, contact is compact, About is readable text. Every slot is on
 * screen from the start (no layout shift); findings fade in where they belong. Answers:
 *   name / about / category: Preferred / Alias|Use / Not us (one preferred per slot)
 *   logo: pick one (the rest become not us) · website + contact: Primary / Ours / Not us
 *   accounts: Ours / Not us.
 * EVERY DECISION OFFERS A WAY OUT (Arman, 2026-10-14): each row is DecisionControl — its main answers
 * plus ONE "Other" menu: context answers first (a name can be a Tagline, a product, a former name, a
 * location, a person, a related brand; a site or account is Related ▸ a relationship), "Skip for now"
 * last. A chosen way-out shows as a small badge on the row's second line.
 */

import { useState } from "react";
import { Maximize2, Moon, Star, Sun, X } from "lucide-react";
import { Badge, Button, DecisionControl, Field, type DecisionAnswer, type WayOutItem } from "@ai-matrx/design-system/controls";
import { FirstUseHint } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { collapseAliasedAccounts, compareRows, customItem, websiteHost, type Candidate, type Decision, type EvidenceField, type EvidenceItem, type Relation } from "./evidence";
import { accountHandleLine, CUSTOM_RELATION, CustomAdd, CustomRelation, OpenLink, relationWayOut, useRelationKinds } from "./SmartAddExtras";
import { webCandidate } from "./relations";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { SourcesBadge, useLogoGroups, type LogoGroup } from "./logoGroups";
import { profileUrlFor } from "@/features/marketing/social/link";
import { Shared } from "./stage/Shared";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** How Yes lands: a name (main, then aliases), a primary-able value (main, then kept), or plain kept. */
type RowMode = "name" | "primary" | "plain";

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
  onBroken,
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
  /** An image the browser could not load: its tile is hidden, and it must not be saved as a candidate. */
  onBroken?: (key: string) => void;
}) {
  const custom = (field: EvidenceField | "contact", placeholder: string, label?: string) => (
    <CustomAdd field={field} placeholder={placeholder} label={label} onAdd={onAdd} disabled={locked} />
  );
  const of = (...fields: EvidenceField[]) => items.filter((i) => fields.includes(i.field));
  const socials = collapseAliasedAccounts(of("social"));
  const { kinds, onCustom } = useRelationKinds(onRelate);
  // Near-identical images (one mark from the site and every profile) show as ONE tile; an answer reaches every source.
  const logoGroups = useLogoGroups(of("logo"));
  const isKept = (k: string) => decisions[k] === "yes" || decisions[k] === "preferred";
  const keepGroup = (g: LogoGroup) => {
    for (const m of g.members) if (!isKept(m.key)) onDecide(m.key, "yes");
  };
  const clearGroup = (g: LogoGroup) => {
    for (const m of g.members) if (decisions[m.key]) onDecide(m.key, decisions[m.key]); // the same answer clears it
  };
  const starGroup = (g: LogoGroup) => {
    if (decisions[g.lead.key] === "preferred") return onDecide(g.lead.key, "preferred"); // un-star
    onDecide(g.lead.key, "preferred");
    for (const m of g.members.slice(1)) if (!isKept(m.key)) onDecide(m.key, "yes");
  };
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
  // ── the way out: every row's "Other" menu ──────────────────────────────
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [asTagline, setAsTagline] = useState<ReadonlySet<string>>(new Set());
  const [customFor, setCustomFor] = useState<string | null>(null);
  const drop = (set: ReadonlySet<string>, key: string) => new Set([...set].filter((k) => k !== key));
  const candidateOf = (i: EvidenceItem) => candidateByKey.get(i.key) ?? webCandidate(i);
  /** Clears whatever the row was answered (a main answer, a relationship, a skip, a tagline). */
  const clearRow = (i: EvidenceItem) => {
    if (decisions[i.key]) onDecide(i.key, decisions[i.key]); // answering the same again clears it
    if (relations[i.key]) onRelate(candidateOf(i), null);
    setSkipped((s) => drop(s, i.key));
    setAsTagline((s) => drop(s, i.key));
  };
  const relatedMenu = (exclude: string[] = []): WayOutItem[] => relationWayOut(kinds, exclude);
  const nameWayOut: WayOutItem[] = [
    { value: TAGLINE, label: "Tagline or slogan" },
    ...Object.entries(NAME_RELATION_LABEL).map(([key, label]) => ({ value: `rel:${key}`, label })),
    ...relatedMenu(Object.keys(NAME_RELATION_LABEL)),
  ];
  const relatedWayOut = (): WayOutItem[] => relatedMenu();
  const onWayOut = (i: EvidenceItem, value: string) => {
    if (value === CUSTOM_RELATION) return setCustomFor(i.key);
    if (value === TAGLINE) {
      clearRow(i);
      // A real tagline: it lands in the About slot as the brand's tagline (saved as a tagline fact).
      onAdd({ ...customItem("tagline", i.value), source: i.source, confidence: i.confidence });
      setAsTagline((s) => new Set(s).add(i.key));
      return;
    }
    const kind = kinds.find((k) => `rel:${k.key}` === value);
    if (!kind) return;
    setSkipped((s) => drop(s, i.key));
    setAsTagline((s) => drop(s, i.key));
    const label = i.field === "name" ? (NAME_RELATION_LABEL[kind.key] ?? kind.label) : kind.label;
    onRelate(candidateOf(i), { key: kind.key, label, routesTo: kind.routesTo });
  };
  const noteOf = (i: EvidenceItem): React.ReactNode => {
    const relation = relations[i.key];
    const text = relation
      ? i.field === "name" && NAME_RELATION_LABEL[relation.key]
        ? relation.label
        : `Related · ${relation.label}`
      : asTagline.has(i.key)
        ? "Tagline"
        : skipped.has(i.key)
          ? "Skipped for now"
          : null;
    return text ? <Badge data-testid="smart-add-way-out">{text}</Badge> : null;
  };
  const below = (i: EvidenceItem): React.ReactNode =>
    customFor === i.key ? (
      <CustomRelation
        onCancel={() => setCustomFor(null)}
        onSave={async (label) => {
          await onCustom(candidateOf(i), label);
          setSkipped((s) => drop(s, i.key));
          setAsTagline((s) => drop(s, i.key));
          setCustomFor(null);
        }}
      />
    ) : null;
  /** The row's answer in the three words: a kept value (preferred, alias, yes) is Yes. */
  const answerOf = (i: EvidenceItem): DecisionAnswer | null => {
    const d = decisions[i.key];
    if (d === "no") return "no";
    if (d) return "yes";
    return relations[i.key] || asTagline.has(i.key) || skipped.has(i.key) ? "other" : null;
  };
  const isYes = (d: Decision | undefined) => d === "preferred" || d === "yes" || d === "alias";
  const preferredOf = (field: EvidenceField) => items.find((x) => x.field === field && decisions[x.key] === "preferred");
  /** Yes: a name is the brand's name (the first becomes the main one, later ones aliases); a site or
   *  contact is ours (the first is the primary); an account or expertise is simply ours. */
  const sayYes = (i: EvidenceItem, mode: RowMode) => {
    const d = decisions[i.key];
    if (isYes(d)) return onDecide(i.key, d as Decision); // pressing Yes again clears it
    if (mode === "plain") return onDecide(i.key, "yes");
    const main = preferredOf(i.field);
    onDecide(i.key, main ? (mode === "name" ? "alias" : "yes") : "preferred");
  };
  /** The star: make this kept value the main one (a name's old main one becomes an alias). */
  const makeMain = (i: EvidenceItem) => {
    if (decisions[i.key] === "preferred") return;
    const old = preferredOf(i.field);
    if (old && i.field === "name") onDecide(old.key, "alias");
    onDecide(i.key, "preferred");
  };
  const star = (i: EvidenceItem) =>
    isYes(decisions[i.key]) ? (
      <Button
        variant="quiet"
        pressed={decisions[i.key] === "preferred"}
        aria-label={decisions[i.key] === "preferred" ? "Main" : "Make main"}
        title={decisions[i.key] === "preferred" ? "Main" : "Make main"}
        icon={<Star />}
        disabled={locked}
        onClick={() => makeMain(i)}
      />
    ) : null;
  const choices = (item: EvidenceItem, mode: RowMode, wayOut?: WayOutItem[]) => (
    <DecisionControl
      value={answerOf(item)}
      onChange={(a) => {
        setSkipped((s) => drop(s, item.key));
        setAsTagline((s) => drop(s, item.key));
        if (a === "yes") sayYes(item, mode);
        else onDecide(item.key, "no");
      }}
      wayOut={wayOut}
      onWayOut={(v) => onWayOut(item, v)}
      wayOutValue={relations[item.key] ? `rel:${relations[item.key].key}` : asTagline.has(item.key) ? TAGLINE : null}
      onSkip={() => {
        clearRow(item);
        setSkipped((s) => new Set(s).add(item.key));
      }}
      skipped={skipped.has(item.key)}
      disabled={locked}
    />
  );

  // The first choice row carries the one-time hint (TipKit-style): pick an answer; nothing found is lost.
  const firstChoice = (n: number, control: React.ReactNode) =>
    n === 0 ? (
      <FirstUseHint id="smart-add.first-choice" title="Pick Yes, No or Other" detail="Anything you don't mark No stays" when={!locked}>
        <div className="flex items-center gap-1" data-smart-add-first-choice="">{control}</div>
      </FirstUseHint>
    ) : (
      control
    );

  return (
    <div className="flex flex-col divide-y divide-border" data-testid="smart-add-slots">
      <Slot title={person ? "Name" : "Brand name"} ask="Is this your name?" empty={of("name").length ? null : empty} after={custom("name", person ? "Your name" : "Brand name")}>
        {of("name").map((i, n) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} below={below(i)} actions={<>{firstChoice(n, choices(i, "name", nameWayOut))}{sourceLink(i)}</>}>
            <span className="min-w-0 truncate" title={i.value}><Shared id={i.key} positionOnly className="inline-block max-w-full truncate align-top text-lg font-semibold leading-tight">{i.value}</Shared></span>
          </Row>
        ))}
      </Slot>

      <Slot title={person ? "Headshot & photos" : "Logo & images"} empty={of("logo").length ? null : empty} hint="Pick every image to keep; star the main one">
        <div className="flex flex-wrap gap-3 px-4 pb-3 pt-1">
          {logoGroups.map((g) => (
            <Shared key={g.id} id={g.lead.key} as="div" className="empty:hidden">
            <LogoChoice
              key={g.lead.key}
              item={g.lead}
              decision={decisions[g.lead.key] ?? null}
              locked={locked}
              round={person}
              onToggle={() => keepGroup(g)}
              onClear={() => clearGroup(g)}
              onPrimary={() => starGroup(g)}
              onBroken={() => onBroken?.(g.lead.key)}
              badge={<SourcesBadge group={g} labelOf={(m) => (m.platform ? platformLabel(m.platform) : whereOf(m))} />}
            />
            </Shared>
          ))}
        </div>
      </Slot>

      <Slot title="Websites" ask="Is this yours?" empty={of("website").length ? null : empty} after={custom("website", "another-site.com")}>
        {of("website").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} below={below(i)} actions={
            <>
              {choices(i, "primary", relatedWayOut())}
              <OpenLink url={i.url ?? i.value} />
            </>
          }>
            <span className="truncate text-base font-medium" title={i.label ?? i.value}>{i.label ?? websiteHost(i.value)}</span>
          </Row>
        ))}
      </Slot>

      <Slot title="Social accounts" ask={person ? "Is this you?" : "Is this yours?"} empty={socials.length ? null : empty} after={custom("social", "@handle or profile link")}>
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
                  note={noteOf(i)}
                  below={below(i)}
                  actions={
                    <>
                      {choices(i, "plain", relatedWayOut())}
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

      <Slot title="Contact" ask="Is this yours?" empty={of("phone", "email", "address").length ? null : empty} after={custom("contact", "Phone, email or address")}>
        {of("phone", "email", "address").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} below={below(i)} actions={choices(i, "primary", relatedWayOut())} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{CONTACT_LABEL[i.field]}</span>
              <span className="truncate" title={i.value}>{i.value}</span>
            </span>
          </Row>
        ))}
      </Slot>

      {person ? (
        <Slot title="Expertise" ask="Is this you?" empty={of("expertise").length ? null : started ? "Add what you are known for" : "—"} after={custom("expertise", "e.g. Spanish property law")}>
          {of("expertise").map((i) => (
            <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} actions={choices(i, "plain")} compact>
              <span className="truncate text-sm" title={i.value}>{i.value}</span>
            </Row>
          ))}
        </Slot>
      ) : null}

      <Slot title="About" ask={person ? "Is this you?" : "Is this right?"} empty={of("description", "category", "tagline").length ? null : empty} after={
        <div className="flex flex-wrap">
          {custom("tagline", "Tagline", "Tagline")}
          {custom("description", "What you do, in a sentence or two", "Description")}
          {custom("category", "Category", "Category")}
        </div>
      }>
        {of("tagline").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} actions={<>{choices(i, "primary")}{sourceLink(i)}</>} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Tagline</span>
              <span className="truncate italic" title={i.value}>{i.value}</span>
            </span>
          </Row>
        ))}
        {of("category").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} actions={<>{choices(i, "primary")}{sourceLink(i)}</>} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Category</span>
              <span className="truncate" title={i.value}>{i.value}</span>
            </span>
          </Row>
        ))}
        {of("description").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} lead={star(i)} note={noteOf(i)} actions={<>{choices(i, "primary")}{sourceLink(i)}</>} top>
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
  ask,
  empty,
  hint,
  after,
  children,
}: {
  title: string;
  /** The question every row answers with Yes / No / Other ("Is this yours?"). */
  ask?: string;
  empty: string | null;
  hint?: string;
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-16 flex-col py-2" aria-label={title}>
      <h3 className="flex items-baseline gap-2 px-4 pb-1 text-xs font-semibold text-muted-foreground">
        {title}
        {ask && !empty ? <span className="font-normal text-muted-foreground/80">{ask}</span> : null}
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
  note,
  below,
  lead,
}: {
  item: EvidenceItem;
  /** A small control before the value (the "main one" star). */
  lead?: React.ReactNode;
  decision: Decision | null;
  /** The chosen way-out answer, as a small badge on the second line. */
  note?: React.ReactNode;
  /** A short inline editor under the row (a custom relationship). */
  below?: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  top?: boolean;
  hideWhere?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 px-4 animate-in fade-in duration-300 sm:flex-row ${compact ? "py-1" : "py-2"} ${top ? "sm:items-start" : "sm:items-center"} ${
        decision === "no" ? "opacity-40" : ""
      }`}
      data-testid="smart-add-item"
      data-field={item.field}
      data-decision={decision ?? "open"}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
      {lead !== undefined ? <span className="flex size-7 shrink-0 items-center justify-center">{lead}</span> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {children}
        {note || (!hideWhere && whereOf(item)) ? (
          <span className="flex min-w-0 items-center gap-1.5">
            {note}
            {hideWhere || !whereOf(item) ? null : (
              <span className="truncate text-[11px] text-muted-foreground/80" title={item.source.url ?? undefined}>
                {whereOf(item)}
              </span>
            )}
          </span>
        ) : null}
        {below}
      </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1 max-sm:w-full">{actions}</div>
    </div>
  );
}

const TAGLINE = "tagline";
/** A name that is not the brand's name, said the way a person says it (the relation kind it lands as). */
const NAME_RELATION_LABEL: Record<string, string> = {
  sub_brand: "Product or service name",
  former_account: "Former name",
  location: "Location or branch name",
  key_person: "Person's name",
};

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
  onBroken,
  badge,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  locked: boolean;
  round: boolean;
  onToggle: () => void;
  onClear: () => void;
  onPrimary: () => void;
  onBroken: () => void;
  /** A grouped tile's "3 sources" badge (placed over the tile's corner: no layout shift). */
  badge?: React.ReactNode;
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
      <img src={src} alt="" className={className} onLoad={onLoad} onError={() => {
        setBroken(true);
        onBroken();
      }} />
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
        {badge}
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
        <span className="truncate" title={name ?? handle ?? undefined}>{name ?? handle ?? ""}</span>
      </span>
      {sub ? <span className="truncate text-xs text-muted-foreground" title={sub}>{sub}</span> : null}
    </span>
  );
}

/** Open-in-new-tab for a finding, to the page it was read from; nothing when it has no address. */
function sourceLink(item: EvidenceItem): React.ReactNode {
  const url = item.source.url;
  return url && /^https?:\/\//i.test(url) ? <OpenLink url={url} /> : null;
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
