import type { User } from "@supabase/supabase-js";
import type { KnownDomainRule } from "@/lib/web-domains/registry";
import { foundCards } from "../../found/foundCards";
import { addWitnesses } from "../../found/foundCards";
import { isRoleMailbox, loginSeed, provenWebsite, seedDecisions, seedEvidence } from "../loginSeed";

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
    expect(provenWebsite(seed)).toBe("northwind.io");
  });

  it("never reads user_metadata", () => {
    const seed = loginSeed(user({ email: "x@gmail.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(seed.name).toBeNull();
    expect(seed.avatarUrl).toBeNull();
    expect(seed.githubLogin).toBeNull();
  });

  it("an unconfirmed email is not proven and seeds nothing", () => {
    const seed = loginSeed(user({ email: "dana@northwind.io", email_confirmed_at: undefined }), RULES);
    expect(seed.emailProven).toBe(false);
    expect(seedEvidence(seed)).toEqual([]);
  });

  it("free mail is never a website; unknown free-mail status (no registry) is never guessed", () => {
    const gmail = loginSeed(user({ email: "dana.reyes@gmail.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(gmail.freeMail).toBe(true);
    expect(provenWebsite(gmail)).toBeNull();
    const unknown = loginSeed(user({ email: "dana@northwind.io", email_confirmed_at: "2026-10-16T00:00:00Z" }), null);
    expect(unknown.freeMail).toBeNull();
    expect(provenWebsite(unknown)).toBeNull();
  });

  it("a role mailbox names a business, so its domain is not seeded as a website", () => {
    expect(isRoleMailbox("info@acme.com")).toBe(true);
    expect(isRoleMailbox("support+billing@acme.com")).toBe(true);
    expect(isRoleMailbox("dana@acme.com")).toBe(false);
    const seed = loginSeed(user({ email: "info@acme.com", email_confirmed_at: "2026-10-16T00:00:00Z" }), RULES);
    expect(seed.roleMailbox).toBe(true);
    expect(provenWebsite(seed)).toBeNull();
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

  it("emits the email, the website and the GitHub account with the session's keys", () => {
    expect(items.map((i) => i.key)).toEqual(["email:dana@northwind.io", "website:northwind.io", "social:github:dreyes"]);
    for (const i of items) {
      expect(i.source.kind).toBe("typed");
      expect(i.confidence).toBe(1);
    }
    const gh = items[2];
    expect(gh).toMatchObject({ field: "social", platform: "github", handle: "DReyes", url: "https://github.com/DReyes" });
  });

  it("answers every item yes", () => {
    expect(seedDecisions(items)).toEqual({
      "email:dana@northwind.io": "yes",
      "website:northwind.io": "yes",
      "social:github:dreyes": "yes",
    });
  });

  it("foundCards shows the website and the GitHub account as certain", () => {
    const cards = foundCards({
      items,
      witnesses: addWitnesses(new Map(), items),
      facts: [],
      decisions: seedDecisions(items),
      typedWebsiteKey: "website:northwind.io",
    });
    expect(cards.website?.key).toBe("website:northwind.io");
    expect(cards.accounts.map((a) => a.item.key)).toEqual(["social:github:dreyes"]);
  });
});
