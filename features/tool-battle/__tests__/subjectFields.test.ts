import { coerce, inputFields, subjectLabel } from "../subjectFields";

const schema = {
  type: "object",
  required: ["domain"],
  properties: {
    domain: { type: "string", title: "Domain", "ui:example": "example.com" },
    limit: { type: "integer" },
    mode: { type: "string", enum: ["fast", "deep"] },
  },
};

describe("inputFields", () => {
  it("reads titles, requiredness, options and examples", () => {
    const f = inputFields(schema);
    expect(f.map((x) => x.key)).toEqual(["domain", "limit", "mode"]);
    expect(f[0]).toMatchObject({ title: "Domain", required: true, primary: true, example: "example.com" });
    expect(f[1]).toMatchObject({ type: "number", required: false, primary: false });
    expect(f[2].options).toEqual(["fast", "deep"]);
  });
});

describe("coerce / subjectLabel", () => {
  it("types numbers and drops empties", () => {
    const [domain, limit] = inputFields(schema);
    expect(coerce(limit, " 5 ")).toBe(5);
    expect(coerce(domain, "  ")).toBeUndefined();
    expect(subjectLabel({ domain: "https://www.acme.co/x" }, "Subject 1")).toBe("acme.co/x");
    expect(subjectLabel({}, "Subject 1")).toBe("Subject 1");
  });
});
