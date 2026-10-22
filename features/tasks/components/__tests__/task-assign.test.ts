import { assignAsk, assignDisabledReason } from "../taskAssign";

const people = [
  { user_id: "u1", display_name: "Pat", email: "pat@x.co" },
  { user_id: "u2", display_name: null, email: "lee@x.co" },
];

describe("Assign to… never defaults to Nobody", () => {
  it("is off while the people list loads, and when it is empty", () => {
    expect(assignDisabledReason(true, [])).toBe("Loading people…");
    expect(assignDisabledReason(false, [])).toBe("No people to assign to");
    expect(assignDisabledReason(false, people)).toBeNull();
  });
  it("requires a pick: no default value, no Nobody option", () => {
    const ask = assignAsk(people);
    expect(ask.defaultValue).toBe("");
    expect(ask.options.map((o) => o.value)).toEqual(["u1", "u2"]);
    expect(ask.options.some((o) => /nobody|unassign/i.test(o.label))).toBe(false);
    expect(ask.options[1].label).toBe("lee@x.co");
  });
});
