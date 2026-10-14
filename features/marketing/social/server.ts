/**
 * Social Intelligence — the COMPUTE door: typed calls to the aidream `/social`
 * router (contract: `aidream/aidream/services/social/FEATURE.md`). Only what
 * needs the server goes here — provider fetches, ingest, transcripts, the
 * analysis, the media playback door. Plain reads/edits are `./service.ts`.
 *
 * Every call names the BRAND's organization (carried by the brand context),
 * never the header's selection: the cost lands on that organization.
 *
 * The long doors (ingest post/profile, track, refresh) answer an NDJSON event
 * stream; `callSocial` also accepts a plain JSON answer, so a server that has
 * not converted a door yet still works.
 */

import {
  del,
  downloadBlob,
  downloadBlobWithProgress,
  getJson,
  postJson,
  putJson,
  requestRaw,
} from "@/lib/python-client";
import { BackendApiError, parseHttpError } from "@ai-matrx/api";
import { parseMatrxNdjsonResponse } from "@ai-matrx/api";

import { SocialStreamError, consumeSocialEvents } from "./stream";
import { capturedMediaRefs, capturedThumbnailDoor, isCapturedPostId, readCapturedPost } from "./gated/capturedPosts";
import type {
  AdLibrary,
  AdsSearchResult,
  AnalyzePostResult,
  IngestPostResult,
  IngestProfileResult,
  PostMediaRef,
  SocialCapabilities,
  SocialCosts,
  SocialCredits,
  SocialErrorCode,
  SocialPlatform,
  SocialProgress,
  TrackAccountInput,
  TrackAccountResult,
  TranscriptOutcome,
} from "./types";

const BASE = "/social";

interface CallOptions {
  organizationId: string;
  signal?: AbortSignal;
  onProgress?: (progress: SocialProgress) => void;
}

function org(organizationId: string): string {
  const id = organizationId?.trim();
  if (!id) {
    throw new Error("This brand's organization is not loaded yet. Try again in a moment.");
  }
  return id;
}

const KNOWN_CODES: readonly SocialErrorCode[] = [
  "social_not_found",
  "social_unsupported",
  "social_not_configured",
  "social_request_invalid",
  "social_forbidden",
  "social_agent_not_built",
  "social_provider_failed",
  "social_profile_empty",
  "social_profile_mismatch",
  "organization_required",
];

/** The server's `detail.code`, wherever the shared error parser left it. */
export function socialErrorCode(error: unknown): SocialErrorCode | null {
  if (error instanceof SocialStreamError) {
    return KNOWN_CODES.find((c) => c === error.code) ?? null;
  }
  if (!(error instanceof Error)) return null;
  const haystack: string[] = [error.message];
  if (error instanceof BackendApiError) {
    haystack.push(error.detail, String(error.code));
    try {
      haystack.push(JSON.stringify(error.details ?? ""));
    } catch {
      /* unserializable details carry no code */
    }
  }
  const text = haystack.join(" ");
  return KNOWN_CODES.find((c) => text.includes(c)) ?? null;
}

/** Why the server refused, in a word a screen can branch on (`detail.user_code`). */
export const SOCIAL_USER_CODES = [
  "unsupported_platform",
  "not_found",
  "private",
  "restricted",
  "blocked",
  "temporarily_unavailable",
] as const;
export type SocialUserCode = (typeof SOCIAL_USER_CODES)[number];

/** The server's `detail.user_code`, wherever the shared error parser left it. */
export function socialErrorUserCode(error: unknown): SocialUserCode | null {
  const haystack: string[] = [];
  if (error instanceof SocialStreamError) {
    const d = error.details?.user_code;
    if (typeof d === "string") haystack.push(`"user_code":"${d}"`);
  }
  if (error instanceof Error) {
    haystack.push(error.message);
    if (error instanceof BackendApiError) {
      try {
        haystack.push(JSON.stringify(error.details ?? ""), error.detail ?? "");
      } catch {
        /* unserializable details carry no code */
      }
    }
  }
  const text = haystack.join(" ");
  for (const c of SOCIAL_USER_CODES) {
    if (new RegExp(`user_code\\W+${c}\\b`).test(text)) return c;
  }
  return null;
}

/** The plain sentence for each reason; the same wording the server speaks. */
export const SOCIAL_USER_SENTENCES: Record<SocialUserCode, string> = {
  unsupported_platform: "We can't read that on this platform yet.",
  not_found: "We couldn't find that account or post. Check the link or handle and try again.",
  private: "This account appears to be private, so its posts can't be read. If it is public, wait a minute and try again.",
  restricted: "The platform is restricting this account (for example by age or region), so it can't be read.",
  blocked: "We couldn't read this account just now. Nothing is wrong with the account; please try again in a minute.",
  temporarily_unavailable: "That didn't load just now. Trying again in a minute usually works.",
};

/** Vendor / router / developer text that must never be drawn on a screen (a stale server may still send it). */
const INTERNAL_TEXT = /scrapecreators|grok|xai\b|serpapi|dataforseo|no provider|\bprovider\b|adapter|unsupported \(|\/v\d\/|\bHTTP \d{3}\b|\bget_(profile|post|comments)\b|list_posts|traceback|\bundefined\b|\[object/i;

export function looksInternal(text: string | null | undefined): boolean {
  return Boolean(text && INTERNAL_TEXT.test(text));
}

/** A person-readable line for a refused call. */
export function socialErrorMessage(error: unknown, fallback: string): string {
  const code = socialErrorCode(error);
  if (code === "social_agent_not_built") return "Breakdown agent not built yet";
  const userCode = socialErrorUserCode(error);
  if (userCode) return SOCIAL_USER_SENTENCES[userCode];
  // The server's sentence names the account and the real cause (private, empty,
  // a different handle); a generic line per code only fills in when it is absent.
  const specific =
    error instanceof SocialStreamError
      ? error.userMessage
      : error instanceof BackendApiError
        ? error.userMessage
        : undefined;
  if (code === "social_not_found") return SOCIAL_USER_SENTENCES.not_found;
  if (code === "social_provider_failed") return SOCIAL_USER_SENTENCES.temporarily_unavailable;
  if (specific && !looksInternal(specific)) return specific;
  if (code === "social_unsupported") return SOCIAL_USER_SENTENCES.unsupported_platform;
  if (code === "social_not_configured") return SOCIAL_USER_SENTENCES.unsupported_platform;
  if (error instanceof Error && error.message && !looksInternal(error.message)) return error.message;
  return fallback;
}

/** Whether retrying the same call can help (only a transient provider failure). */
export function socialErrorIsRetryable(error: unknown): boolean {
  return socialErrorCode(error) === "social_provider_failed";
}

/** Credits a refused call still cost (a provider bills a missing account). */
export function socialErrorCredits(error: unknown): number | null {
  const details =
    error instanceof SocialStreamError
      ? error.details
      : error instanceof BackendApiError
        ? (error.details as Record<string, unknown> | undefined)
        : undefined;
  const raw = details && typeof details === "object" ? (details as Record<string, unknown>).credits_charged : null;
  return typeof raw === "number" ? raw : null;
}

/**
 * POST a long door. A JSON answer is returned as is; an NDJSON answer is
 * consumed, progress lines go to `onProgress`, and the last result-bearing
 * data event is the answer.
 */
async function callSocial<T>(
  path: string,
  body: unknown,
  opts: CallOptions,
): Promise<T> {
  const response = await requestRaw(
    `${BASE}${path}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    { organizationId: org(opts.organizationId), signal: opts.signal, allowHttpError: true },
  );
  if (!response.ok) throw await parseHttpError(response);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("ndjson") && !type.includes("event-stream")) {
    return (await response.json()) as T;
  }
  const parsed = parseMatrxNdjsonResponse(response, opts.signal);
  return consumeSocialEvents<T>(parsed.events, opts.onProgress);
}

// ---------------------------------------------------------------------------
// Ingest / track
// ---------------------------------------------------------------------------

export function ingestPost(
  input: { url: string; landMedia?: boolean; transcript?: boolean; force?: boolean; commentsMax?: number },
  opts: CallOptions,
): Promise<IngestPostResult> {
  return callSocial<IngestPostResult>(
    "/ingest/post",
    {
      url: input.url,
      land_media: input.landMedia ?? true,
      transcript: input.transcript ?? true,
      force: input.force ?? false,
      comments_max: input.commentsMax,
    },
    opts,
  );
}

/**
 * max_posts wins over pages server-side; with neither, the server uses the `social.profile_posts_default`
 * setting for this organization and person. Never a built-in page count here.
 */
function pagesOrMax(input: { pages?: number; maxPosts?: number }): { pages?: number; max_posts?: number } {
  if (input.maxPosts != null) return { max_posts: input.maxPosts };
  return input.pages != null ? { pages: input.pages } : {};
}

export function ingestProfile(
  input: { handleOrUrl: string; platform?: SocialPlatform; pages?: number; maxPosts?: number; force?: boolean },
  opts: CallOptions,
): Promise<IngestProfileResult> {
  return callSocial<IngestProfileResult>(
    "/ingest/profile",
    {
      handle_or_url: input.handleOrUrl,
      platform: input.platform,
      ...pagesOrMax(input),
      force: input.force ?? false,
    },
    opts,
  );
}

export function trackAccount(
  input: TrackAccountInput,
  opts: CallOptions,
): Promise<TrackAccountResult> {
  return callSocial<TrackAccountResult>(
    "/tracked",
    {
      profile_id: input.profileId,
      handle_or_url: input.handleOrUrl,
      platform: input.platform,
      role: input.role,
      brand_id: input.brandId,
      property_id: input.role === "own" ? input.propertyId : undefined,
      label: input.label,
      notes: input.notes,
      ...pagesOrMax(input),
      force: input.force ?? false,
      allow_empty: input.allowEmpty ?? false,
    },
    opts,
  );
}

export async function untrackAccount(
  trackedAccountId: string,
  opts: CallOptions,
): Promise<{ tracked_account_id: string; archived: boolean }> {
  const { data } = await del<{ tracked_account_id: string; archived: boolean }>(
    `${BASE}/tracked/${trackedAccountId}`,
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  if (!data) throw new Error("The server did not confirm the removal.");
  return data;
}

export function refreshProfile(
  profileId: string,
  input: { pages?: number; maxPosts?: number; force?: boolean; continueFromLast?: boolean },
  opts: CallOptions,
): Promise<IngestProfileResult> {
  return callSocial<IngestProfileResult>(
    `/profiles/${profileId}/refresh`,
    { ...pagesOrMax(input), force: input.force ?? false, ...(input.continueFromLast ? { continue_from_last: true } : {}) },
    opts,
  );
}

// ---------------------------------------------------------------------------
// Post actions
// ---------------------------------------------------------------------------

export async function getTranscript(postId: string, opts: CallOptions): Promise<TranscriptOutcome> {
  const { data } = await postJson<TranscriptOutcome>(
    `${BASE}/posts/${postId}/transcript`,
    {},
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  return data;
}

/**
 * Breakdown. While the agent factory has not bound the Holder the server
 * answers 409 `social_agent_not_built` — callers branch on `socialErrorCode`.
 */
export async function analyzePost(postId: string, opts: CallOptions): Promise<AnalyzePostResult> {
  const { data } = await postJson<AnalyzePostResult>(
    `${BASE}/posts/${postId}/analyze`,
    {},
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  return data;
}

export async function listPostMedia(postId: string, opts: CallOptions): Promise<PostMediaRef[]> {
  // A post captured in the organization's own browser: its stored images, behind the captured-post door.
  if (isCapturedPostId(postId)) {
    const row = await readCapturedPost(postId);
    return row ? capturedMediaRefs(row) : [];
  }
  const { data } = await getJson<PostMediaRef[]>(`${BASE}/posts/${postId}/media`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return data;
}

/**
 * Bytes through the signed playback door as a local object URL. The caller
 * revokes it (`URL.revokeObjectURL`) when the player unmounts.
 */
export async function fetchPlaybackUrl(
  door: string,
  opts: CallOptions & { onBytes?: (loaded: number, total: number | null) => void },
): Promise<string> {
  const path = door.startsWith("/") ? door : `/${door}`;
  const target = path.startsWith(BASE) ? path : `${BASE}${path}`;
  const requestOptions = { organizationId: org(opts.organizationId), signal: opts.signal };
  const { blob } = opts.onBytes
    ? await downloadBlobWithProgress(target, (e) => opts.onBytes?.(e.loaded, e.total), requestOptions)
    : await downloadBlob(target, requestOptions);
  return URL.createObjectURL(blob);
}

/** The stored thumbnail door of a post (small JPEG; 404 when none was stored). */
export const postThumbnailDoor = (postId: string): string =>
  isCapturedPostId(postId) ? capturedThumbnailDoor(postId) : `${BASE}/posts/${postId}/thumbnail`;

/** The stored avatar door of an account (small JPEG; 404 when none was stored). */
export const profileAvatarDoor = (profileId: string): string => `${BASE}/profiles/${profileId}/avatar`;

// ---------------------------------------------------------------------------
// Swipe file
// ---------------------------------------------------------------------------

export async function createCollection(
  input: { name: string; description?: string; brandId?: string },
  opts: CallOptions,
): Promise<{ collection_id: string; name: string }> {
  const { data } = await postJson<{ collection_id: string; name: string }>(
    `${BASE}/collections`,
    { name: input.name, description: input.description, brand_id: input.brandId },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  return data;
}

export async function addToCollection(
  collectionId: string,
  item: {
    itemType: "social_post" | "social_ad" | "social_profile";
    itemId: string;
    /** Carried onto the membership edge; omit both to leave an existing edge's note/tags alone. */
    note?: string;
    tags?: string[];
  },
  opts: CallOptions,
): Promise<void> {
  await postJson(
    `${BASE}/collections/${collectionId}/items`,
    { item_type: item.itemType, item_id: item.itemId, note: item.note, tags: item.tags },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
}

/** Replace the note and tags kept on one saved item in one collection. */
export async function setItemNotes(
  collectionId: string,
  item: { itemType: "social_post" | "social_ad"; itemId: string; note: string; tags: string[] },
  opts: CallOptions,
): Promise<void> {
  await putJson(
    `${BASE}/collections/${collectionId}/items/${item.itemType}/${item.itemId}`,
    { note: item.note, tags: item.tags },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
}

export async function removeFromCollection(
  collectionId: string,
  item: { itemType: "social_post" | "social_ad"; itemId: string },
  opts: CallOptions,
): Promise<void> {
  await del(`${BASE}/collections/${collectionId}/items/${item.itemType}/${item.itemId}`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
}

// ---------------------------------------------------------------------------
// Ads
// ---------------------------------------------------------------------------

/** One search of an ad library. A hard cost charged in points (`useSocialSpend`). */
export async function searchAds(
  input: { library: AdLibrary; query?: string; advertiser?: string; cursor?: string },
  opts: CallOptions,
): Promise<AdsSearchResult> {
  const { data } = await postJson<AdsSearchResult>(
    `${BASE}/ads/search`,
    {
      library: input.library,
      query: input.query?.trim() || undefined,
      advertiser: input.advertiser?.trim() || undefined,
      cursor: input.cursor,
    },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  return data;
}

// ---------------------------------------------------------------------------
// Provider status + credits (Operations)
// ---------------------------------------------------------------------------

export async function getCapabilities(opts: CallOptions): Promise<SocialCapabilities> {
  const { data } = await getJson<SocialCapabilities>(`${BASE}/capabilities`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return data;
}

/** What each social action costs (USD, from the ledger's price knob). Render it with `useSocialSpend`. */
export async function getCosts(opts: CallOptions): Promise<SocialCosts> {
  const { data } = await getJson<SocialCosts>(`${BASE}/costs`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return data;
}

export async function getCredits(opts: CallOptions): Promise<SocialCredits> {
  const { data } = await getJson<SocialCredits>(`${BASE}/credits`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return data;
}

/** What a connected-account attach or refresh observed (null figure = the provider did not send it). */
export interface ConnectedAccountSync {
  provider: string;
  status: string;
  tracked_account_id?: string;
  followers?: number | null;
  posts?: number;
  /** Reads the grant does not cover yet, by what (shown, never hidden). */
  not_granted?: Record<string, string>;
}

/** Put a connected account on a brand as role own and read it once (`POST /social/connected-accounts/attach`). */
export async function attachConnectedAccount(
  input: { provider: string; connectionId: string; resourceType: string; resourceRef: string; brandId: string },
  opts: CallOptions,
): Promise<ConnectedAccountSync> {
  const { data } = await postJson<ConnectedAccountSync>(
    `${BASE}/connected-accounts/attach`,
    {
      provider: input.provider,
      connection_id: input.connectionId,
      resource_type: input.resourceType,
      resource_ref: input.resourceRef,
      brand_id: input.brandId,
    },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  if (!data) throw new Error("The server did not confirm the account.");
  return data;
}

/** Read a connected own account again through its connection (`POST /social/connected-accounts/refresh`). */
export async function refreshConnectedAccount(trackedAccountId: string, opts: CallOptions): Promise<ConnectedAccountSync> {
  const { data } = await postJson<ConnectedAccountSync>(
    `${BASE}/connected-accounts/refresh`,
    { tracked_account_id: trackedAccountId },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
  if (!data) throw new Error("The server did not confirm the refresh.");
  return data;
}

/** One connected own account: what a Refresh uses and how often it updates automatically (`GET /social/connected-accounts/plans`). */
export interface ConnectedAccountPlan {
  tracked_account_id: string;
  provider: string;
  connected: boolean;
  /** USD one Refresh is expected to cost (render as points); 0 = free, null = not priced. */
  usd_per_refresh: number | null;
  points_per_refresh: number | null;
  /** True only for a free read. A paid or unpriced read (X) is Refresh-only: never automatic. */
  automatic: boolean;
  /** Hours between automatic reads (the person's choice, else the default); 0 = Off. */
  frequency_hours: number;
  frequency_chosen: boolean;
  /** Hours the person may pick (0 = Off); empty for a paid read. */
  frequency_options: number[];
  last_read_at: string | null;
  next_read_at: string | null;
}

export async function getConnectedAccountPlans(opts: CallOptions): Promise<ConnectedAccountPlan[]> {
  const { data } = await getJson<{ accounts: ConnectedAccountPlan[] }>(`${BASE}/connected-accounts/plans`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return data?.accounts ?? [];
}

/** Set how often ONE connected account updates automatically, 0 = Off (`PUT /social/connected-accounts/{id}/frequency`). The server refuses a paid read. */
export async function setConnectedFrequency(trackedAccountId: string, hours: number, opts: CallOptions): Promise<void> {
  await putJson(
    `${BASE}/connected-accounts/${trackedAccountId}/frequency`,
    { hours },
    { organizationId: org(opts.organizationId), signal: opts.signal },
  );
}
