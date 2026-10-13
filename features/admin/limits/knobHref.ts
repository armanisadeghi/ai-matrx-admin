/**
 * The ONE door to a platform knob (`platform.feature_knob`): the Limits & Knobs page, opened on
 * the Feature knobs tab and filtered to `key`. `key` is a full key (`billing.ci_spend.day_cap_usd`)
 * or a feature prefix (`billing.ci_spend`) — the page treats it as a search, so a prefix shows
 * every knob of that feature.
 */
export const LIMITS_PATH = "/administration/users/limits";

export function knobHref(key: string): string {
  return `${LIMITS_PATH}?knob=${encodeURIComponent(key)}`;
}
