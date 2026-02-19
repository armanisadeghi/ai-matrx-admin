/**
 * Feature Flags — Server-Side
 *
 * Uses PostHog's Node.js SDK to evaluate feature flags in Server Components,
 * API routes, and Server Actions. Safe to call from any server context.
 *
 * Usage in a Server Component:
 * ```ts
 * import { isFeatureEnabled, getFeatureFlag } from "@/lib/feature-flags";
 *
 * const showNewSearch = await isFeatureEnabled("new-search-ui", userId);
 * ```
 *
 * Usage in an API route:
 * ```ts
 * const variant = await getFeatureFlag("onboarding-flow", userId);
 * // variant === "control" | "variant-a" | "variant-b" | boolean | null
 * ```
 *
 * Client-side flags: use `useFeatureFlagEnabled` from "posthog-js/react".
 */

import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Flush immediately in serverless — no background threads
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

/**
 * Check if a boolean feature flag is enabled for a user.
 * Returns false if PostHog is not configured or the flag doesn't exist.
 */
export async function isFeatureEnabled(
  flag: string,
  userId: string,
  properties?: Record<string, unknown>
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const result = await client.isFeatureEnabled(flag, userId, { personProperties: properties });
    return result ?? false;
  } catch {
    return false;
  }
}

/**
 * Get a feature flag value (boolean or multivariate string variant).
 * Returns null if PostHog is not configured or the flag doesn't exist.
 */
export async function getFeatureFlag(
  flag: string,
  userId: string,
  properties?: Record<string, unknown>
): Promise<string | boolean | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const result = await client.getFeatureFlag(flag, userId, { personProperties: properties });
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Get all feature flags for a user in one call.
 * More efficient than calling isFeatureEnabled multiple times.
 */
export async function getAllFlags(
  userId: string,
  properties?: Record<string, unknown>
): Promise<Record<string, string | boolean>> {
  const client = getClient();
  if (!client) return {};
  try {
    const result = await client.getAllFlags(userId, { personProperties: properties });
    return result ?? {};
  } catch {
    return {};
  }
}

/**
 * Known feature flags — add new flags here as you create them in PostHog.
 * Keeps flag names type-safe and discoverable.
 */
export const FLAGS = {
  NEW_SEARCH_UI: "new-search-ui",
  TYPESENSE_SEARCH: "typesense-search",
  POSTHOG_REPLAY: "posthog-session-recording",
  NEW_ONBOARDING: "new-onboarding-flow",
  BETA_FEATURES: "beta-features",
} as const;

export type FeatureFlag = (typeof FLAGS)[keyof typeof FLAGS];
