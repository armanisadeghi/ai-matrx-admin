import { chipText, givenLabel, optionText, otherFace } from "./model";

// Esign-parity signer-final: another signer's fields never print a raw value (I2), options and chips
// carry the sender's words (Minor 8, 9).

describe("otherFace — another signer's field on this page", () => {
  const radio = { kind: "radio" as const };
  it("shows a mark for the chosen option and nothing for the others, as boolean or as text", () => {
    expect(otherFace(radio, true, true, "MM/DD/YYYY")).toEqual({ kind: "check" });
    expect(otherFace(radio, "true", true, "MM/DD/YYYY")).toEqual({ kind: "check" });
    expect(otherFace(radio, false, true, "MM/DD/YYYY")).toEqual({ kind: "none" });
    expect(otherFace(radio, "false", true, "MM/DD/YYYY")).toEqual({ kind: "none" });
    expect(otherFace(radio, "", true, "MM/DD/YYYY")).toEqual({ kind: "none" });
    expect(otherFace({ kind: "checkbox" }, "false", true, "MM/DD/YYYY")).toEqual({ kind: "none" });
  });
  it("shows nothing before they sign, whatever the value", () => {
    for (const v of [true, false, "false", "x", null, ""]) expect(otherFace(radio, v, false, "MM/DD/YYYY")).toEqual({ kind: "none" });
    expect(otherFace({ kind: "text" }, "secret", false, "MM/DD/YYYY")).toEqual({ kind: "none" });
  });
  it("never prints null, undefined, empty or boolean text for any kind", () => {
    for (const kind of ["text", "number", "date", "dropdown", "email", "full_name", "signature", "initials"] as const) {
      for (const v of [null, undefined, "", "  ", false, true]) {
        const face = otherFace({ kind }, v, true, "MM/DD/YYYY");
        expect(face.kind === "text" ? face.text : "").not.toMatch(/^(null|undefined|true|false)$/);
        expect(face.kind).toBe("none");
      }
    }
  });
  it("shows real values after they sign", () => {
    expect(otherFace({ kind: "text" }, "Hello", true, "MM/DD/YYYY")).toEqual({ kind: "text", text: "Hello" });
    expect(otherFace({ kind: "dropdown" }, "B", true, "MM/DD/YYYY")).toEqual({ kind: "text", text: "B" });
    expect(otherFace({ kind: "date" }, "2026-10-07", true, "MM/DD/YYYY")).toEqual({ kind: "text", text: "10/07/2026" });
    expect(otherFace({ kind: "signature" }, "applied", true, "MM/DD/YYYY")).toEqual({ kind: "text", text: "Signed" });
  });
});

describe("labels", () => {
  it("an auto-name is not the sender's label", () => {
    expect(givenLabel({ kind: "text", label: "Text 2" })).toBeNull();
    expect(givenLabel({ kind: "radio", label: "Choice 1" })).toBeNull();
    expect(givenLabel({ kind: "number", label: "Number 3" })).toBeNull();
    expect(givenLabel({ kind: "text", label: "Phone number" })).toBe("Phone number");
  });
  it("a chip shows the label, and the kind only without one", () => {
    expect(chipText({ kind: "text", label: "Home address" })).toBe("Home address");
    expect(chipText({ kind: "number", label: "Number 1" })).toBe("Number");
    expect(chipText({ kind: "signature", label: "Signature 1" })).toBe("Sign here");
  });
  it("an option reads as the sender's label, else its value", () => {
    expect(optionText({ kind: "radio", label: "Yes, I agree", option_value: "yes" })).toBe("Yes, I agree");
    expect(optionText({ kind: "radio", label: "Choice 2", option_value: "no" })).toBe("no");
    expect(optionText({ kind: "radio", label: "Choice 2", option_value: null })).toBeNull();
  });
});
