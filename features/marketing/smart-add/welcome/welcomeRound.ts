/**
 * Sign-up welcome — the FIRST round of a found search, built once for every caller (SIGNUP-WELCOME.md § Flow).
 *
 * Two callers start it, and they must send the same thing on the same subject so the second only ever RESUMES:
 * - the background start on the first signed-in load (foundSearchBackground.ts), which never awaits on a render path;
 * - the welcome door (SmartAddBrand door="welcome") when no run exists yet (`/welcome?found=1` before the background
 *   start, an admin's test login).
 *
 * `welcomeFirstRound` is pure: the login seed (and a late name) → the round's seeds, the evidence the door shows as
 * already answered, and the identify workflow's exact `inputs` — the values SmartAddBrand's generic `startRound`
 * derives for this state (typed name preferred, proven email / GitHub "yes", no anchors yet, person entry).
 * `startWelcomeRound` is the one network call around it.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { startSystemRun } from "@/features/education/kits/systemRuns";
import {
  confirmedBasics,
  customItem,
  mergeEvidence,
  nameAnchors,
  type ConfirmedFacts,
  type Decision,
  type EvidenceItem,
  type RoundSeeds,
} from "../evidence";
import { knownDecided } from "../weThink";
import { seedEvidence, websiteCandidate, type LoginSeed } from "./loginSeed";
import { roundSubject } from "./welcomeSession";

/** The identify workflow every Smart Add round runs (aidream system_workflows.py SMART_ADD_KEY). */
export const IDENTIFY_WORKFLOW_KEY = "smart_add_brand_identify";

/** The first round's seeds: the login's website candidate and its proven GitHub account. */
export function welcomeFirstSeeds(seed: LoginSeed): RoundSeeds {
  return {
    website: websiteCandidate(seed) ?? "",
    socials: seed.githubLogin ? [{ handle_or_url: `https://github.com/${seed.githubLogin}`, platform: "github" }] : [],
  };
}

export interface WelcomeFirstRound {
  seeds: RoundSeeds;
  /** The name searched (the login's, else a late one), or null: the email round alone. */
  name: string | null;
  /** The proven email the round looks up, or "". */
  email: string;
  /** A find round (searches the person by name). */
  find: boolean;
  /** What the door shows as already answered: the name (preferred) and the login's proven values (yes). */
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  /** The identify workflow's inputs, exactly. */
  inputs: Record<string, unknown>;
}

/**
 * The first round for this login, or null when there is nothing to search with (no name, no proven email, no site,
 * no account) — the door then asks for a name and the background start waits for one.
 */
export function welcomeFirstRound(seed: LoginSeed, lateName: string | null = null): WelcomeFirstRound | null {
  const name = seed.name ?? lateName ?? null;
  const list = [...(name ? [customItem("name", name)] : []), ...seedEvidence(seed)];
  const map = mergeEvidence(new Map(), list);
  // The door's own answer rule (SmartAddBrand addCustom): a single-value field is preferred, the rest yes.
  const decisions: Record<string, Decision> = {};
  for (const i of list) decisions[i.key] = i.field === "name" ? "preferred" : "yes";
  const seeds = welcomeFirstSeeds(seed);
  const email = seed.emailProven && seed.email ? seed.email : "";
  const woken: ConfirmedFacts = name ? { name } : {};
  if (!seeds.website && seeds.socials.length === 0 && !woken.name && !email) return null;
  const basics = confirmedBasics(map, decisions, true);
  const confirmed: ConfirmedFacts = {
    ...(basics.name ? { name: basics.name } : {}),
    ...nameAnchors(basics.accounts, []),
  };
  const exclude = Object.entries(decisions)
    .filter(([key, d]) => d === "no" || !key.startsWith("social:"))
    .map(([key]) => key);
  const inputs: Record<string, unknown> = {
    website: seeds.website,
    socials: seeds.socials,
    ...(email ? { email } : {}),
    confirmed,
    woken,
    exclude_keys: exclude,
    entry_kind: "person",
    known: knownDecided(map.values(), decisions),
    ...(name ? { person: { name, affiliations: [], anchors: [], find: true } } : {}),
  };
  return { seeds, name, email, find: Boolean(name), items: [...map.values()], decisions, inputs };
}

/** Start (or rejoin, while it is still running) round `n` of the session `base` with these inputs. */
export function startWelcomeRound(
  dispatch: AppDispatch,
  { base, n, inputs, organizationId }: { base: string; n: number; inputs: Record<string, unknown>; organizationId: string },
): Promise<{ runId: string; duplicate: boolean }> {
  return startSystemRun(
    dispatch,
    IDENTIFY_WORKFLOW_KEY,
    { subject: roundSubject(base, n), organizationId, sourceFeature: "marketing", inputs },
    "Identification could not start.",
  );
}
