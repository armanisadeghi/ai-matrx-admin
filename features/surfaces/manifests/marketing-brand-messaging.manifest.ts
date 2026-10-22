/**
 * Surface manifest — Brand messaging room (`matrx-user/marketing-brand-messaging`).
 *
 * Drives `/marketing/brands/[brandId]/identity/messaging` — `BrandMessagingPage`:
 * mission, vision, values, story, names and personality, promise, imagery,
 * vocabulary, the 10/30/60-second pitches, messaging pillars, content pillars
 * and hashtags. Every value here is the page AS IT IS ON SCREEN (unsaved edits
 * included). The room runs no AI job today.
 *
 * Inherits the brand context from `matrx-user/marketing-brand`; the whole
 * stored profile is the parent's `brand_profile` and is not re-declared.
 * Runtime: `features/marketing/components/brand/BrandProfilePages.tsx`
 * (`MessagingEditor`) over `BrandRoomSurface`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import {
  mergeBaselineValues,
  pickBaseline,
} from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "messaging_all",
    label: "Whole page",
    sortOrder: 50,
    description: "Everything on the Messaging page in one object.",
  },
  {
    key: "messaging_purpose",
    label: "Purpose",
    sortOrder: 100,
    description: "Mission, vision, values and the brand story.",
  },
  {
    key: "messaging_voice",
    label: "Voice and identity",
    sortOrder: 200,
    description: "Names, personality, promise, visual style and vocabulary.",
  },
  {
    key: "messaging_pitches",
    label: "Elevator pitches",
    sortOrder: 300,
    description: "The brand in 10, 30 and 60 seconds.",
  },
  {
    key: "messaging_pillars_group",
    label: "Pillars and hashtags",
    sortOrder: 400,
    description: "Messaging pillars with proof, content pillars and hashtags.",
  },
];

function field(
  name: string,
  label: string,
  description: string,
  valueType: SurfaceValue["valueType"],
  typicalCharCount: number,
  sortOrder: number,
  group: string,
  autoContext = true,
): SurfaceValue {
  return {
    name,
    label,
    description,
    valueType,
    alwaysAvailable: false,
    typicalCharCount,
    sortOrder,
    group,
    ...(autoContext ? {} : { autoContext: false }),
  };
}

const surfaceSpecific: SurfaceValue[] = [
  field(
    "messaging_profile",
    "Messaging page (all fields)",
    "Every field on the Messaging page as one object, as currently edited: mission, vision, story, values, brand_aliases, personality, usp, brand_promise, imagery_style, iconography, vocabulary { use, avoid }, elevator_pitches, messaging_pillars, content_pillars, hashtags. Empty strings/arrays = not filled in. Absent while the brand loads.",
    "object",
    3500,
    60,
    "messaging_all",
    false,
  ),
  field(
    "messaging_mission",
    "Mission",
    "Why the brand exists, today. Empty string when not written; absent while the brand loads.",
    "string",
    250,
    110,
    "messaging_purpose",
  ),
  field(
    "messaging_vision",
    "Vision",
    "What the world looks like if the brand succeeds. Empty string when not written.",
    "string",
    250,
    120,
    "messaging_purpose",
  ),
  field(
    "messaging_values",
    "Values",
    "What the brand holds to, one string each. Empty array when none.",
    "array",
    200,
    130,
    "messaging_purpose",
  ),
  field(
    "messaging_story",
    "Brand story",
    "The brand story in short (for a person brand, their story). Empty string when not written.",
    "string",
    600,
    140,
    "messaging_purpose",
  ),
  field(
    "messaging_aliases",
    "Also known as",
    "Other names, spellings and abbreviations. Empty array when none.",
    "array",
    100,
    210,
    "messaging_voice",
  ),
  field(
    "messaging_personality",
    "Personality",
    "Personality traits, one string each (e.g. warm, expert, direct). Empty array when none.",
    "array",
    100,
    220,
    "messaging_voice",
  ),
  field(
    "messaging_usp",
    "Unique selling point",
    "What only this brand offers. Empty string when not written.",
    "string",
    200,
    230,
    "messaging_voice",
  ),
  field(
    "messaging_brand_promise",
    "Brand promise",
    "What every customer can count on. Empty string when not written.",
    "string",
    200,
    240,
    "messaging_voice",
  ),
  field(
    "messaging_imagery_style",
    "Imagery style",
    "The photos and visuals the brand uses. Empty string when not written.",
    "string",
    200,
    250,
    "messaging_voice",
  ),
  field(
    "messaging_iconography",
    "Iconography",
    "The icon style. Empty string when not written.",
    "string",
    120,
    260,
    "messaging_voice",
  ),
  field(
    "messaging_vocabulary",
    "Vocabulary",
    "{ use: string[], avoid: string[] } — preferred words and words to keep out. Empty arrays when none.",
    "object",
    300,
    270,
    "messaging_voice",
  ),
  field(
    "messaging_elevator_pitches",
    "Elevator pitches",
    "{ ten_second, thirty_second, sixty_second } strings; empty string = not written.",
    "object",
    1200,
    310,
    "messaging_pitches",
  ),
  field(
    "messaging_pillars",
    "Messaging pillars",
    "The big ideas every message returns to: [{ title, proof_points: string[] }]. Empty array when none; rows with a blank title are still shown while editing.",
    "array",
    900,
    410,
    "messaging_pillars_group",
  ),
  field(
    "messaging_content_pillars",
    "Content pillars",
    "Recurring publishing themes: [{ name, description }]. Empty array when none.",
    "array",
    500,
    420,
    "messaging_pillars_group",
  ),
  field(
    "messaging_hashtags",
    "Hashtags",
    "[{ tag, use: branded | campaign | community }]. Empty array when none.",
    "array",
    200,
    430,
    "messaging_pillars_group",
  ),
];

function target(
  name: string,
  label: string,
  description: string,
  valueType: SurfaceWriteTarget["valueType"],
  updatesValue: string,
  group: string,
  sortOrder: number,
): SurfaceWriteTarget {
  return {
    name,
    label,
    description,
    valueType,
    updatesValue,
    mode: "draft",
    applyPolicy: "ask",
    group,
    sortOrder,
  };
}

const DRAFT =
  "Stages the change on the page; nothing is saved until the person presses Save.";

const writeTargets: SurfaceWriteTarget[] = [
  target(
    "messaging_purpose",
    "Purpose",
    `Value: object with any of { mission: string, vision: string, story: string, values: string[] }. Omitted keys keep their value; empty string / empty array clears. Lists replace the FULL list. ${DRAFT}`,
    "object",
    "messaging_mission",
    "messaging_purpose",
    100,
  ),
  target(
    "messaging_voice_identity",
    "Voice and identity",
    `Value: object with any of { brand_aliases: string[], personality: string[], usp: string, brand_promise: string, imagery_style: string, iconography: string, vocabulary: { use: string[], avoid: string[] } }. Omitted keys keep their value; empty clears. ${DRAFT}`,
    "object",
    "messaging_usp",
    "messaging_voice",
    200,
  ),
  target(
    "messaging_elevator_pitches",
    "Elevator pitches",
    `Value: { ten_second?: string, thirty_second?: string, sixty_second?: string } — pass only the pitches to change, written as the brand would say them out loud. ${DRAFT}`,
    "object",
    "messaging_elevator_pitches",
    "messaging_pitches",
    300,
  ),
  target(
    "messaging_pillars",
    "Messaging pillars",
    `Value: [{ title: string, proof_points: string[] }] — the FULL list; it replaces every pillar (include the ones to keep). Empty array clears. ${DRAFT}`,
    "array",
    "messaging_pillars",
    "messaging_pillars_group",
    400,
  ),
  target(
    "messaging_content_pillars",
    "Content pillars",
    `Value: [{ name: string, description?: string }] — the FULL list; it replaces every content pillar. Empty array clears. ${DRAFT}`,
    "array",
    "messaging_content_pillars",
    "messaging_pillars_group",
    410,
  ),
  target(
    "messaging_hashtags",
    "Hashtags",
    `Value: [{ tag: string, use: "branded" | "campaign" | "community" }] — the FULL list; it replaces every hashtag. Empty array clears. ${DRAFT}`,
    "array",
    "messaging_hashtags",
    "messaging_pillars_group",
    420,
  ),
];

export const marketingBrandMessagingManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-messaging",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand messaging room — mission, vision, story, voice, elevator pitches, messaging and content pillars, and hashtags.",
  label: "Brand Messaging",
  situation:
    "They are in the brand's Messaging room: mission, vision, values, story, personality, elevator pitches, messaging and content pillars, and hashtags, all in your context as currently edited. They can edit any of these.",
  urlPattern: "/marketing/brands/[brandId]/identity/messaging",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's Messaging room, where the owner writes what the brand stands for and how it says it. Read brand_context first, then the messaging_* values, which are the page exactly as it is on screen, unsaved edits included.
Help the owner sharpen the writing: tighten the mission and pitches, make pillars specific and provable, keep vocabulary consistent. Stage changes with the messaging_* write targets in the brand's own voice; the owner reviews and presses Save, nothing you stage is saved on its own.
An empty string or empty array means the owner has not written that yet.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(
    pickBaseline("selection", "context"),
    surfaceSpecific,
  ),
  writeTargets,
};

export function createMarketingBrandMessagingScope(values: {
  brand_id: string;
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  messaging_profile?: Record<string, unknown>;
  messaging_mission?: string;
  messaging_vision?: string;
  messaging_values?: readonly string[];
  messaging_story?: string;
  messaging_aliases?: readonly string[];
  messaging_personality?: readonly string[];
  messaging_usp?: string;
  messaging_brand_promise?: string;
  messaging_imagery_style?: string;
  messaging_iconography?: string;
  messaging_vocabulary?: Record<string, unknown>;
  messaging_elevator_pitches?: Record<string, unknown>;
  messaging_pillars?: ReadonlyArray<Record<string, unknown>>;
  messaging_content_pillars?: ReadonlyArray<Record<string, unknown>>;
  messaging_hashtags?: ReadonlyArray<Record<string, unknown>>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
