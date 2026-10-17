import { checkedPhone, emailVerdictWords, foundEmailWords, lookupHelp, nextSteps, partyToKeep, planLookup } from "../lookupPlan";

describe("planLookup: the one box picks the Tool", () => {
  it("reads a website, a link, an email, a phone and a person at a website", () => {
    expect(planLookup("zingermans.com")).toMatchObject({ jobKey: "company_profile", inputs: { domain: "zingermans.com" } });
    expect(planLookup("https://www.zingermans.com/about")).toMatchObject({ jobKey: "company_profile", inputs: { domain: "zingermans.com" } });
    expect(planLookup("Ari@Zingermans.com")).toMatchObject({ jobKey: "email_verify", inputs: { email: "ari@zingermans.com" } });
    expect(planLookup("+1 734 555 0100")).toMatchObject({ jobKey: "phone_check", inputs: { phone: "+1 734 555 0100" } });
    expect(planLookup("ari weinzweig at zingermans.com")).toMatchObject({
      jobKey: "people_work_email",
      inputs: { first_name: "Ari", last_name: "Weinzweig", domain: "zingermans.com" },
    });
    expect(planLookup("Ari Weinzweig zingermans.com")?.jobKey).toBe("people_work_email");
  });
  it("never guesses: a bare name or a keyword has no plan and says what to add", () => {
    expect(planLookup("Ari Weinzweig")).toBeNull();
    expect(planLookup("backlinks")).toBeNull();
    expect(planLookup("")).toBeNull();
    expect(lookupHelp("Ari Weinzweig")).toMatch(/website/);
    expect(lookupHelp("zingermans.com")).toBeNull();
  });
});

describe("found is not verified", () => {
  const found = { __kind: "work_email", email: "ari@zingermans.com", first_name: "Ari", last_name: "Weinzweig", domain: "zingermans.com", verification: "valid" };
  it("a finder's own claim never reads as confirmed", () => {
    expect(foundEmailWords(found)).toBe("Found, not confirmed yet");
  });
  it("only a good email check reads as confirmed", () => {
    expect(emailVerdictWords({ __kind: "email_verdict", email: "a@b.co", result: "ok" })?.tone).toBe("good");
    expect(emailVerdictWords({ __kind: "email_verdict", email: "a@b.co", result: "catch_all" })?.tone).toBe("warn");
    expect(emailVerdictWords({ __kind: "email_verdict", email: "a@b.co", result: "invalid" })?.tone).toBe("bad");
    expect(emailVerdictWords({ __kind: "email_verdict", email: "a@b.co", result: "error" })).toBeNull();
    expect(emailVerdictWords(found)).toBeNull();
  });
  it("never attaches a found address to the CRM until a check confirmed that very address", () => {
    const unconfirmed = partyToKeep(found);
    expect(unconfirmed).toMatchObject({ kind: "person", displayName: "Ari Weinzweig", emails: [], unconfirmedEmail: "ari@zingermans.com" });
    expect(unconfirmed?.note).toMatch(/waits until a check/);
    expect(partyToKeep(found, { confirmedEmail: "someone@else.com" })?.emails).toEqual([]);
    expect(partyToKeep(found, { confirmedEmail: "ARI@zingermans.com" })).toMatchObject({ emails: ["ari@zingermans.com"], unconfirmedEmail: null });
  });
  it("falls back to what the person typed when the source left the name out", () => {
    const bare = { __kind: "work_email", email: "ari@zingermans.com" };
    const kept = partyToKeep(bare, { inputs: { first_name: "Ari", last_name: "Weinzweig", domain: "zingermans.com" } });
    expect(kept).toMatchObject({ displayName: "Ari Weinzweig", attributes: { works_at_domain: "zingermans.com" } });
    // The party table refuses a website on a person (check party_org_facet): it must never be sent as one.
    expect(kept?.primaryDomain).toBeUndefined();
    expect(partyToKeep(bare)).toBeNull();
  });
});

describe("company answers and next steps", () => {
  const company = { __kind: "company_profile", name: "Zingerman's", domain: "zingermans.com", phone: "+1 734 663 3354", industry: "Food", employees: 600 };
  it("offers each next step as a button with its box filled", () => {
    expect(nextSteps(company)).toEqual([
      { label: "Find emails at this company", jobKey: "company_emails", inputs: { domain: "zingermans.com" } },
      { label: "Check its phone number", jobKey: "phone_check", inputs: { phone: "+1 734 663 3354" } },
    ]);
    expect(nextSteps({ __kind: "work_email", email: "a@b.co" })).toEqual([{ label: "Check this email", jobKey: "email_verify", inputs: { email: "a@b.co" } }]);
    expect(nextSteps({ __kind: "phone_check", valid: true })).toEqual([]);
    expect(
      nextSteps({ __kind: "email_candidates", emails: [{ email: "a@b.co", first_name: "Ann", last_name: "Lee" }, { email: "c@b.co" }, { email: "d@b.co" }, { email: "e@b.co" }] }).map((s) => s.label),
    ).toEqual(["Check Ann Lee", "Check c@b.co", "Check d@b.co"]);
  });
  it("keeps a company and its profile facts; its phone waits for a phone check", () => {
    expect(partyToKeep(company)).toMatchObject({
      kind: "organization",
      displayName: "Zingerman's",
      primaryDomain: "zingermans.com",
      phones: [],
      unconfirmedPhone: "+1 734 663 3354",
      emails: [],
      attributes: { company_profile: { industry: "Food", employees: 600, phone: "+1 734 663 3354" } },
    });
    expect(partyToKeep(company, { confirmedPhone: "+17346633354" })?.phones).toEqual(["+1 734 663 3354"]);
    expect(partyToKeep(company, { confirmedPhone: "+1 999 000 0000" })?.phones).toEqual([]);
    expect(checkedPhone({ __kind: "phone_check", valid: true, display_number: "+1 734 663 3354" })).toBe("+1 734 663 3354");
    expect(checkedPhone({ __kind: "phone_check", valid: false })).toBeNull();
    expect(partyToKeep({ __kind: "phone_check", valid: true })).toBeNull();
  });
});
