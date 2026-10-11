import { emptyDraft, newRecipient, sendBlockers } from "./model";

describe("sendBlockers — access code (verify A3, sender defect 3)", () => {
  const doc = { key: "d", file_id: "f", name: "Lease.pdf", page_count: 1 };
  it("asks for the code before Send when a recipient uses an access code without one set", () => {
    const r = newRecipient([], { full_name: "Bob", email: "b@example.com", verification: "access_code" });
    expect(sendBlockers({ ...emptyDraft("x"), documents: [doc], recipients: [r] })).toContain("Set an access code for Bob.");
  });
  it("is ready once the code is set, and never asks for an email-code recipient", () => {
    const set = newRecipient([], { full_name: "Bob", email: "b@example.com", verification: "access_code", has_access_code: true });
    const mail = newRecipient([set], { full_name: "Dee", email: "d@example.com", verification: "email_code" });
    expect(sendBlockers({ ...emptyDraft("x"), documents: [doc], recipients: [set, mail] })).toEqual([]);
  });
});

describe("access code is a real option", () => {
  const doc = { key: "d", file_id: "f", name: "Lease.pdf", page_count: 1 };
  it("names the recipient whose code is missing, and a member never needs one", () => {
    const r = newRecipient([], { full_name: "Bob Outside", email: "b@example.com", verification: "access_code" });
    const member = newRecipient([r], { full_name: "Mia", email: "m@example.com", user_id: "u1", verification: "access_code" });
    expect(sendBlockers({ ...emptyDraft("x"), documents: [doc], recipients: [r, member] })).toEqual(["Set an access code for Bob Outside."]);
  });
  it("a copy that lost its code asks again, and the choice is kept (never turned into an email code)", () => {
    const copied = newRecipient([], { full_name: "Bob", email: "b@example.com", verification: "access_code", has_access_code: false });
    expect(copied.verification).toBe("access_code");
    expect(sendBlockers({ ...emptyDraft("x"), documents: [doc], recipients: [copied] })).toContain("Set an access code for Bob.");
  });
});
