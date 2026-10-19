/**
 * Board — level of detail and ZOOM-PACED STREAMING (pure).
 *
 * Semantic zoom (Pad++, 1994): at far zoom an item shows a different, more
 * abstract representation, not a shrunken copy. We add the twist nobody ships:
 * the LIVE UPDATE RATE of a streaming tile follows how much of it you can
 * actually see.
 *
 *   read      — body text is legible (≥ READABLE_PX on screen): commit every
 *               animation frame, i.e. token by token.
 *   glance    — shapes and headings visible, words not: commit in batches and
 *               land each batch with a soft reveal, so it still reads as
 *               continuous motion.
 *   overview  — the tile is a postage stamp: the body is replaced by a
 *               counter-scaled title card + progress, and the hidden body
 *               does not commit at all (the card shows progress from the
 *               source's coarse status).
 *   offscreen — culled: nothing commits; the tile catches up in one step the
 *               moment it re-enters the viewport.
 *
 * Nothing upstream is throttled — every token still lands in the accumulator
 * (or Redux) at full rate. Pacing only decides when a TILE re-renders what
 * has already arrived, so zooming in always shows the complete, current text.
 */

export type DetailTier = "read" | "glance" | "overview";
export type PaceTier = DetailTier | "offscreen";

/** Body text size inside tiles, in world px. */
export const BODY_FONT_PX = 14;
/** On-screen body size at which text is legible. */
export const READABLE_PX = 9.5;
/**
 * Below this zoom a tile body is abstracted away entirely: the body shows only while its text is
 * LEGIBLE (the zoom where BODY_FONT_PX reaches READABLE_PX), the card shows below. It used to be
 * 0.28, so a Note or Chat at 30% drew its whole body as unreadable specks while the same tile at
 * 23% was a clean card.
 */
export const OVERVIEW_ZOOM = READABLE_PX / BODY_FONT_PX;
/** Below this zoom a tile is too small on screen to offer resize handles on hover (a card still can above it). */
export const RESIZE_AFFORDANCE_ZOOM = 0.28;

export function detailTierForZoom(z: number): DetailTier {
  if (BODY_FONT_PX * z >= READABLE_PX) return "read";
  if (z >= OVERVIEW_ZOOM) return "glance";
  return "overview";
}

/** Milliseconds between commits per tier. 0 = every animation frame. */
export const PACE_MS: Record<PaceTier, number> = {
  read: 0,
  glance: 900,
  overview: Number.POSITIVE_INFINITY,
  offscreen: Number.POSITIVE_INFINITY,
};

/** Duration of the reveal that lands a batched commit — a little shorter than
 * the batch interval so each batch settles before the next arrives, which is
 * what makes discrete commits read as one continuous flow. */
export function revealMsForTier(tier: PaceTier): number {
  const pace = PACE_MS[tier];
  if (pace === 0 || !Number.isFinite(pace)) return 0;
  return Math.round(pace * 0.7);
}

/**
 * Decide whether a tile should commit now.
 *  - pending === false: nothing new arrived → never.
 *  - read tier: always (the caller schedules on rAF).
 *  - tier just got MORE detailed than the last commit's tier: commit
 *    immediately — you zoomed in, you see the latest, no waiting.
 *  - otherwise: when the tier's interval has elapsed.
 */
export function shouldCommit(args: {
  pending: boolean;
  tier: PaceTier;
  lastCommitTier: PaceTier;
  msSinceLastCommit: number;
}): boolean {
  const { pending, tier, lastCommitTier, msSinceLastCommit } = args;
  if (!pending) return false;
  if (!Number.isFinite(PACE_MS[tier])) return false;
  if (TIER_RANK[tier] > TIER_RANK[lastCommitTier]) return true;
  return msSinceLastCommit >= PACE_MS[tier];
}

const TIER_RANK: Record<PaceTier, number> = {
  offscreen: 0,
  overview: 1,
  glance: 2,
  read: 3,
};

/** Human label for the HUD. */
export const TIER_LABEL: Record<DetailTier, string> = {
  read: "Reading — live token by token",
  glance: "Glance — batched with soft reveal",
  overview: "Overview — title cards and progress",
};

// ── Level of detail per TILE (Arman, 2026-10-19) ─────────────────────────────
//
// "We are not going straight from beautiful components to just ugly, thick, dark labels."
// Four levels, chosen by the tile's ON-SCREEN size (world size × zoom), so a huge tile at a low
// zoom still shows more than a small one beside it:
//
//   full      — L0: the real component, interactive. Only while its text is legible.
//   structure — L1: the same layout with text as calm placeholder bars (chrome, inputs, avatars,
//               grid lines kept). Not interactive; mounts no feature body, reads nothing.
//   card      — L2: a designed card — type color, icon, title, 1–3 saved basics, status.
//   label     — L3: only when a couple of words is all that fits — type icon + title, crisp.

export type DetailLevel = "full" | "structure" | "card" | "label";

/** L1 needs this much screen room for its skeleton to read as the component it stands for. */
export const STRUCTURE_MIN_SCREEN_W = 180;
export const STRUCTURE_MIN_SCREEN_H = 120;
/** L2: room for a type line, a two-line title and a fact or status. */
export const CARD_MIN_SCREEN_W = 104;
export const CARD_MIN_SCREEN_H = 64;

/**
 * The level a tile of `size` (world px) shows at zoom `z`. L0 is decided by legibility (body text is a
 * world size, so it is the zoom); L1–L3 by how much screen the tile covers.
 */
export function detailLevelFor(size: { w: number; h: number }, z: number): DetailLevel {
  if (BODY_FONT_PX * z >= READABLE_PX) return "full";
  const w = size.w * z;
  const h = size.h * z;
  if (z < 0) return "structure";
  if (w >= CARD_MIN_SCREEN_W && h >= CARD_MIN_SCREEN_H) return "card";
  return "label";
}

/** Canvas words (stickies, text, shape labels) turn into bars below this on-screen font size. */
export const INK_LEGIBLE_PX = READABLE_PX;
