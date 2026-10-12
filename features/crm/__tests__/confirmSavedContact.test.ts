
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { confirmSavedContact } from "../confirmSavedContact";

describe("confirmSavedContact", () => {
  it("rejects an id that is in no table instead of letting a success toast through", async () => {
    await expect(
      confirmSavedContact("b263b0df-bdce-4fe8-ac62-b6261db73d4b", async () => null),
    ).rejects.toThrow(/not saved/i);
  });

  it("returns the stored row when it exists", async () => {
    const row = { id: "x", display_name: "Dana Whitfield" };
    await expect(confirmSavedContact("x", async () => row)).resolves.toEqual(row);
  });
});
