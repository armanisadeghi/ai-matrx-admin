/**
 * The fact-filing rules Smart Add follows — read from the server, never copied here.
 *
 * Which web.business_fact kind a facts-agent field is filed under, and which fields live on the brand profile
 * instead (aliases, service area, competitors), are decided ONCE, in aidream `services/brand_profile/promote.py`
 * (FACT_KINDS / FIELD_KIND / PROFILE_HOME). Create (keptFacts.ts) and the validation answers (validate/persist.ts)
 * ask it for them: `GET /brand-intake/promote/rules`, once per session.
 */

import { getJson } from "@/lib/python-client";

export type ProfileHome = "brand_aliases" | "service_area" | "competitors";

export interface FactRules {
  /** Every kind web.business_fact allows. */
  factKinds: readonly string[];
  /** Facts-agent field → the kind it is filed under (fields that are already a kind are not listed). */
  fieldKind: Readonly<Record<string, string>>;
  /** Facts-agent field → the brand profile key that is its one home. */
  profileHome: Readonly<Record<string, ProfileHome>>;
}

interface RulesResponse {
  fact_kinds: string[];
  field_kind: Record<string, string>;
  profile_home: Record<string, string>;
}

const PROFILE_KEYS: readonly string[] = ["brand_aliases", "service_area", "competitors"];

/** The server's response in the client's words (pure; tested). Unknown profile keys are dropped, never guessed. */
export function toFactRules(data: RulesResponse): FactRules {
  const profileHome: Record<string, ProfileHome> = {};
  for (const [field, home] of Object.entries(data.profile_home ?? {})) {
    if (PROFILE_KEYS.includes(home)) profileHome[field] = home as ProfileHome;
  }
  return { factKinds: data.fact_kinds ?? [], fieldKind: data.field_kind ?? {}, profileHome };
}

let loading: Promise<FactRules> | null = null;

/** The rules, fetched once per session (a failed fetch is retried by the next caller). */
export function loadFactRules(): Promise<FactRules> {
  if (!loading) {
    loading = getJson<RulesResponse>("/brand-intake/promote/rules")
      .then(({ data }) => toFactRules(data))
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

/** The web.business_fact kind for a facts-agent field: its own name when that is a kind, else the mapped one, else other. */
export function factKindFor(field: string, rules: FactRules): string {
  const f = field.toLowerCase();
  if (f !== "other" && rules.factKinds.includes(f)) return f;
  return rules.fieldKind[f] ?? "other";
}

/** The brand profile key a facts-agent field lives on instead of web.business_fact, if it has one. */
export function profileHomeFor(field: string, rules: FactRules): ProfileHome | null {
  return rules.profileHome[field.toLowerCase()] ?? null;
}

/** What Create can do when the server cannot be asked: file everything as `other` (the server re-types it after write). */
export const NO_FACT_RULES: FactRules = { factKinds: [], fieldKind: {}, profileHome: {} };
