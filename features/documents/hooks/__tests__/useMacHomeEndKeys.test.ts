import { Direction } from "@univerjs/core";
import { MoveCursorOperation, MoveSelectionOperation } from "@univerjs/docs-ui";
import { KeyCode, MetaKeys } from "@univerjs/ui";

import { macHomeEndShortcuts } from "../useMacHomeEndKeys";

describe("Home and End are bound on a Mac (Univer binds them for Windows and Linux only)", () => {
  const rows = macHomeEndShortcuts();
  const find = (binding: number) => rows.find((r) => r.mac === binding);
  it("Home moves to the line start and End to the line end", () => {
    expect(find(KeyCode.HOME)).toMatchObject({ id: MoveCursorOperation.id, staticParameters: { direction: Direction.LEFT, granularity: "line" } });
    expect(find(KeyCode.END)).toMatchObject({ id: MoveCursorOperation.id, staticParameters: { direction: Direction.RIGHT, granularity: "line" } });
  });
  it("Shift+Home / Shift+End extend the selection to the line edge", () => {
    expect(find(KeyCode.HOME | MetaKeys.SHIFT)).toMatchObject({ id: MoveSelectionOperation.id, staticParameters: { direction: Direction.LEFT, granularity: "line" } });
    expect(find(KeyCode.END | MetaKeys.SHIFT)).toMatchObject({ id: MoveSelectionOperation.id, staticParameters: { direction: Direction.RIGHT, granularity: "line" } });
  });
});
