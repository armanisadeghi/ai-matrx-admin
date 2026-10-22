/**
 * Surface manifest — the brand session (`matrx-user/marketing-brand-session`).
 *
 * Drives `/marketing/[brandId]/identity/session` — `BrandSessionPage`: the full-screen swipe deck where the
 * person decides where each brand candidate belongs (lead / ours, not the face / not us / not sure) and confirms
 * the findings waiting on the brand. Values are the deck as it is on screen. The page shows no agent chrome; an
 * agent opened from the shell can explain or reword the card in focus on request.
 *
 * Rule 2 (common-docs projects/brand-discovery/DATA-MODEL.md): an agent never chooses. Its one write target adds a
 * reworded OPEN candidate (origin ai) that waits for the person; the decide door refuses agents in the database.
 * Inherits the brand context from `matrx-user/marketing-brand`.
 * Runtime: `features/marketing/brand-session/BrandSessionPage.tsx` over `BrandRoomSurface`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "session_deck",
    label: "The deck",
    sortOrder: 100,
    description: "The card in focus and how far the sitting has come.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "session_current",
    label: "Card in focus",
    description:
      "{ card_id, kind ('stance' = an offering's stance, 'audience' = an audience category, 'choice' = a brand candidate to place or a tagline/one-liner to shortlist, 'finding' = a found fact to confirm), element (the brand element, e.g. Tagline), candidate (its words), suggestion (the recommended answer: lead | support | not_us | not_sure | shortlist, a precise stance such as Accept, or confirm | reject), reason, origin (found | said | ai | customer | team) }. Null when every card is answered.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 110,
    group: "session_deck",
  },
  {
    name: "session_counts",
    label: "Progress",
    description: "{ total, answered, stances, audience, choices, findings } — the cards of this sitting and how many are answered.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 80,
    sortOrder: 120,
    group: "session_deck",
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "session_propose_rewording",
    label: "Propose a rewording",
    description:
      "Value: string — new words for the brand candidate in focus (session_current.kind = 'choice'). Saved as a NEW open candidate for the same element, grown from the one in focus; it joins the end of the deck for the person to place. Never a choice: only the person decides.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    group: "session_deck",
    sortOrder: 100,
  },
];

export const marketingBrandSessionManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-session",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The brand session — one card at a time, the person decides where each brand candidate belongs.",
  label: "Brand Session",
  situation:
    "They are in the brand session, deciding one card at a time where each brand candidate belongs ({session_counts.answered|0} of {session_counts.total|the} cards answered). The card in front of them is in your context; the choice is theirs, but you can offer different wording as a new card.",
  urlPattern: "/marketing/[brandId]/identity/session",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's session screen: the person swipes one card at a time. A choice card asks where a candidate belongs: lead with it (the face), ours but not the face (its own place), not us, or not sure. A finding card asks whether a found fact is theirs.
Read session_current for the card in focus. When asked, explain the card in plain words: what the element is, what the suggestion would make every agent do, and why. Never decide for the person and never tell them which way to swipe as if it were settled; the choice is theirs.
When the person asks for different words, use session_propose_rewording: it adds your wording as a new candidate they will place themselves.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
};

export function createMarketingBrandSessionScope(values: {
  brand_id: string;
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  session_current?: Record<string, unknown> | null;
  session_counts?: Record<string, unknown>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
