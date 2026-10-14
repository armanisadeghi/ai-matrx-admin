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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button, DecisionControl, Field, PropertyRow, type DecisionAnswer, type WayOutItem } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { FirstUseHint } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { rankByAnchors, type PersonAnchors } from "./anchorRank";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { collapseAliasedAccounts, compareRows, customItem, websiteHost, type Candidate, type Decision, type EvidenceField, type EvidenceItem, type Relation } from "./evidence";
import { accountHandleLine, CUSTOM_RELATION, CustomAdd, CustomRelation, OpenLink, relationWayOut, useRelationKinds } from "./SmartAddExtras";
import { webCandidate } from "./relations";
import { isStaffAccount } from "./staff";
import { brightnessOf, shadeForBrightness } from "./logo-shade";
import { LogoEnlarge, SourcesBadge, useLogoGroups, type LogoGroup, type SourceControls } from "./logoGroups";
import { profileUrlFor } from "@/features/marketing/social/link";
import { Shared } from "./stage/Shared";

/** How Yes lands: a name (main, then aliases), a primary-able value (main, then kept), or plain kept. */
type RowMode = "name" | "primary" | "plain";

/** Plain words for where a finding was read. Internal names never reach the screen. */
const WHERE_LABEL: Record<string, string> = {
  "og:image": "share image",
  "homepage link": "linked on the homepage",
  "team page link": "linked on the team page",
  "about page link": "linked on the about page",
  "footer link": "linked in the site footer",
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
  personAnchors,
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
  skipped,
  onSkip,
  taglines,
  onTagline,
  separated,
  onSeparate,
}: {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  working: boolean;
  /** False until the first identify round starts: empty slots stay quiet. */
  started: boolean;
  locked: boolean;
  /** A personal brand: a headshot instead of a logo, and expertise. */
  person: boolean;
  /** A person's known anchors (typed city / job / company, confirmed sites): accounts carrying them rank first. */
  personAnchors?: PersonAnchors;
  onDecide: (key: string, decision: Decision) => void;
  /** Accounts answered "Related": candidate id (the account's key) -> its relationship. */
  relations: Record<string, Relation>;
  onRelate: (c: Candidate, relation: Relation | null) => void;
  /** A value the person typed into a slot ("Custom"). */
  onAdd: (item: EvidenceItem) => void;
  /** An image the browser could not load: its tile is hidden, and it must not be saved as a candidate. */
  onBroken?: (key: string) => void;
  /** "Other → Skip for now": the keys set aside (kept by the session, so a reload brings them back). */
  skipped: ReadonlySet<string>;
  onSkip: (key: string, on: boolean) => void;
  /** "Other → Tagline or slogan": name key -> the tagline finding it became. The name row leaves the name list. */
  taglines: Record<string, EvidenceItem>;
  /** Move a name to the About tagline (`true`), or put it back (`false`). */
  onTagline: (item: EvidenceItem, on: boolean) => void;
  /** Logo sources the person split out of their group (kept by the session), and the way to split or put back. */
  separated: ReadonlySet<string>;
  onSeparate: (keys: string[], on: boolean) => void;
}) {
  const custom = (field: EvidenceField | "contact", placeholder: string, label?: string, inline?: boolean) => (
    <CustomAdd field={field} placeholder={placeholder} label={label} onAdd={onAdd} disabled={locked} inline={inline} />
  );
  const of = (...fields: EvidenceField[]) => items.filter((i) => fields.includes(i.field));
  const allAccounts = collapseAliasedAccounts(of("social"));
  // A business's person-only profiles (LinkedIn /in/) are its staff: Key people, never its accounts.
  const staff = allAccounts.filter((i) => isStaffAccount(i, person));
  const socials = allAccounts.filter((i) => !isStaffAccount(i, person));
  const { kinds, onCustom } = useRelationKinds(onRelate);
  // Near-identical images (one mark from the site and every profile) show as ONE tile; an answer reaches every source.
  const logoGroups = useLogoGroups(of("logo"), separated);
  const sourceControls: SourceControls = { separated, onSeparate };
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
  // ── Key people: Yes is the key-person relationship (saved as a person associated to the brand) ──
  const keyPersonKind = kinds.find((k) => k.routesTo === "key_person") ?? null;
  const isKeyPerson = (i: EvidenceItem) => relations[i.key]?.routesTo === "key_person";
  const staffAnswer = (i: EvidenceItem): DecisionAnswer | null =>
    decisions[i.key] === "no" ? "no" : isKeyPerson(i) ? "yes" : relations[i.key] || skipped.has(i.key) ? "other" : null;
  const staffChoices = (i: EvidenceItem) => (
    <DecisionControl
      value={staffAnswer(i)}
      onChange={(a) => {
        if (skipped.has(i.key)) onSkip(i.key, false);
        if (a === "yes") {
          if (isKeyPerson(i)) return onRelate(candidateOf(i), null); // pressing Yes again clears it
          if (decisions[i.key]) onDecide(i.key, decisions[i.key]);
          if (keyPersonKind) onRelate(candidateOf(i), { key: keyPersonKind.key, label: keyPersonKind.label, routesTo: keyPersonKind.routesTo });
          return;
        }
        if (relations[i.key]) onRelate(candidateOf(i), null);
        onDecide(i.key, "no");
      }}
      wayOut={relatedMenu(keyPersonKind ? [keyPersonKind.key] : [])}
      onWayOut={(v) => onWayOut(i, v)}
      wayOutValue={relations[i.key] && !isKeyPerson(i) ? `rel:${relations[i.key].key}` : null}
      onSkip={() => {
        clearRow(i);
        onSkip(i.key, true);
      }}
      skipped={skipped.has(i.key)}
      onClear={() => clearRow(i)}
      disabled={locked || !keyPersonKind}
      className="max-sm:w-auto max-sm:min-w-0 max-sm:flex-1 max-sm:shrink"
    />
  );
  const empty = working ? "Looking…" : started ? "Nothing found" : "—";
  // ── the way out: every row's "Other" menu ──────────────────────────────
  const movedFrom = new Map(Object.entries(taglines).map(([nameKey, t]) => [t.key, nameKey]));
  const [customFor, setCustomFor] = useState<string | null>(null);
  const drop = (set: ReadonlySet<string>, key: string) => new Set([...set].filter((k) => k !== key));
  const candidateOf = (i: EvidenceItem) => candidateByKey.get(i.key) ?? webCandidate(i);
  /** Clears whatever the row was answered (a main answer, a relationship, a skip, a tagline). */
  const clearRow = (i: EvidenceItem) => {
    if (decisions[i.key]) onDecide(i.key, decisions[i.key]); // answering the same again clears it
    if (relations[i.key]) onRelate(candidateOf(i), null);
    if (skipped.has(i.key)) onSkip(i.key, false);
    if (taglines[i.key]) onTagline(i, false);
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
      // A real tagline: it lands in the About slot as the brand's tagline (saved as a tagline fact), and the
      // name row leaves the name list (undo is on the About item).
      onTagline(i, true);
      return;
    }
    const kind = kinds.find((k) => `rel:${k.key}` === value);
    if (!kind) return;
    if (skipped.has(i.key)) onSkip(i.key, false);
    const label = i.field === "name" ? (NAME_RELATION_LABEL[kind.key] ?? kind.label) : kind.label;
    onRelate(candidateOf(i), { key: kind.key, label, routesTo: kind.routesTo });
  };
  const noteOf = (i: EvidenceItem): React.ReactNode => {
    const relation = relations[i.key];
    const text = relation
      ? i.field === "name" && NAME_RELATION_LABEL[relation.key]
        ? relation.label
        : `Related · ${relation.label}`
      : skipped.has(i.key)
        ? "Skipped for now"
        : null;
    // The picker already shows the relationship or the skip; the info card only repeats it for a name's kind.
    return text ? <span data-testid="smart-add-way-out">{text}</span> : null;
  };
  const below = (i: EvidenceItem): React.ReactNode =>
    customFor === i.key ? (
      <CustomRelation
        onCancel={() => setCustomFor(null)}
        onSave={async (label) => {
          await onCustom(candidateOf(i), label);
          if (skipped.has(i.key)) onSkip(i.key, false);
          setCustomFor(null);
        }}
      />
    ) : null;
  /** The row's answer in the three words: a kept value (preferred, alias, yes) is Yes. */
  const answerOf = (i: EvidenceItem): DecisionAnswer | null => {
    const d = decisions[i.key];
    if (d === "no") return "no";
    if (d) return "yes";
    return relations[i.key] || skipped.has(i.key) ? "other" : null;
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
  /** Make this kept value the main one (a name's old main one becomes an alias). */
  const makeMain = (i: EvidenceItem) => {
    if (decisions[i.key] === "preferred") return;
    const old = preferredOf(i.field);
    if (old && i.field === "name") onDecide(old.key, "alias");
    onDecide(i.key, "preferred");
  };
  /** The picker's kinds of yes (Arman 2026-10-14: the picker holds the value; the first Yes is the primary). */
  const yesKindsOf = (i: EvidenceItem, mode: RowMode): WayOutItem[] | undefined => {
    if (mode === "plain") return undefined;
    if (mode === "name") return [{ value: "preferred", label: "Main name" }, { value: "alias", label: "Also known as" }];
    if (i.field === "website") return [{ value: "preferred", label: "Primary site" }, { value: "yes", label: "Also ours" }];
    return [{ value: "preferred", label: "Primary" }, { value: "yes", label: "Additional" }];
  };
  const setYesKind = (i: EvidenceItem, v: string) => {
    if (decisions[i.key] === v) return; // the same answer again would clear the row
    if (v === "preferred") return makeMain(i);
    onDecide(i.key, v as Decision);
  };
  const choices = (item: EvidenceItem, mode: RowMode, wayOut?: WayOutItem[]) => (
    <DecisionControl
      value={answerOf(item)}
      yesKinds={yesKindsOf(item, mode)}
      yesKind={isYes(decisions[item.key]) ? decisions[item.key] : null}
      onYesKind={(v) => setYesKind(item, v)}
      onChange={(a) => {
        if (skipped.has(item.key)) onSkip(item.key, false);
        if (a === "yes") sayYes(item, mode);
        else onDecide(item.key, "no");
      }}
      wayOut={wayOut}
      onWayOut={(v) => onWayOut(item, v)}
      wayOutValue={relations[item.key] ? `rel:${relations[item.key].key}` : null}
      onSkip={() => {
        clearRow(item);
        onSkip(item.key, true);
      }}
      skipped={skipped.has(item.key)}
      onClear={() => clearRow(item)}
      disabled={locked}
      // Beside an Open link the control takes the rest of the row (never the whole width, which pushed Yes off the left edge).
      className="max-sm:w-auto max-sm:min-w-0 max-sm:flex-1 max-sm:shrink"
    />
  );

  // The first choice row carries the one-time hint (TipKit-style). The buttons explain themselves; the one
  // thing they cannot show is what happens to a row nobody answers, so that is the whole tip. Its pulse sits on
  // Yes alone (never a ring around the row); any answer in the row retires it.
  const firstChoice = (n: number, control: React.ReactNode) =>
    n === 0 ? (
      <FirstUseHint id="smart-add.first-choice" title="Unmarked items are kept" pulse='[data-decision-slot="yes"]' align="start" when={!locked}>
        <div className="flex min-w-0 items-center gap-1 max-sm:flex-1" data-smart-add-first-choice="">{control}</div>
      </FirstUseHint>
    ) : (
      control
    );

  return (
    <div className="flex flex-col divide-y divide-border" data-testid="smart-add-slots">
      <Slot title={person ? "Name" : "Brand name"} ask="Is this your name?" empty={of("name").some((i) => !taglines[i.key]) ? null : empty} after={custom("name", person ? "Your name" : "Brand name")}>
        {of("name").filter((i) => !taglines[i.key]).map((i, n) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} below={below(i)} actions={<>{firstChoice(n, choices(i, "name", nameWayOut))}{sourceLink(i)}</>}>
            <span className="min-w-0 truncate"><Shared id={i.key} positionOnly className="inline-block max-w-full truncate align-top text-lg font-semibold leading-tight">{i.value}</Shared></span>
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
              group={g}
              sourceControls={sourceControls}
              sourceLabel={(m) => (m.platform ? platformLabel(m.platform) : whereOf(m))}
              badge={<SourcesBadge group={g} labelOf={(m) => (m.platform ? platformLabel(m.platform) : whereOf(m))} />}
            />
            </Shared>
          ))}
        </div>
      </Slot>

      <Slot title="Websites" ask="Is this yours?" empty={of("website").length ? null : empty} after={custom("website", "another-site.com")}>
        {of("website").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} below={below(i)} actions={
            <>
              {choices(i, "primary", relatedWayOut())}
              <OpenLink url={i.url ?? i.value} />
            </>
          }>
            <span className="truncate text-base font-medium">{i.label ?? websiteHost(i.value)}</span>
          </Row>
        ))}
      </Slot>

      <Slot title="Social accounts" ask={person ? "Is this you?" : "Is this yours?"} empty={socials.length ? null : empty} after={custom("social", "@handle or profile link")}>
        {platforms.map((p) => (
          <div key={p} className="flex flex-col">
            <div className="px-4 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {platformLabel(p)}
            </div>
            {rankByAnchors(socials.filter((s) => (s.platform ?? "other") === p), personAnchors ?? {})
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

      {staff.length ? (
        <Slot title="Key people" ask="On your team?" empty={null}>
          {staff.map((i) => (
            <Row
              key={i.key}
              item={i}
              decision={decisions[i.key] ?? null}
              note={isKeyPerson(i) ? null : noteOf(i)}
              below={below(i)}
              actions={
                <>
                  {staffChoices(i)}
                  {accountUrl(i, candidateByKey.get(i.key)) ? <OpenLink url={accountUrl(i, candidateByKey.get(i.key)) as string} /> : null}
                </>
              }
              hideWhere
            >
              <span className="flex min-w-0 items-center gap-3" data-testid="smart-add-key-person">
                <Shared id={i.key} className="shrink-0">
                  <Avatar item={i} />
                </Shared>
                <AccountText item={i} name={i.label ?? null} />
              </span>
            </Row>
          ))}
        </Slot>
      ) : null}

      <Slot title="Contact" ask="Is this yours?" empty={of("phone", "email", "address").length ? null : empty} after={custom("contact", "Phone, email or address")}>
        {of("phone", "email", "address").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} below={below(i)} actions={choices(i, "primary", relatedWayOut())} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{CONTACT_LABEL[i.field]}</span>
              <span className="truncate">{i.value}</span>
            </span>
          </Row>
        ))}
      </Slot>

      {person ? (
        <Slot title="Expertise" ask="Is this you?" empty={of("expertise").length ? null : started ? "Add what you are known for" : "—"} after={custom("expertise", "e.g. Spanish property law")}>
          {of("expertise").map((i) => (
            <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} actions={choices(i, "plain")} compact>
              <span className="truncate text-sm">{i.value}</span>
            </Row>
          ))}
        </Slot>
      ) : null}

      <Slot title="About" ask={person ? "Is this you?" : "Is this right?"} empty={of("description", "category", "tagline").length ? null : empty} after={
        <div className="flex flex-wrap items-center px-4 pb-1">
          {custom("tagline", "Tagline", "Tagline", true)}
          {custom("description", "What you do, in a sentence or two", "Description", true)}
          {custom("category", "Category", "Category", true)}
        </div>
      }>
        {of("tagline").map((i) => {
          const from = movedFrom.get(i.key);
          const moved = from ? of("name").find((n) => n.key === from) : undefined;
          return (
          <Row
            key={i.key}
            item={i}
            decision={decisions[i.key] ?? null}
           
            note={moved ? <span data-testid="smart-add-moved-from-name">Moved from name</span> : noteOf(i)}
            actions={
              <>
                {choices(i, "primary")}
                {moved ? <Button variant="quiet" disabled={locked} onClick={() => onTagline(moved, false)} data-testid="smart-add-undo-tagline">Undo</Button> : null}
                {sourceLink(i)}
              </>
            }
            compact
          >
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Tagline</span>
              <span className="truncate italic">{i.value}</span>
            </span>
          </Row>
          );
        })}
        {of("category").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} actions={<>{choices(i, "primary")}{sourceLink(i)}</>} compact>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Category</span>
              <span className="truncate">{i.value}</span>
            </span>
          </Row>
        ))}
        {of("description").map((i) => (
          <Row key={i.key} item={i} decision={decisions[i.key] ?? null} note={noteOf(i)} actions={<>{choices(i, "primary")}{sourceLink(i)}</>} top>
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
        {ask && !empty ? <span className="font-normal text-muted-foreground">{ask}</span> : null}
        {hint && !empty ? <span className="font-normal text-muted-foreground">{hint}</span> : null}
      </h3>
      {empty ? <p className="px-4 py-1 text-sm text-muted-foreground">{empty}</p> : children}
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
}: {
  item: EvidenceItem;
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
  const info = rowInfo(item, note, hideWhere);
  const line = (
    <div
      className={`flex flex-col gap-1.5 px-4 animate-in fade-in duration-300 sm:flex-row ${compact ? "py-1" : "py-2"} ${top ? "sm:items-start" : "sm:items-center"} ${
        decision === "no" ? "opacity-40" : ""
      }`}
      data-testid="smart-add-item"
      data-field={item.field}
      data-decision={decision ?? "open"}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {/* One line per row (Arman 2026-10-14: no secondary lines). Where it was found shows on hovering the row. */}
        <span className="flex min-w-0 items-center gap-1">{children}</span>
        {below}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1 max-sm:w-full">{actions}</div>
    </div>
  );
  if (!info) return line;
  return (
    <HoverCard openDelay={600} closeDelay={200}>
      <HoverCardTrigger asChild>{line}</HoverCardTrigger>
      <HoverCardContent align="start" side="bottom" className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2.5" data-testid="smart-add-row-info">
        {info}
      </HoverCardContent>
    </HoverCard>
  );
}

const sentenceCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The row's provenance as labelled rows (source, page, found by, certainty), or null when there is nothing to say. */
function rowInfo(item: EvidenceItem, note?: React.ReactNode, hideWhere?: boolean): React.ReactNode {
  const where = hideWhere ? "" : whereOf(item);
  const url = item.source.url && /^https?:\/\//i.test(item.source.url) ? item.source.url : null;
  const found = KIND_LABEL_UI[item.source.kind] ?? "";
  const reasons = item.certainty_reasons?.filter(Boolean) ?? [];
  if (!where && !note && !url && !item.certainty && !reasons.length) return null;
  return (
    <>
      {where ? <PropertyRow label="Source" value={sentenceCase(where)} className="[&_*]:break-words" /> : null}
      {url ? (
        <PropertyRow label="Page">
          <OutboundLink href={url} className="break-all text-primary underline-offset-2 hover:underline">
            {url.replace(/^https?:\/\/(www\.)?/i, "")}
          </OutboundLink>
        </PropertyRow>
      ) : null}
      {found ? <PropertyRow label="Found by" value={found} /> : null}
      {item.certainty ? <PropertyRow label="Certainty" value={sentenceCase(String(item.certainty))} /> : null}
      {reasons.length ? <PropertyRow label="Reason" value={reasons.join(" ")} className="[&_*]:break-words" /> : null}
      {note ? <PropertyRow label="Answer">{note}</PropertyRow> : null}
    </>
  );
}

const KIND_LABEL_UI: Record<string, string> = {
  website: "Website",
  social_profile: "Profile",
  link_in_bio: "Link in bio",
  typed: "You typed it",
  web_search: "Web search",
};

const TAGLINE = "tagline";
/** A name that is not the brand's name, said the way a person says it (the relation kind it lands as). */
const NAME_RELATION_LABEL: Record<string, string> = {
  sub_brand: "Product or service name",
  former_account: "Former name",
  location: "Location or branch name",
  key_person: "Person's name",
};

/** Full text that wraps; past two lines it folds behind "Show more" (rows stay tight). */
function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 140;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className={`whitespace-pre-line text-sm leading-relaxed ${long && !open ? "line-clamp-2" : ""}`}>{text}</span>
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
  group,
  sourceControls,
  sourceLabel,
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
  /** The tile's group: the enlarged view lists its sources and can separate them. */
  group: LogoGroup;
  sourceControls: SourceControls;
  sourceLabel: (item: EvidenceItem) => string;
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
      <LogoEnlarge
        open={open}
        onOpenChange={setOpen}
        group={group}
        controls={sourceControls}
        labelOf={sourceLabel}
        previewClass={bg}
        onBackdrop={setBackdrop}
      />
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
