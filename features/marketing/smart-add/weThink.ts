/**
 * Smart Add — "we think" (ROADMAP stage 4; aidream mandate `brand_intake.we_think`, kind `brand_we_think`).
 *
 * The identify run's `we_think` step judges every open account, website, name and logo against the known
 * facts, and answers per candidate `{key, choice, relation_key?, probability, reason, evidence}`. Smart Add
 * puts it in each finding's `suggestion` slot: the matching option glows, the reason sits in a hover card,
 * and nothing is ever selected for the person. Pure (no I/O).
 */

import { handleKeyPart } from "../social/account-input";
import { websiteHost, type Decision, type EvidenceItem } from "./evidence";

/**
 * MKT-064: one key, however it is spelled. The agent may hand back `vivaespaña-1m` for the card's
 * `vivaespa%c3%b1a-1m` (or change case); both sides compare through the account-key helper.
 */
export function suggestionKey(key: string): string {
  return handleKeyPart(key);
}

/** The agent's choices, as the screens' answers (validate/queue `Answer`): ask_later is "Ask me later". */
const CHOICE: Record<string, string> = {
  preferred: "preferred",
  ours: "ours",
  alias: "alias",
  not_us: "not_us",
  related: "related",
  ask_later: "later",
};

export interface WeThinkSuggestion {
  choice: string;
  relation_key: string | null;
  probability: number | null;
  reason: string;
  evidence: string[];
}

function parseOne(raw: unknown): [string, WeThinkSuggestion] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const key = typeof s.key === "string" ? s.key : null;
  const choice = typeof s.choice === "string" ? CHOICE[s.choice] : undefined;
  if (!key || !choice) return null;
  return [
    key,
    {
      choice,
      relation_key: choice === "related" && typeof s.relation_key === "string" ? s.relation_key : null,
      probability: typeof s.probability === "number" && Number.isFinite(s.probability) ? s.probability : null,
      reason: typeof s.reason === "string" ? s.reason : "",
      evidence: Array.isArray(s.evidence) ? s.evidence.filter((e): e is string => typeof e === "string") : [],
    },
  ];
}

/**
 * Every we-think suggestion in a step output (or a live frame), keyed by the finding's key: a
 * `brand_we_think` object's `suggestions` (by `__kind` or by key), found at any depth (the step output's
 * `content` kind instances, `structured_output`, or a frame payload).
 */
export function suggestionsFromPayload(payload: unknown, depth = 0): Record<string, WeThinkSuggestion> {
  if (depth > 6 || payload === null || typeof payload !== "object") return {};
  if (Array.isArray(payload)) return Object.assign({}, ...payload.map((p) => suggestionsFromPayload(p, depth + 1)));
  const o = payload as Record<string, unknown>;
  if ((o.__kind === "brand_we_think" || "suggestions" in o) && Array.isArray(o.suggestions)) {
    return Object.fromEntries(
      o.suggestions
        .map(parseOne)
        .filter((p): p is [string, WeThinkSuggestion] => Boolean(p))
        .map(([k, v]) => [suggestionKey(k), v]),
    );
  }
  return Object.assign(
    {},
    ...Object.values(o)
      .filter((v) => typeof v === "object" && v !== null)
      .map((v) => suggestionsFromPayload(v, depth + 1)),
  );
}

/** Each finding carries its suggestion (the agent's wins over a rule's); a finding answered for one twin key reads it too. */
export function withSuggestions(items: EvidenceItem[], suggestions: Record<string, WeThinkSuggestion>): EvidenceItem[] {
  if (!Object.keys(suggestions).length) return items;
  return items.map((i) => {
    const s = [i.key, ...(i.same_as ?? [])].map((k) => suggestions[k] ?? suggestions[suggestionKey(k)]).find(Boolean);
    if (!s) return i;
    // The option the card actually offers: names answer Preferred / Alias, everything else Ours.
    const name = i.field === "name";
    const choice = name && s.choice === "ours" ? "preferred" : !name && (s.choice === "preferred" || s.choice === "alias") ? "ours" : s.choice;
    return { ...i, suggestion: { ...s, choice } };
  });
}

/** What the person already decided, as the identify workflow's `known` input (the we-think step reads it). */
export interface KnownDecided {
  websites: string[];
  accounts: string[];
  names: string[];
  aliases: string[];
  exclusions: string[];
}

export function knownDecided(items: Iterable<EvidenceItem>, decisions: Record<string, Decision>): KnownDecided {
  const known: KnownDecided = { websites: [], accounts: [], names: [], aliases: [], exclusions: [] };
  for (const i of items) {
    const d = decisions[i.key];
    if (!d) continue;
    const exact = i.field === "website" ? websiteHost(i.value) : i.field === "social" ? (i.url ?? i.value) : i.value;
    if (d === "no") known.exclusions.push(exact);
    else if (i.field === "website") known.websites.push(exact);
    else if (i.field === "social") known.accounts.push(exact);
    else if (i.field === "name") (d === "alias" ? known.aliases : known.names).push(exact);
  }
  const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  return {
    websites: unique(known.websites),
    accounts: unique(known.accounts),
    names: unique(known.names),
    aliases: unique(known.aliases),
    exclusions: unique(known.exclusions),
  };
}
