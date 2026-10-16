/**
 * The first-paint weight guard for user preferences. The whole `users.user_preferences` row is inlined in every
 * signed-in page's boot seed, so a section is a SETTING (small), never a feature's working data. Working data
 * (review state, caches, run history) goes in users.user_surface_state, loaded when the feature opens.
 */
export const MAX_PREFERENCE_SECTION_BYTES = 4096;

export function oversizedPreferenceSections(
  preferences: Record<string, unknown>,
  limit: number = MAX_PREFERENCE_SECTION_BYTES,
): { section: string; bytes: number }[] {
  return Object.entries(preferences)
    .map(([section, value]) => ({ section, bytes: new TextEncoder().encode(JSON.stringify(value ?? null)).length }))
    .filter((s) => s.bytes > limit)
    .sort((a, b) => b.bytes - a.bytes);
}
