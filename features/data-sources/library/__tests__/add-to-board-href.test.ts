import { addToBoardHref } from "@/features/board/boards/AddToBoardRedirect";

describe("Add to a board (from a Data library fetch)", () => {
  it("carries the record id to the board, which places a tile bound to it", () => {
    expect(addToBoardHref("b1", "data-table", "t 1")).toBe("/board/b1?add=data-table&id=t%201");
    expect(addToBoardHref("b1", "data-table")).toBe("/board/b1?add=data-table");
  });
});
