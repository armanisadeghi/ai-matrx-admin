import type { User } from "@supabase/supabase-js";
import type { KnownDomainRule } from "@/lib/web-domains/registry";
import { loginSeed } from "../loginSeed";
import { welcomeFirstRound } from "../welcomeRound";
import { welcomeFoundSomething, welcomeVerdict } from "../welcomeVerdict";
import { FOUND_SEARCH_ACCOUNTS_FROM, foundSearchNext, foundSearchState, lightBasis } from "../foundSearchState";
import { finishedRound } from "../../roundOutput";
import { addWitnesses } from "../../found/foundCards";
import { mergeEvidence, type EvidenceItem } from "../../evidence";
import { visibleEvidence } from "../../visibleEvidence";
import nicole from "../fixtures/nicole-long.json";

const RULES: KnownDomainRule[] = [
  { host: "gmail.com", pathPattern: "", category: "free_mail", provenance: "seeded", confidence: 1, label: "" },
];

function user(over: Partial<User> & { meta?: Record<string, unknown>; providers?: string[] } = {}): User {
  const { meta = {}, providers = ["email"], ...rest } = over;
  return {
    id: "u1",
    aud: "authenticated",
    app_metadata: {},
    created_at: "2026-10-18T00:00:00Z",
    email: "dana.reyes@gmail.com",
    email_confirmed_at: "2026-10-18T00:00:00Z",
    user_metadata: { full_name: "Dana Reyes", ...meta },
    identities: providers.map((provider, n) => ({ id: `i${n}`, user_id: "u1", identity_id: `i${n}`, provider, identity_data: {} })),
    ...rest,
  } as User;
}

describe("welcomeFirstRound: the one first round both starters send", () => {
  it("a typed name and a confirmed free-mail address: the exact identify inputs", () => {
    const round = welcomeFirstRound(loginSeed(user(), RULES));
    expect(round?.inputs).toEqual({
      website: "",
      socials: [],
      email: "dana.reyes@gmail.com",
      confirmed: { name: "Dana Reyes" },
      woken: { name: "Dana Reyes" },
      exclude_keys: ["name:dana reyes", "email:dana.reyes@gmail.com"],
      entry_kind: "person",
      known: { websites: [], accounts: [], names: ["Dana Reyes"], aliases: [], exclusions: [], results: [] },
      person: { name: "Dana Reyes", affiliations: [], anchors: [], find: true, typed_own_name: true },
    });
    expect(round?.find).toBe(true);
  });

  it("only a name they typed or a provider gave is searched as their own; the email's hint is not (live 2026-10-21)", () => {
    const hint = welcomeFirstRound(loginSeed(user({ meta: { full_name: null } }), RULES));
    expect(hint?.name).toBe("Dana Reyes");
    expect((hint?.inputs.person as Record<string, unknown>).typed_own_name).toBeUndefined();
    const late = welcomeFirstRound(loginSeed(user({ meta: { full_name: null }, email: undefined, email_confirmed_at: undefined }), RULES), "John Smith");
    expect((late?.inputs.person as Record<string, unknown>).typed_own_name).toBe(true);
  });

  it("a work email's domain anchors the name search, never as proof", () => {
    const round = welcomeFirstRound(loginSeed(user({ email: "dana@reyes-roofing.com" }), RULES));
    expect(round?.inputs.person).toMatchObject({ domain_hint: "reyes-roofing.com", typed_own_name: true });
  });

  it("a GitHub login is seeded, confirmed and anchors the name", () => {
    const u = user({ providers: ["github"] });
    (u.identities as { identity_data: Record<string, unknown> }[])[0].identity_data = { user_name: "dreyes", full_name: "Dana Reyes" };
    const round = welcomeFirstRound(loginSeed(u, RULES));
    expect(round?.seeds.socials).toEqual([{ handle_or_url: "https://github.com/dreyes", platform: "github" }]);
    expect(round?.inputs.confirmed).toEqual({ name: "Dana Reyes", handles: ["dreyes"], links: ["https://github.com/dreyes"] });
    expect(round?.inputs.exclude_keys).toEqual(["name:dana reyes", "email:dana.reyes@gmail.com"]);
  });

  it("nothing to search with: no round", () => {
    const u = user({ meta: { full_name: null }, email: undefined, email_confirmed_at: undefined });
    expect(welcomeFirstRound(loginSeed(u, RULES))).toBeNull();
  });
});

describe("foundSearchNext: what a load does, from the session alone", () => {
  it("a new account that never started: start", () => {
    expect(foundSearchNext(user())).toBe("start");
  });
  it("an account made before the background search: nothing (its way in is /welcome?found=1)", () => {
    expect(foundSearchNext(user({ created_at: "2026-09-01T00:00:00Z" }))).toBeNull();
    expect(Date.parse(FOUND_SEARCH_ACCOUNTS_FROM)).not.toBeNaN();
  });
  it("started, not checked: watch", () => {
    expect(foundSearchNext(user({ meta: { found_search_started_at: "2026-10-18T00:00:01Z" } }))).toBe("watch");
  });
  it("told once: never again", () => {
    expect(foundSearchNext(user({ meta: { found_search_started_at: "x", found_search_shown_at: "y" } }))).toBeNull();
  });
  it("nothing found: again only when the session carries something no round had", () => {
    const base = { found_search_started_at: "x", found_search_checked_at: "y" };
    const same = user({ meta: { ...base, found_search_basis: lightBasis(user()) } });
    expect(foundSearchNext(same)).toBeNull();
    const linked = user({ providers: ["email", "github"], meta: { ...base, found_search_basis: lightBasis(user()) } });
    expect(foundSearchNext(linked)).toBe("again");
  });
  it("a persona marked to skip it: nothing", () => {
    const u = user({ app_metadata: { test_fixture: { suite: "s", skip_found_search: true } } });
    expect(foundSearchState(u).skip).toBe(true);
    expect(foundSearchNext(u)).toBeNull();
  });
});

describe("the background verdict reads a finished run the way the door does", () => {
  const seed = loginSeed(user({ meta: { full_name: "Nicole Long" }, email: "nlong.writes@gmail.com" }), RULES);
  const verdictOf = (output: Record<string, unknown>) => {
    const first = welcomeFirstRound(seed);
    const r = finishedRound(output);
    const items = mergeEvidence(mergeEvidence(new Map<string, EvidenceItem>(), first?.items ?? []), r.evidence);
    const decisions = first?.decisions ?? {};
    return welcomeVerdict({
      items: visibleEvidence(items.values(), decisions, true, r.suggestions),
      witnesses: addWitnesses(new Map(), r.evidence),
      facts: r.facts,
      decisions,
      seed,
      name: "Nicole Long",
    });
  };

  it("an anchor round with namesakes: people to ask about, so the person is told", () => {
    const v = verdictOf({ person_anchor_extract: { evidence: (nicole as { evidence: unknown[] }).evidence } });
    expect(v.people.people.length).toBeGreaterThan(0);
    expect(welcomeFoundSomething(v)).toBe(true);
  });

  it("a run that found nothing beyond their own words: never told", () => {
    const v = verdictOf({ email: { evidence: [] }, web: { evidence: [] } });
    expect(v.onlyTyped).toBe(true);
    expect(welcomeFoundSomething(v)).toBe(false);
  });
});
