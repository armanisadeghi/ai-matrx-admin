import type { KnownDomainRule } from "@/lib/web-domains/registry";
import { loginSeed, provenWebsite, seedEvidence } from "../loginSeed";
import { narrowAs, paidCardsHost, roundKey, roundSubject, stableUuid, testLoginUsable, testLoginUser, testSubject, welcomeSubject, EMPTY_TEST_LOGIN } from "../welcomeSession";
import { welcomeProfilePatch } from "../welcomeProfile";

const rule = (host: string, category: string): KnownDomainRule => ({ host, pathPattern: "", category, provenance: "seeded", confidence: 1, label: "" });
const RULES = [rule("gmail.com", "free_mail"), rule("linktr.ee", "link_in_bio"), rule("wixsite.com", "blog_platform")];

describe("sign-up welcome session", () => {
  it("one stable subject per person, a numbered one per later round", () => {
    expect(welcomeSubject("u1")).toBe("signup_welcome:u1");
    expect(roundKey("signup_welcome:u1", 0)).toBe("signup_welcome:u1");
    expect(roundKey("signup_welcome:u1", 1)).toBe("signup_welcome:u1:2");
    // The run lane takes `smart_add:<uuid>` only: the key rides as a stable UUID.
    const first = roundSubject("signup_welcome:u1", 0);
    expect(first).toMatch(/^smart_add:[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(roundSubject("signup_welcome:u1", 0)).toBe(first);
    expect(roundSubject("signup_welcome:u1", 1)).not.toBe(first);
    expect(roundSubject("signup_welcome:u2", 0)).not.toBe(first);
    expect(stableUuid("a")).not.toBe(stableUuid("b"));
  });

  it("a test login's subject is a stable hash of its values, separate from every real person's", () => {
    const t = { ...EMPTY_TEST_LOGIN, name: "Ada Example", email: "ada@gmail.com" };
    expect(testSubject(t)).toMatch(/^signup_welcome:test:[0-9a-f]{8}$/);
    expect(testSubject({ ...t, name: " Ada  Example " })).toBe(testSubject(t));
    expect(testSubject({ ...t, workspaceDomain: "ada.dev" })).not.toBe(testSubject(t));
    expect(testLoginUsable(EMPTY_TEST_LOGIN)).toBe(false);
    expect(testLoginUsable({ ...EMPTY_TEST_LOGIN, name: "Ada" })).toBe(true);
  });

  it("a test login reads exactly like a real Google Workspace sign-in", () => {
    const seed = loginSeed(testLoginUser({ ...EMPTY_TEST_LOGIN, name: "Ada Example", email: "ada@adaworks.dev", workspaceDomain: "adaworks.dev" }), RULES);
    expect(seed.name).toBe("Ada Example");
    expect(seed.emailProven).toBe(true);
    expect(seed.workspaceDomain).toBe("adaworks.dev");
    expect(provenWebsite(seed)).toBe("adaworks.dev");
    expect(seedEvidence(seed).map((i) => i.field).sort()).toEqual(["email", "website"]);
  });

  it("a name-only Gmail sign-in proves no website; a GitHub login proves the account", () => {
    const gmail = loginSeed(testLoginUser({ ...EMPTY_TEST_LOGIN, name: "Ada Example", email: "ada.example@gmail.com" }), RULES);
    expect(gmail.freeMail).toBe(true);
    expect(provenWebsite(gmail)).toBeNull();
    const gh = loginSeed(testLoginUser({ ...EMPTY_TEST_LOGIN, provider: "github", name: "Ada", githubLogin: "@adaex" }), RULES);
    expect(gh.githubLogin).toBe("adaex");
    expect(seedEvidence(gh).find((i) => i.field === "social")?.key).toBe("social:github:adaex");
  });

  it("None of these: a company when it reads like one, else a city", () => {
    expect(narrowAs("Portland")).toEqual({ city: "Portland" });
    expect(narrowAs("Decatur, GA")).toEqual({ city: "Decatur, GA" });
    expect(narrowAs("KGW-TV")).toEqual({ company: "KGW-TV" });
    expect(narrowAs("Smile Brands Inc.")).toEqual({ company: "Smile Brands Inc." });
    expect(narrowAs("acme.io")).toEqual({ company: "acme.io" });
  });

  it("paid cards never run for a free host, nor without the registry", () => {
    expect(paidCardsHost("adaworks.dev", RULES)).toBe("adaworks.dev");
    expect(paidCardsHost("linktr.ee", RULES)).toBeNull();
    expect(paidCardsHost("ada.wixsite.com", RULES)).toBeNull();
    expect(paidCardsHost("adaworks.dev", [])).toBeNull();
    expect(paidCardsHost(null, RULES)).toBeNull();
  });
});

describe("sign-up welcome profile", () => {
  const found = {
    name: "Ada Q Example",
    websiteUrl: "https://adaworks.dev",
    accounts: [
      { platform: "linkedin", handle: "adaex", url: "https://linkedin.com/in/adaex" },
      { platform: "github", handle: "@adaex", url: null },
      { platform: null, handle: "x", url: null },
    ],
    company: "Ada Works",
    jobTitle: null,
  };
  let n = 0;
  const id = () => `id${++n}`;

  it("an empty profile gets every confirmed value", () => {
    n = 0;
    expect(welcomeProfilePatch(null, found, id)).toEqual({
      preferred_name: "Ada",
      legal_first_name: "Ada",
      legal_last_name: "Q Example",
      website_url: "https://adaworks.dev",
      company_name: "Ada Works",
      social_handles: [
        { id: "id1", platform: "linkedin", handle: "adaex", url: "https://linkedin.com/in/adaex" },
        { id: "id2", platform: "github", handle: "adaex", url: null },
      ],
    });
  });

  it("never replaces what the person saved; handles merge without duplicates", () => {
    const current = {
      legal_first_name: "Adelaide",
      legal_last_name: null,
      preferred_name: "Addy",
      company_name: "Mine",
      job_title: null,
      website_url: "https://mine.example",
      social_handles: [{ id: "k", platform: "LinkedIn", handle: "AdaEx", url: null }],
    };
    expect(welcomeProfilePatch(current, found, id)).toEqual({
      social_handles: [current.social_handles[0], { id: expect.any(String), platform: "github", handle: "adaex", url: null }],
    });
  });
});
