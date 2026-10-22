"use client";

/**
 * The found-first door's PERSON variant (sign-up welcome; smart-add VISION Parts 23, 29): "Here's what we found",
 * about a person. The grid's six slots are fixed from the first frame (zero shift) and fill as the rounds stream:
 * Welcome + one line of bio, the lead account, their site, where they are based, their other accounts, the tools
 * their site uses. No controls on the cards. One "Looks right" plus one way out, "Something's off", which hands the
 * same session to the full review. What counts as certain: personCards.ts (foundCards.ts underneath).
 */

import { formatCount } from "@ai-matrx/kit/format";
import { Globe, Layers, Loader2, MapPin, Wrench } from "lucide-react";
import { browserImageUrl } from "@/lib/media/external-image";
import { platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { avatarInitial } from "../avatarInitial";
import { AccountPicture, CardBody, handleOf, href, Slot } from "./FoundStage";
import { shownHost } from "./foundCards";
import type { PersonFoundCards } from "./personCards";
import { FitText } from "./FitText";
import styles from "./found.module.css";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/**
 * Every slot's height is FIXED from the first frame, waiting / filled / "Not sure" alike, so nothing below it moves
 * when a round lands (CLS 0; live 2026-10-21 measured 0.06 at 375px). Each height holds its filled card's content:
 * lead = picture + label + one handle line + followers; fact = label + two value lines; more = label + MORE_SHOWN
 * account rows. The "more" and "tools" slots share a row on wide screens, so they share a height.
 */
const SLOT = {
  lead: "h-[12.5rem] overflow-hidden rounded-3xl",
  fact: "h-[9rem] overflow-hidden rounded-3xl",
  more: "h-[11.5rem] overflow-hidden rounded-3xl",
} as const;
const MORE_SHOWN = 2;

/** A card value of words (a place, a list of tools): wraps at words, two lines at most, never cut inside a word. */
function Clamp({ text }: { text: string }) {
  return <span className="line-clamp-2 break-normal">{text}</span>;
}

function Photo({ cards }: { cards: PersonFoundCards }) {
  const fallback = (
    <span className="flex size-full items-center justify-center bg-foreground text-2xl font-semibold text-background">
      {avatarInitial(cards.name?.value ?? cards.firstName)}
    </span>
  );
  const p = cards.photo;
  return (
    // A person's own picture renders raw: never tinted, never re-cropped beyond the round frame.
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background">
      {p?.profileId ? (
        <SocialImage door={profileAvatarDoor(p.profileId)} url={p.url} fallback={fallback} className="size-full object-cover" />
      ) : p?.url ? (
        <img src={browserImageUrl(p.url)} alt="" className="size-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

export function PersonFoundStage({
  cards,
  working,
  ready,
  confirming,
  error,
  onLooksRight,
  onSomethingOff,
}: {
  cards: PersonFoundCards;
  /** A round is still running: empty slots wait instead of settling. */
  working: boolean;
  /** "Looks right" can confirm what is shown. */
  ready: boolean;
  /** "Looks right" was pressed and is saving. */
  confirming: boolean;
  error: string | null;
  onLooksRight: () => void;
  /** The way out: the full review, same session, nothing confirmed. */
  onSomethingOff: () => void;
}) {
  const [lead, ...more] = cards.accounts;
  return (
    <section className={`${styles.panel} mx-auto w-full max-w-4xl rounded-[2rem] p-4 sm:p-8`} data-testid="welcome-found" aria-busy={working}>
      <h1 className="px-1 pb-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:pb-7 sm:text-[2.25rem]">
        Here&apos;s what we found
      </h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:gap-4">
        <Slot id="welcome" label="Welcome" filled working={working} className="sm:col-span-4">
          <div className={`${styles.card} flex h-full min-h-[8.5rem] flex-col gap-4 rounded-3xl p-5 sm:p-6`}>
            <Photo cards={cards} />
            <div className="flex flex-col gap-1">
              <span className="block break-words text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.4rem]">
                {cards.firstName ? `Welcome, ${cards.firstName}` : "Welcome"}
              </span>
              {/* The bio's two lines are reserved from the first frame, so it lands without moving anything; it
                  wraps at words and never cuts one mid-way on a one-line slot. */}
              <p className="line-clamp-2 h-12 break-normal text-base text-muted-foreground" data-testid="welcome-found-bio">
                {/* Their confirmed company leads the line (the picked card showed it). */}
                {[cards.work, cards.bio?.text].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </Slot>
        <Slot id="lead" label="Social" icon={<Layers className="size-4" />} filled={Boolean(lead)} working={working} className={`${SLOT.lead} sm:col-span-2`}>
          {lead ? (
            <OutboundLink href={href(lead.item.url ?? lead.item.value)} data-clickable className="block h-full">
              <CardBody
                dark
                art={<AccountPicture account={lead} size="size-14" />}
                label={platformLabel(lead.platform)}
                value={<span className="text-[1.45rem] sm:text-[1.6rem]"><FitText text={handleOf(lead)} /></span>}
                sub={lead.followers != null ? `${formatCount(lead.followers, { style: "compact" })} followers` : undefined}
              />
            </OutboundLink>
          ) : null}
        </Slot>
        <Slot id="website" label="Your site" icon={<Globe className="size-4" />} filled={Boolean(cards.website)} working={working} className={`${SLOT.fact} sm:col-span-3`}>
          {cards.website ? (
            <OutboundLink href={href(cards.website.url ?? cards.website.value)} data-clickable className="block h-full">
              <CardBody icon={<Globe className="size-4" />} label="Your site" value={<FitText text={shownHost(cards.website)} />} />
            </OutboundLink>
          ) : null}
        </Slot>
        <Slot id="location" label="Based in" icon={<MapPin className="size-4" />} filled={Boolean(cards.location)} working={working} className={`${SLOT.fact} sm:col-span-3`}>
          {cards.location ? <CardBody icon={<MapPin className="size-4" />} label="Based in" value={<Clamp text={cards.location.text} />} /> : null}
        </Slot>
        <Slot id="more" label="Also on" icon={<Layers className="size-4" />} filled={more.length > 0} working={working} className={`${SLOT.more} sm:col-span-3`}>
          {more.length ? (
            <div className={`${styles.card} flex h-full min-h-[8.5rem] flex-col justify-end gap-3 rounded-3xl p-5 sm:p-6`}>
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Layers className="size-4" />
                Also on
                {more.length > MORE_SHOWN ? <span className="ml-auto tabular-nums">+{more.length - MORE_SHOWN}</span> : null}
              </span>
              {/* At most MORE_SHOWN rows: the slot's height is fixed from the first frame, so a late account never
                  grows it (zero shift). */}
              <div className="flex flex-col gap-3">
                {more.slice(0, MORE_SHOWN).map((a) => (
                  <OutboundLink
                    key={a.item.key}
                    href={href(a.item.url ?? a.item.value)}
                    data-clickable
                    className="flex w-full min-w-0 items-center gap-2.5"
                  >
                    <AccountPicture account={a} size="size-10" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-lg font-semibold text-foreground">
                        <FitText text={handleOf(a)} />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {a.followers != null ? `${formatCount(a.followers, { style: "compact" })} followers` : platformLabel(a.platform)}
                      </span>
                    </span>
                  </OutboundLink>
                ))}
              </div>
            </div>
          ) : null}
        </Slot>
        <Slot id="tools" label="Tools you use" icon={<Wrench className="size-4" />} filled={Boolean(cards.tools)} working={working} className={`${SLOT.more} sm:col-span-3`}>
          {cards.tools ? <CardBody icon={<Wrench className="size-4" />} label="Tools you use" value={<Clamp text={cards.tools.text} />} /> : null}
        </Slot>
      </div>

      {/* The one decision: a fixed-height row, so nothing above moves when it changes. */}
      <div className="mt-6 flex min-h-14 flex-wrap items-center justify-end gap-3 sm:mt-8">
        {error ? (
          <span className="mr-auto text-base text-destructive max-sm:basis-full" role="alert">
            {error}
          </span>
        ) : ready ? (
          <span className="mr-auto text-base font-medium text-foreground max-sm:basis-full">Is this you?</span>
        ) : (
          <span className="mr-auto text-base text-muted-foreground" aria-live="polite">
            Still looking
          </span>
        )}
        {/* ui-exception: the flagship stage's way-out control sits beside a 56px confirm */}
        <button
          type="button"
          onClick={onSomethingOff}
          disabled={confirming}
          className="inline-flex h-12 items-center whitespace-nowrap rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground"
          data-testid="welcome-found-way-out"
        >
          Something&apos;s off
        </button>
        {ready ? (
          // ui-exception: the flagship stage's one confirm (the 28px control is app chrome)
          <button
            type="button"
            onClick={onLooksRight}
            disabled={confirming}
            aria-busy={confirming}
            className={`${styles.confirm} inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-2xl px-6 text-base font-semibold text-primary-foreground max-sm:flex-1 max-sm:justify-center`}
            data-testid="welcome-found-confirm"
          >
            {confirming ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Looks right
          </button>
        ) : null}
      </div>
    </section>
  );
}
