/** An email typed in any Smart Add box is an email (VISION Part 19), and it rides the address as `email`. */
import { emailIn, normalizeEmail } from "../emailInput";
import { parseSmartAddUrl, patchSmartAddSearch } from "../smartAddUrl";

describe("email input", () => {
  it("normalizes an email and refuses anything else", () => {
    expect(normalizeEmail(" mailto:Ian@TACODA.dev ")).toBe("Ian@tacoda.dev");
    expect(normalizeEmail("tacoda.dev")).toBeNull();
    expect(normalizeEmail("@tacoda")).toBeNull();
    expect(normalizeEmail("ian at tacoda.dev")).toBeNull();
  });

  it("finds the email in whichever box holds it", () => {
    expect(emailIn("", "https://github.com/x", "chris@cmbuckley.co.uk")).toBe("chris@cmbuckley.co.uk");
    expect(emailIn("Ian Johnson", "Austin")).toBeNull();
  });

  it("rides the address as email=", () => {
    const search = patchSmartAddSearch("", { name: "Ian Johnson", email: "ian@tacoda.dev" });
    expect(search.get("email")).toBe("ian@tacoda.dev");
    expect(parseSmartAddUrl("/marketing/brands/smart-add/person", search).prefill.email).toBe("ian@tacoda.dev");
  });
});
