/**
 * loginSeed against the REAL identity shapes. Keys read from auth.identities (live, keys only, 2026-10-21):
 *   google: avatar_url custom_claims{auth_time,hd} email email_verified full_name iss name phone_verified picture provider_id sub
 *   github: avatar_url email email_verified full_name iss name phone_verified preferred_username provider_id sub user_name
 *   apple:  custom_claims email email_verified iss phone_verified provider_id sub   (never a name)
 *   email:  education_age_band email email_verified phone_verified sub               (never a name)
 * Every value below is fake.
 */
import type { User } from "@supabase/supabase-js";
import type { KnownDomainRule } from "@/lib/web-domains/registry";
import { loginSeed, resolveName, seedEvidence, websiteCandidate, provenProfileName } from "../loginSeed";
import type { EvidenceItem } from "../../evidence";

const rule = (host: string): KnownDomainRule => ({ host, pathPattern: "", category: "free_mail", provenance: "seeded", confidence: 1, label: "" });
// Hosts as seeded in web.domain_category (free_mail), incl. the relay hosts.
const RULES = ["gmail.com", "outlook.com", "icloud.com", "proton.me", "privaterelay.appleid.com", "users.noreply.github.com"].map(rule);
const CONFIRMED = "2026-10-21T00:00:00Z";

type Ident = { provider: string; identity_data: Record<string, unknown> };
function user(email: string | undefined, confirmed: boolean, identities: Ident[], user_metadata: Record<string, unknown> = {}): User {
  return {
    id: "u1",
    app_metadata: {},
    aud: "authenticated",
    created_at: CONFIRMED,
    email,
    email_confirmed_at: confirmed ? CONFIRMED : undefined,
    user_metadata,
    identities: identities.map((i, n) => ({ id: `i${n}`, user_id: "u1", identity_id: `i${n}`, ...i })),
  } as unknown as User;
}

const googleId = (email: string, name: string, extra: Record<string, unknown> = {}): Ident => ({
  provider: "google",
  identity_data: {
    avatar_url: "https://lh3.googleusercontent.com/a/fake", email, email_verified: true, full_name: name, iss: "https://accounts.google.com",
    name, phone_verified: false, picture: "https://lh3.googleusercontent.com/a/fake", provider_id: "1", sub: "1", ...extra,
  },
});
const emailId = (email: string): Ident => ({ provider: "email", identity_data: { email, email_verified: true, phone_verified: false, sub: "u1" } });

describe("loginSeed on every real login shape", () => {
  it("Google gmail: provider name, proven email, free mail, no website", () => {
    const s = loginSeed(user("dana.reyes@gmail.com", true, [googleId("dana.reyes@gmail.com", "Dana Reyes")]), RULES);
    expect(s).toMatchObject({ name: "Dana Reyes", nameFrom: "provider", emailProven: true, freeMail: true, workspaceDomain: null, githubLogin: null });
    expect(websiteCandidate(s)).toBeNull();
    expect(seedEvidence(s).map((i) => i.key)).toEqual(["email:dana.reyes@gmail.com"]);
  });

  it("Google Workspace (hd): the domain is searched as a candidate, not certain (no evidence item)", () => {
    const s = loginSeed(
      user("dana@northwind.io", true, [googleId("dana@northwind.io", "Dana Reyes", { custom_claims: { auth_time: 1, hd: "Northwind.io" } })]),
      RULES,
    );
    expect(s.workspaceDomain).toBe("northwind.io");
    expect(websiteCandidate(s)).toBe("northwind.io");
    expect(seedEvidence(s).some((i) => i.field === "website")).toBe(false);
  });

  it("GitHub with a noreply email: a proven account, the noreply host is never a website, name from the profile", () => {
    const email = "12345+dreyes@users.noreply.github.com";
    const id: Ident = {
      provider: "github",
      identity_data: { avatar_url: "https://avatars.githubusercontent.com/u/1", email, email_verified: true, full_name: "Dana Reyes", iss: "https://api.github.com", name: "Dana Reyes", phone_verified: false, preferred_username: "dreyes", provider_id: "1", sub: "1", user_name: "dreyes" },
    };
    const s = loginSeed(user(email, true, [id]), RULES);
    expect(s).toMatchObject({ githubLogin: "dreyes", name: "Dana Reyes", nameFrom: "provider", freeMail: true });
    expect(websiteCandidate(s)).toBeNull();
    expect(seedEvidence(s).map((i) => i.key)).toEqual([`email:${email}`, "social:github:dreyes"]);
  });

  it("GitHub with no name field: the login is not offered as a name", () => {
    const id: Ident = { provider: "github", identity_data: { email: "x@acme.com", preferred_username: "dreyes", user_name: "dreyes" } };
    const s = loginSeed(user("x@acme.com", true, [id]), RULES);
    expect(s.name).toBeNull();
    expect(s.githubLogin).toBe("dreyes");
  });

  it("Apple private relay, no name: relay is free mail, never a website, no name", () => {
    const email = "k3j9x2m1q8@privaterelay.appleid.com";
    const id: Ident = { provider: "apple", identity_data: { custom_claims: { auth_time: 1 }, email, email_verified: true, iss: "https://appleid.apple.com", phone_verified: false, provider_id: "1", sub: "1" } };
    const s = loginSeed(user(email, true, [id]), RULES);
    expect(s).toMatchObject({ name: null, nameFrom: null, emailProven: true, freeMail: true, providers: ["apple"] });
    expect(websiteCandidate(s)).toBeNull();
  });

  it("Apple relay host missing from the registry would NOT be caught: the live registry has it (seeded 2026-10-21)", () => {
    const s = loginSeed(user("k3j9@privaterelay.appleid.com", true, [emailId("k3j9@privaterelay.appleid.com")]), [rule("gmail.com")]);
    expect(s.freeMail).toBe(false); // proves the test needs the registry row
  });

  it("Apple with a real company email, no name: candidate site, email proven, name from the two-word hint", () => {
    const id: Ident = { provider: "apple", identity_data: { custom_claims: { auth_time: 1 }, email: "sam.okafor@brightpath.co", email_verified: true, iss: "https://appleid.apple.com", phone_verified: false, provider_id: "1", sub: "1" } };
    const s = loginSeed(user("sam.okafor@brightpath.co", true, [id]), RULES);
    expect(s).toMatchObject({ name: "Sam Okafor", nameFrom: "email", emailProven: true, freeMail: false });
    expect(websiteCandidate(s)).toBe("brightpath.co");
    expect(seedEvidence(s).some((i) => i.field === "website")).toBe(false);
  });

  it("email + password, no name, company domain: searched, not certain; no typed name", () => {
    const s = loginSeed(user("lee@harborlight.com", true, [emailId("lee@harborlight.com")], { email: "lee@harborlight.com", email_verified: true }), RULES);
    expect(s).toMatchObject({ name: null, nameFrom: null, providers: ["email"] });
    expect(websiteCandidate(s)).toBe("harborlight.com");
  });

  it("email + password with a name typed at sign-up: typed beats the email hint", () => {
    const s = loginSeed(user("jane.doe@harborlight.com", true, [emailId("jane.doe@harborlight.com")], { full_name: "Janet Dow" }), RULES);
    expect(s).toMatchObject({ name: "Janet Dow", nameFrom: "typed" });
  });

  it("role mailbox (info@): no person name, no website candidate", () => {
    const s = loginSeed(user("info@harborlight.com", true, [emailId("info@harborlight.com")]), RULES);
    expect(s).toMatchObject({ roleMailbox: true, name: null });
    expect(websiteCandidate(s)).toBeNull();
  });

  it("unconfirmed email: not proven, no evidence, no website candidate", () => {
    const s = loginSeed(user("lee@harborlight.com", false, [emailId("lee@harborlight.com")]), RULES);
    expect(s.emailProven).toBe(false);
    expect(seedEvidence(s)).toEqual([]);
    expect(websiteCandidate(s)).toBeNull();
  });

  it("a placeholder name from a provider or the sign-up form is no name", () => {
    const s = loginSeed(user("jane.doe@harborlight.com", true, [googleId("jane.doe@harborlight.com", "Unknown")], { full_name: "N/A" }), RULES);
    expect(s).toMatchObject({ name: "Jane Doe", nameFrom: "email" });
  });
});

describe("resolveName: provider > typed > proven GitHub name > email hint > none", () => {
  const hinted = loginSeed(user("jane.doe@harborlight.com", true, [emailId("jane.doe@harborlight.com")]), RULES);
  const none = loginSeed(user("zq7@harborlight.com", true, [emailId("zq7@harborlight.com")]), RULES);
  const provider = loginSeed(user("a@b.co", true, [googleId("a@b.co", "Dana Reyes")]), RULES);
  const typed = loginSeed(user("a@b.co", true, [emailId("a@b.co")], { full_name: "Janet Dow" }), RULES);
  const github = (label: string) =>
    ({ field: "social", platform: "github", handle: "dreyes", label, certainty: "certain", source: { kind: "social_profile" } }) as unknown as EvidenceItem;

  it("applies the order", () => {
    expect(resolveName(provider, "Gh Name")).toBe("Dana Reyes");
    expect(resolveName(typed, "Gh Name")).toBe("Janet Dow");
    expect(resolveName(hinted, "Gh Name")).toBe("Gh Name");
    expect(resolveName(hinted, null)).toBe("Jane Doe");
    expect(resolveName(none, null)).toBeNull();
    expect(resolveName(none, "Gh Name")).toBe("Gh Name");
  });

  it("provenProfileName feeds it only a certain, two-word, non-login name", () => {
    expect(provenProfileName([github("Dana Reyes")])).toBe("Dana Reyes");
    expect(provenProfileName([github("dreyes")])).toBeNull();
  });
});
