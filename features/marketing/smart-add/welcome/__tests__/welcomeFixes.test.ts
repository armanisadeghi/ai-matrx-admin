/**
 * Sign-up welcome fixes (2026-10-16): the greeting's first name, the buyers card's terms, and the profile write that
 * survives the page going away mid-way.
 */

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: { user: { id: "owner-1" } } } })) } },
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn(async () => "2c1d4319-bf0d-40bc-8ca1-657f4063d080") }));

import { firstNameOf } from "../firstName";
import { buyerTerms, ownNames } from "../welcomeSession";
import { welcomeProfilePatch } from "../welcomeProfile";
import { resumeWelcomeProfiles, writeWelcomeProfile } from "../saveWelcomeProfile";
import { customItem, mergeEvidence, parseEvidenceItem } from "../../evidence";
import { addWitnesses } from "../../found/foundCards";
import { personCards } from "../../found/personCards";

describe("the name we greet them by", () => {
  it("is the first word when it is a real word", () => {
    expect(firstNameOf("Jon Klassen")).toBe("Jon");
    expect(firstNameOf("  Ada   Lovelace ")).toBe("Ada");
    expect(firstNameOf("Prince")).toBe("Prince");
    expect(firstNameOf("")).toBe("");
  });

  it("is the full name when the given name is an initial or one letter", () => {
    expect(firstNameOf("N K Jemisin")).toBe("N K Jemisin");
    expect(firstNameOf("N. K. Jemisin")).toBe("N. K. Jemisin");
    expect(firstNameOf("N.K. Jemisin")).toBe("N.K. Jemisin");
    expect(firstNameOf("J.R.R. Tolkien")).toBe("J.R.R. Tolkien");
    expect(firstNameOf("É Martin")).toBe("É Martin");
  });

  it("the profile's preferred name follows the same rule; the legal parts stay literal", () => {
    const patch = welcomeProfilePatch(null, { name: "N K Jemisin", websiteUrl: null, accounts: [], company: null, jobTitle: null });
    expect(patch.preferred_name).toBe("N K Jemisin");
    expect(patch.legal_first_name).toBe("N");
    expect(patch.legal_last_name).toBe("K Jemisin");
  });
});

describe("what buyers search", () => {
  const names = ownNames({ name: "N K Jemisin", kind: "person" }, "nkjemisin.com");

  it("never repeats their own name: every spelling of it, their site's name, their surname", () => {
    expect(names).toEqual(["nkjemisin", "jemisin"]);
    expect(buyerTerms(["n k jemisin", "nk jemisin books", "jemisin broken earth", "the fifth season", "hugo award novels"], names)).toEqual([
      "the fifth season",
      "hugo award novels",
    ]);
  });

  it("shows at most three, each once", () => {
    expect(buyerTerms(["a b c", "A-B-C", "deep work", "focus", "slow productivity", "digital minimalism"], ["zzz"])).toEqual([
      "a b c",
      "deep work",
      "focus",
    ]);
  });

  it("is empty (no card) when every term names them", () => {
    expect(buyerTerms(["n k jemisin", "nk jemisin", "N. K. Jemisin books"], names)).toEqual([]);
  });

  it("a company's last word is never read as a surname", () => {
    expect(ownNames({ name: "Pinch of Yum", kind: "company" }, "pinchofyum.com")).toEqual(["pinchofyum"]);
  });
});

describe("the profile write survives the page going away", () => {
  const found = { name: "Ada Lovelace", websiteUrl: "https://ada.dev", accounts: [], company: null, jobTitle: null };
  const KEY = "matrx:client:welcome.profile-pending:signup_welcome:owner-1";
  const fetchMock = jest.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  const reply = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

  it("records the confirmed values before writing, and clears them only once the write landed", async () => {
    let seenDuringWrite: string | null = null;
    fetchMock.mockImplementationOnce(async () => {
      seenDuringWrite = localStorage.getItem(KEY);
      return reply({ success: true, data: null });
    });
    fetchMock.mockResolvedValueOnce(reply({ success: true }));
    const fields = await writeWelcomeProfile("signup_welcome:owner-1", found);
    expect(fields).toEqual(expect.arrayContaining(["preferred_name", "website_url"]));
    expect(JSON.parse(seenDuringWrite ?? "null")).toMatchObject({ ownerId: "owner-1", found });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("a write that never finished is written by the next load, for its own account only", async () => {
    // The page went away mid-write: the record is there, the PATCH never landed.
    fetchMock.mockImplementationOnce(() => new Promise(() => undefined));
    void writeWelcomeProfile("signup_welcome:owner-1", found);
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem(KEY)).not.toBeNull();

    // Another account signed in on this browser never writes it.
    expect(await resumeWelcomeProfiles("someone-else")).toEqual([]);
    expect(localStorage.getItem(KEY)).not.toBeNull();

    fetchMock.mockResolvedValueOnce(reply({ success: true, data: null }));
    fetchMock.mockResolvedValueOnce(reply({ success: true }));
    expect(await resumeWelcomeProfiles("owner-1")).toEqual(["signup_welcome:owner-1"]);
    const patch = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
    expect(patch).toMatchObject({ preferred_name: "Ada", website_url: "https://ada.dev" });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("a failed write keeps the record for the next load", async () => {
    fetchMock.mockResolvedValueOnce(reply({ success: true, data: null }));
    fetchMock.mockResolvedValueOnce(reply({ success: false, msg: "nope" }, false));
    await expect(writeWelcomeProfile("signup_welcome:owner-1", found)).rejects.toThrow("nope");
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});


describe("an admin's test login never writes the admin's own profile", () => {
  const found = { name: "Ada Lovelace", websiteUrl: "https://ada.dev", accounts: [], company: null, jobTitle: null };
  const fetchMock = jest.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("writeWelcomeProfile on a test subject calls nothing and records nothing", async () => {
    expect(await writeWelcomeProfile("signup_welcome:test:abc", found)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("a test login's leftover record (an older build) is dropped, never written", async () => {
    const key = "matrx:client:welcome.profile-pending:signup_welcome:test:abc";
    localStorage.setItem(key, JSON.stringify({ ownerId: "owner-1", found, at: "2026-10-16T00:00:00Z" }));
    expect(await resumeWelcomeProfiles("owner-1")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe("a Workspace site shown to be theirs vouches; its accounts still need a second host", () => {
  const social = (sourceUrl: string, kind: string) =>
    parseEvidenceItem({
      key: "social:twitter:adaexample",
      field: "social",
      value: "https://twitter.com/adaexample",
      url: "https://twitter.com/adaexample",
      handle: "adaexample",
      platform: "twitter",
      label: null,
      source: { url: sourceUrl, kind, node: kind === "website" ? "page" : "avatars", where: "x" },
      confidence: 0.9,
      hits: [],
      engines: [],
      same_as: [],
    });
  const NAME = customItem("name", "Ada Example");
  const grid = (raw: ReturnType<typeof social>[]) => {
    const all = [NAME, ...raw.filter((i): i is NonNullable<typeof i> => i !== null)];
    return personCards({
      items: [...mergeEvidence(new Map(), all).values()],
      witnesses: addWitnesses(new Map(), all),
      facts: [],
      decisions: { [NAME.key]: "preferred" },
      typedWebsiteKey: "website:adaexample.com",
      name: "Ada Example",
    });
  };

  it("linked from the vouched site only: not sure", () => {
    expect(grid([social("https://adaexample.com/about/", "website")]).accounts).toEqual([]);
  });

  it("linked from the vouched site AND read on its own host: certain", () => {
    const cards = grid([social("https://adaexample.com/about/", "website"), social("https://twitter.com/adaexample", "social_profile")]);
    expect(cards.accounts.map((a) => a.handle)).toEqual(["adaexample"]);
  });
});
