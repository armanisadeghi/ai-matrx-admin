const schema = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema },
}));

import { createNote } from "./notesService";

describe("notes creation organization admission", () => {
  it("refuses a missing organization before any Supabase read or write", async () => {
    await expect(
      createNote({
        organization_id: "",
        content: "",
      }),
    ).rejects.toThrow(/organization/i);

    expect(schema).not.toHaveBeenCalled();
  });
});
