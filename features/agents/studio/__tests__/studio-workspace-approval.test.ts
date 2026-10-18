/**
 * 2026-10-18 adversarial review: "The result you approved" held the assistant's chat reply ("Done. Customer
 * name and appliance are now inputs…") and the workspace had no name after 23 messages. The press approves
 * the deliverable; the name follows from the goal.
 */
import { approvalText, deliverableFrom, emptyWorkspace, nameFromGoal, personSetText } from "../workspace";

const REPLY = [
  "Done. Customer name and appliance are now inputs you fill in each time. Here's the reply:",
  "",
  "---",
  "",
  "Hi [Customer name],",
  "",
  "Sorry your washer stopped draining! Yes, we can come this week.",
  "",
  "Thanks!",
  "The Appliance Repair team",
  "",
  "---",
  "",
  "Want to try it on another real message?",
].join("\n");

describe("what the press approves", () => {
  it("takes the deliverable between the rules, never the lead-in or the follow-up", () => {
    const out = deliverableFrom(REPLY);
    expect(out.startsWith("Hi [Customer name],")).toBe(true);
    expect(out).toContain("The Appliance Repair team");
    expect(out).not.toContain("Done.");
    expect(out).not.toContain("Want to try");
  });

  it("takes the largest fenced block, else the whole answer", () => {
    expect(deliverableFrom("Here it is:\n```\nSELECT 1;\n```\nAnything else?")).toBe("SELECT 1;");
    expect(deliverableFrom("Just a plain answer.")).toBe("Just a plain answer.");
  });

  it("prefers the draft the assistant recorded", () => {
    expect(approvalText({ ...emptyWorkspace(), draft: "Hi Sam, yes." }, REPLY)).toBe("Hi Sam, yes.");
    expect(approvalText(emptyWorkspace(), REPLY).startsWith("Hi [Customer name],")).toBe(true);
  });
});

describe("the name follows from the goal", () => {
  const goal =
    "Draft short, friendly replies to customer repair inquiries for Coast Appliance Repair, confirming we can help.";

  it("reads the goal's first clause (same rule as the server)", () => {
    expect(nameFromGoal(goal)).toBe("Draft short, friendly replies to customer repair inquiries");
    expect(nameFromGoal("  ")).toBeNull();
    expect(
      nameFromGoal(
        "Write a short, warm reply to an Etsy buyer's question about a Willow Creek Leather Co product (here: monogramming a bifold wallet).",
      ),
    ).toBe("Write a short, warm reply to an Etsy buyer's question");
  });

  it("fills an empty name when the person writes the goal, and never replaces their own name", () => {
    const ws = personSetText(emptyWorkspace(), "goal", goal);
    expect(ws.title).toBe("Draft short, friendly replies to customer repair inquiries");
    expect(ws.by.title).toBe("code");
    const named = personSetText(personSetText(emptyWorkspace(), "title", ""), "goal", goal);
    expect(named.title).toBe("");
  });
});
