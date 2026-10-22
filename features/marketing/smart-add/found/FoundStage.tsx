"use client";

/**
 * The "found first" door's first screen (smart-add VISION Part 23): a calm grid of only the near-certain facts,
 * filling as the run streams, no choices on the cards. One "Looks right" (plus a way out) confirms the core and
 * hands the SAME session to the full review. What counts as certain: foundCards.ts.
 */

import { formatCount } from "@ai-matrx/kit/format";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Globe, Layers, MapPin, Store, Swords, Wrench } from "lucide-react";
import { withReferral } from "@ai-matrx/kit/outbound";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { browserImageUrl } from "@/lib/media/external-image";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { avatarInitial } from "../avatarInitial";
import { brightnessOf, LOGO_TILE_BG, shadeForBrightness } from "../logo-shade";
import { Shared } from "../stage/Shared";
import { shownHost, type FoundAccount, type FoundCards } from "./foundCards";
import { FitText } from "./FitText";
import styles from "./found.module.css";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export const href = (url: string) => withReferral(/^https?:\/\//i.test(url) ? url : `https://${url}`);
const RISE = { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const };

/**
 * One card slot. The grid's shape is fixed from the first frame (every slot is always there): a slot waits with a
 * sweep while the run works, shows its card once certain, or settles into a quiet "Not sure" in the same box, so
 * nothing already shown ever moves.
 */
export function Slot({
  id,
  filled,
  working,
  label,
  icon,
  className,
  children,
}: {
  id: string;
  filled: boolean;
  working: boolean;
  label: string;
  icon?: ReactNode;
  className: string;
  children: ReactNode;
}) {
  const state = filled ? "filled" : working ? "waiting" : "retired";
  return (
    <div className={`relative min-h-[8.5rem] ${className}`} data-found-card={id} data-state={state} data-filled={filled ? "true" : "false"}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: state === "filled" ? 8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={RISE}
          className="h-full"
        >
          {state === "filled" ? (
            children
          ) : state === "waiting" ? (
            <div aria-hidden className={`${styles.waiting} h-full min-h-[8.5rem] rounded-3xl`} />
          ) : (
            <div className={`${styles.quiet} flex h-full min-h-[8.5rem] flex-col justify-end gap-1 rounded-3xl p-5 sm:p-6`}>
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                {icon}
                {label}
              </span>
              <span className="text-lg text-disabled-foreground">Not sure</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** A logo, raw, on the tile its own brightness asks for (the same light / dark / checker tiles as Smart Add's logo choices). */
function LogoTile({ url }: { url: string }) {
  const [shade, setShade] = useState<"light" | "dark" | "checker">("checker");
  return (
    <span className={`flex size-14 items-center justify-center overflow-hidden rounded-2xl p-1.5 ${LOGO_TILE_BG[shade]}`}>
      <img
        src={browserImageUrl(url)}
        alt=""
        className="max-h-full max-w-full object-contain"
        onLoad={(e) => setShade(shadeForBrightness(brightnessOf(e.currentTarget)))}
      />
    </span>
  );
}

export function CardBody({ label, icon, value, sub, art, dark }: { label: string; icon?: ReactNode; value: ReactNode; sub?: ReactNode; art?: ReactNode; dark?: boolean }) {
  return (
    <div className={`${dark ? styles.lead : styles.card} flex h-full min-h-[8.5rem] flex-col justify-end gap-1 rounded-3xl p-5 sm:p-6`}>
      {art ? <div className="mb-auto pb-4">{art}</div> : null}
      <span className={`flex items-center gap-1.5 text-sm font-medium ${dark ? "" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </span>
      <span className="min-w-0 break-words text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[1.85rem]">{value}</span>
      {sub ? <span className={`text-sm ${dark ? "" : "text-muted-foreground"}`}>{sub}</span> : null}
    </div>
  );
}

export function AccountPicture({ account, size }: { account: FoundAccount; size: string }) {
  const item = account.item;
  const fallback = <PlatformMark platform={account.platform} size={28} />;
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-background`}>
      {item.profile_id ? (
        <SocialImage door={profileAvatarDoor(item.profile_id)} url={item.image_url} fallback={fallback} className="size-full object-cover" />
      ) : item.image_url ? (
        <img src={browserImageUrl(item.image_url)} alt="" className="size-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

export const handleOf = (a: FoundAccount) => (a.handle ? `@${a.handle.replace(/^@/, "")}` : platformLabel(a.platform));

export function FoundStage({
  cards,
  working,
  ready,
  onLooksRight,
  onReviewAll,
  onNotUs,
  onStartOver,
}: {
  cards: FoundCards;
  /** A round is still running: empty slots wait instead of collapsing. */
  working: boolean;
  /** The core (name + website) is certain: "Looks right" can confirm it. */
  ready: boolean;
  onLooksRight: () => void;
  /** The way out: straight to the full review, nothing confirmed. */
  onReviewAll: () => void;
  onNotUs: () => void;
  onStartOver: () => void;
}) {
  const [lead, ...more] = cards.accounts;
  const name = cards.name;
  return (
    <div className="relative px-4 pt-[calc(var(--shell-header-h)+1.5rem)] sm:pt-[calc(var(--shell-header-h)+3rem)]" data-smart-add-stage="found">
        <section className={`${styles.panel} mx-auto w-full max-w-4xl rounded-[2rem] p-4 sm:p-8`} data-testid="smart-add-found" aria-busy={working}>
          <h1 className="px-1 pb-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:pb-7 sm:text-[2.25rem]">
            Here&apos;s what we found
          </h1>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:gap-4">
              <Slot key="identity" id="identity" label="Name" filled={Boolean(name)} working={working} className="sm:col-span-4">
                {name ? (
                  <div className={`${styles.card} flex h-full min-h-[8.5rem] flex-col gap-4 rounded-3xl p-5 sm:p-6`}>
                    {cards.logo ? (
                      <Shared id={cards.logo.item.key} className="block size-14 shrink-0">
                        {/* A logo renders raw: never tinted, never cropped. */}
                        <LogoTile url={cards.logo.url} />
                      </Shared>
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-2xl font-semibold text-background">
                        {avatarInitial(name.value)}
                      </span>
                    )}
                    <div className="flex flex-col gap-1">
                      <Shared id={name.key} positionOnly className="block">
                        <span className="block break-words text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.4rem]">
                          {name.value}
                        </span>
                      </Shared>
                      {cards.description ? (
                        <p className="line-clamp-2 max-w-prose text-base text-muted-foreground">{cards.description.value}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Slot>
              <Slot key="lead" id="lead" label="Social" icon={<Layers className="size-4" />} filled={Boolean(lead)} working={working} className="sm:col-span-2">
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
              <Slot key="website" id="website" label="Your site" icon={<Globe className="size-4" />} filled={Boolean(cards.website)} working={working} className="sm:col-span-3">
                {cards.website ? (
                  <OutboundLink href={href(cards.website.url ?? cards.website.value)} data-clickable className="block h-full">
                    <CardBody icon={<Globe className="size-4" />} label="Your site" value={<FitText text={shownHost(cards.website)} />} />
                  </OutboundLink>
                ) : null}
              </Slot>
              <Slot key="location" id="location" label="Based in" icon={<MapPin className="size-4" />} filled={Boolean(cards.location)} working={working} className="sm:col-span-3">
                {cards.location ? <CardBody icon={<MapPin className="size-4" />} label="Based in" value={cards.location.text} /> : null}
              </Slot>
              <Slot key="category" id="category" label="What you do" icon={<Store className="size-4" />} filled={Boolean(cards.category)} working={working} className="sm:col-span-3">
                {cards.category ? (
                  <CardBody
                    icon={<Store className="size-4" />}
                    label="What you do"
                    value={<span className={cards.category.text.length > 28 ? "text-[1.3rem] sm:text-[1.45rem]" : ""}>{cards.category.text}</span>}
                  />
                ) : null}
              </Slot>
              <Slot key="more" id="more" label="Also on" icon={<Layers className="size-4" />} filled={more.length > 0} working={working} className="sm:col-span-3">
                {more.length ? (
                  <div className={`${styles.card} flex h-full min-h-[8.5rem] flex-col justify-end gap-3 rounded-3xl p-5 sm:p-6`}>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Layers className="size-4" />
                      Also on
                    </span>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      {more.map((a) => (
                        <OutboundLink
                          key={a.item.key}
                          href={href(a.item.url ?? a.item.value)}
                          data-clickable
                          className="flex min-w-0 items-center gap-2.5"
                        >
                          <AccountPicture account={a} size="size-10" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-lg font-semibold leading-tight text-foreground">{handleOf(a)}</span>
                            <span className="text-sm text-muted-foreground">{platformLabel(a.platform)}</span>
                          </span>
                        </OutboundLink>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Slot>
              <Slot key="tools" id="tools" label="Tools on your site" icon={<Wrench className="size-4" />} filled={Boolean(cards.tools)} working={working} className="sm:col-span-3">
                {cards.tools ? <CardBody icon={<Wrench className="size-4" />} label="Tools on your site" value={cards.tools.text} /> : null}
              </Slot>
              <Slot key="competitor" id="competitor" label="A competitor" icon={<Swords className="size-4" />} filled={Boolean(cards.competitor)} working={working} className="sm:col-span-3">
                {cards.competitor ? <CardBody icon={<Swords className="size-4" />} label="A competitor" value={cards.competitor.text} /> : null}
              </Slot>
          </div>

          {/* The one decision: a fixed-height row, so nothing above moves when it appears. */}
          <div className="mt-6 flex min-h-14 flex-wrap items-center justify-end gap-3 sm:mt-8">
            {ready ? (
              <>
                <span className="mr-auto text-base font-medium text-foreground max-sm:basis-full">Is this you?</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* ui-exception: the flagship stage's way-out control sits beside a 56px confirm */}
                    <button
                      type="button"
                      className="inline-flex h-12 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground"
                      data-testid="smart-add-found-way-out"
                    >
                      Not quite
                      <ChevronDown className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={onReviewAll}>Fix something</DropdownMenuItem>
                    <DropdownMenuItem onSelect={onNotUs}>Not this business</DropdownMenuItem>
                    <DropdownMenuItem onSelect={onStartOver}>Start over</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* ui-exception: the flagship stage's one confirm (the 28px control is app chrome) */}
                <button
                  type="button"
                  onClick={onLooksRight}
                  className={`${styles.confirm} inline-flex h-12 items-center whitespace-nowrap rounded-2xl px-6 text-base font-semibold text-primary-foreground max-sm:flex-1 max-sm:justify-center`}
                  data-testid="smart-add-found-confirm"
                >
                  Looks right
                </button>
              </>
            ) : working ? (
              <span className="mr-auto text-base text-muted-foreground" aria-live="polite">
                Still looking
              </span>
            ) : (
              // Settled without a certain core: nothing to confirm here, the full review gathers it.
              <button
                type="button"
                onClick={onReviewAll}
                className={`${styles.confirm} inline-flex h-12 items-center whitespace-nowrap rounded-2xl px-6 text-base font-semibold text-primary-foreground max-sm:flex-1 max-sm:justify-center`}
                data-testid="smart-add-found-review"
              >
                Review everything
              </button>
            )}
          </div>
        </section>
    </div>
  );
}
