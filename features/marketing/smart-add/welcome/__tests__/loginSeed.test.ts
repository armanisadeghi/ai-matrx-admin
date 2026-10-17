import type { User } from "@supabase/supabase-js";
import type { KnownDomainRule } from "@/lib/web-domains/registry";
import { foundCards } from "../../found/foundCards";
import { addWitnesses } from "../../found/foundCards";
import { emailNameHint, isRoleMailbox, loginSeed, provenProfileName, websiteCandidate, seedDecisions, seedEvidence } from "../loginSeed";
import { siteIsTheirs } from "../siteTheirs";
import type { EvidenceItem } from "../../evidence";

const rule = (host: string): KnownDomainRule => ({
  host,
  pathPattern: "",
  category: "free_mail",
  provenance: "seeded",
  confidence: 1,
  label: "",
});
const RULES = [rule("gmail.com"), rule("outlook.com")];

function user(over: Omit<Partial<User>, "identities"> & { identities?: { provider: string; identity_data: Record<string, unknown> }[] }): User {
  const { identities = [], ...rest } = over;
  return {
    id: "u1",
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-16T00:00:00Z",
    // A person can edit this: nothing in it is ever proven.
    user_metadata: { full_name: "Edited Name", avatar_url: "https://evil.example/a.png", user_name: "someone-else" },
    identities: identities.map((i, n) => ({
      id: `i${n}`,
      user_id: "u1",
      identity_id: `i${n}`,
      provider: i.provider,
      identity_data: i.identity_data,
    })),
    ...rest,
  } as User;
}

describe("loginSeed: proven values only", () => {
  it("Google Workspace: name, avatar, confirmed email, the Workspace domain as the website", () => {
    const seed = loginSeed(
      user({
        email: "dana@northwind.io",
        email_confirmed_at: "2026-10-16T00:00:00Z",
        identities: [
          {
            provider: "google",
            identity_data: { full_name: "Dana Reyes", picture: "https://lh3.googleusercontent.com/a/x", custom_claims: { hd: "northwind.io" } },
          },
        ],
      }),
      RULES,
    );
    expect(seed).toMatchObject({
      name: "Dana Reyes",
      avatarUrl: "https://lh3.googleusercontent.com/a/x",
      email: "dana@northwind.io",
      emailProven: true,
      providers: ["google"],
      workspaceDomain: "northwind.io",
      githubLogin: null,
      emailDomain: "northwind.io",
      freeMail: false,
      roleMailbox: false,
    });
    expect(websiteCandidate(seed)).toBe("northwind.io");
  });

  it("the name typed at sign-up counts (their own word); nothing else in user_metadata is ever read", () => {
    const seed = loginSeed(user({ email: "x@gmail.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(seed.name).toBe("Edited Name");
    expect(seed.nameFrom).toBe("typed");
    expect(seed.avatarUrl).toBeNull();
    expect(seed.githubLogin).toBeNull();
  });

  it("no name anywhere: the email's name hint, else nothing (the door then asks once)", () => {
    const none = { user_metadata: {} };
    const hinted = loginSeed(user({ ...none, email: "jane.doe.a1b2c3@fixtures.aimatrx.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(hinted).toMatchObject({ name: "Jane Doe", nameFrom: "email" });
    const bare = loginSeed(user({ ...none, email: "zq7@gmail.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(bare).toMatchObject({ name: null, nameFrom: null });
    expect(emailNameHint("jdoe@acme.com")).toBeNull();
    expect(emailNameHint("mary_ann.lee@acme.com")).toBe("Mary Ann Lee");
    // A mailbox word never names a person.
    expect(emailNameHint("info.team@acme.com")).toBeNull();
    expect(loginSeed(user({ ...none, email: "sales.team@acme.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES).name).toBeNull();
    expect(loginSeed(user({ ...none, email: "info@acme.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES).name).toBeNull();
  });

  it("an unconfirmed email is not proven and seeds nothing", () => {
    const seed = loginSeed(user({ email: "dana@northwind.io", email_confirmed_at: undefined }), RULES);
    expect(seed.emailProven).toBe(false);
    expect(seedEvidence(seed)).toEqual([]);
  });

  it("free mail is never a website; unknown free-mail status (no registry) is never guessed", () => {
    const gmail = loginSeed(user({ email: "dana.reyes@gmail.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(gmail.freeMail).toBe(true);
    expect(websiteCandidate(gmail)).toBeNull();
    const unknown = loginSeed(user({ email: "dana@northwind.io", email_confirmed_at: "2026-10-16T00:00:00Z" }), null);
    expect(unknown.freeMail).toBeNull();
    expect(websiteCandidate(unknown)).toBeNull();
  });

  it("a role mailbox names a business, so its domain is not seeded as a website", () => {
    expect(isRoleMailbox("info@acme.com")).toBe(true);
    expect(isRoleMailbox("support+billing@acme.com")).toBe(true);
    expect(isRoleMailbox("dana@acme.com")).toBe(false);
    const seed = loginSeed(user({ email: "info@acme.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(seed.roleMailbox).toBe(true);
    expect(websiteCandidate(seed)).toBeNull();
  });

  it("GitHub: user_name, else preferred_username; Google outranks GitHub for the name", () => {
    const seed = loginSeed(
      user({
        email: "dana@northwind.io",
        email_confirmed_at: "2026-10-16T00:00:00Z",
        identities: [
          { provider: "github", identity_data: { name: "dreyes", preferred_username: "dreyes-dev", avatar_url: "https://avatars.githubusercontent.com/u/1" } },
          { provider: "google", identity_data: { name: "Dana Reyes" } },
        ],
      }),
      RULES,
    );
    expect(seed.githubLogin).toBe("dreyes-dev");
    expect(seed.name).toBe("Dana Reyes");
    expect(seed.avatarUrl).toBe("https://avatars.githubusercontent.com/u/1");
    expect(seed.providers).toEqual(["github", "google"]);
  });
});

describe("seedEvidence: typed, yes, and certain under the found-first rule", () => {
  const seed = loginSeed(
    user({
      email: "Dana@NorthWind.io",
      email_confirmed_at: "2026-10-16T00:00:00Z",
      identities: [{ provider: "github", identity_data: { user_name: "DReyes" } }],
    }),
    RULES,
  );
  const items = seedEvidence(seed);

  it("emits the email and the GitHub account, never the website candidate", () => {
    expect(items.map((i) => i.key)).toEqual(["email:dana@northwind.io", "social:github:dreyes"]);
    for (const i of items) {
      expect(i.source.kind).toBe("typed");
      expect(i.confidence).toBe(1);
    }
    const gh = items[1];
    expect(gh).toMatchObject({ field: "social", platform: "github", handle: "DReyes", url: "https://github.com/DReyes" });
  });

  it("answers every item yes", () => {
    expect(seedDecisions(items)).toEqual({
      "email:dana@northwind.io": "yes",
      "social:github:dreyes": "yes",
    });
  });

  it("foundCards shows the GitHub account as certain, and no website from the login alone", () => {
    const cards = foundCards({
      items,
      witnesses: addWitnesses(new Map(), items),
      facts: [],
      decisions: seedDecisions(items),
      typedWebsiteKey: null,
    });
    expect(cards.website).toBeNull();
    expect(cards.accounts.map((a) => a.item.key)).toEqual(["social:github:dreyes"]);
  });
});

const ev = (over: Partial<EvidenceItem> & Pick<EvidenceItem, "key" | "field" | "value" | "source">): EvidenceItem => ({
  label: null,
  image_url: null,
  url: null,
  platform: null,
  handle: null,
  followers: null,
  verified: null,
  profile_id: null,
  confidence: 0.8,
  ...over,
});

describe("siteIsTheirs: an employer's domain is not the person's site", () => {
  const employer = ev({
    key: "name:fixtures",
    field: "name",
    value: "AI Matrx Fixtures",
    source: { node: "website", kind: "website", url: "https://fixtures.aimatrx.com/", where: "the site" },
  });

  it("a site that never names them is not theirs", () => {
    expect(siteIsTheirs({ host: "fixtures.aimatrx.com", name: "Jane Doe", items: [employer], facts: [], decisions: {} })).toBe(false);
  });

  it("the site names them (its title, a sure fact citing it), but never by a first name alone", () => {
    const title = ev({ ...employer, key: "name:jane", value: "Jane Doe | Photographer" });
    expect(siteIsTheirs({ host: "janedoe.com", name: "Jane Doe", items: [{ ...title, source: { ...title.source, url: "https://janedoe.com/" } }], facts: [], decisions: {} })).toBe(true);
    expect(siteIsTheirs({ host: "janedoe.com", name: "Jane", items: [{ ...title, source: { ...title.source, url: "https://janedoe.com/" } }], facts: [], decisions: {} })).toBe(false);
    const fact = { key: "f1", field: "official_name", field_label: "", value: "Jane Doe", certainty: "likely", reason: "", evidence_urls: ["https://janedoe.com/about"], known_field: null };
    expect(siteIsTheirs({ host: "janedoe.com", name: "Jane Doe", items: [], facts: [fact], decisions: {} })).toBe(true);
    expect(siteIsTheirs({ host: "janedoe.com", name: "Jane Doe", items: [], facts: [{ ...fact, certainty: "possible" }], decisions: {} })).toBe(false);
  });

  it("one of their confirmed accounts links to it", () => {
    const gh = ev({ key: "social:github:jdoe", field: "social", value: "https://github.com/jdoe", url: "https://github.com/jdoe", platform: "github", handle: "jdoe", source: { node: "login", kind: "typed", url: null, where: "your sign-in" } });
    const linked = ev({ key: "website:janedoe.com", field: "website", value: "https://janedoe.com", url: "https://janedoe.com", source: { node: "email", kind: "social_profile", url: "https://github.com/jdoe", where: "GitHub" } });
    expect(siteIsTheirs({ host: "janedoe.com", name: "J", items: [gh, linked], facts: [], decisions: { [gh.key]: "yes" } })).toBe(true);
    expect(siteIsTheirs({ host: "janedoe.com", name: "J", items: [gh, linked], facts: [], decisions: {} })).toBe(false);
  });
});

describe("provenProfileName: the GitHub profile name the email lookup proved", () => {
  const gh = (certainty: "certain" | "likely", label: string | null) =>
    ev({ key: "social:github:jdoe", field: "social", value: "https://github.com/jdoe", platform: "github", handle: "jdoe", label, certainty, source: { node: "email", kind: "social_profile", url: "https://github.com/jdoe", where: "GitHub · commit email" } });
  it("certain and a full name only", () => {
    expect(provenProfileName([gh("certain", "Jane Doe")])).toBe("Jane Doe");
    expect(provenProfileName([gh("likely", "Jane Doe")])).toBeNull();
    expect(provenProfileName([gh("certain", "jdoe")])).toBeNull();
    expect(provenProfileName([gh("certain", null)])).toBeNull();
  });
});
