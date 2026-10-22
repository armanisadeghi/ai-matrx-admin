/**
 * Run supply "Values seen" listed other screens' keys as this surface's own (W5-B):
 * on matrx-user/notes the rollup carries matrx-user/board::board_items and
 * window::<title> from screens that were open beside the notes page.
 */
import { splitRunSupplyKeys } from "../run-supply-keys";

describe("splitRunSupplyKeys", () => {
  const chain = ["matrx-default/default", "matrx-default/notes-module", "matrx-user/notes"];

  it("keeps plain keys and chain-qualified keys as this surface's own", () => {
    const { own, others } = splitRunSupplyKeys(
      ["note_title", "matrx-default/notes-module::module_scope", "matrx-user/notes::note_title"],
      chain,
    );
    expect(own).toEqual([
      { name: "note_title", via: null },
      { name: "module_scope", via: "matrx-default/notes-module" },
    ]);
    expect(others).toEqual([]);
  });

  it("moves other surfaces' and open windows' keys to the other-screens group", () => {
    const { own, others } = splitRunSupplyKeys(
      ["note_title", "matrx-user/board::board_items", "window::Cloud Computer Bugs"],
      chain,
    );
    expect(own.map((o) => o.name)).toEqual(["note_title"]);
    expect(others).toEqual([
      { surface: "matrx-user/board", name: "board_items" },
      { surface: null, name: "Cloud Computer Bugs" },
    ]);
  });
});
