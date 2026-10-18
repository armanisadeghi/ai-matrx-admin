import { insertTextAtTextareaCursor } from "./text-insertion";

describe("insertTextAtTextareaCursor", () => {
  it("routes the complete next value through a controlled field callback", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "alpha omega";
    textarea.setSelectionRange(6, 6);
    const onValueChange = jest.fn();

    expect(
      insertTextAtTextareaCursor(textarea, "linked ", onValueChange),
    ).toBe(true);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("alpha linked omega");
  });

  it("mutates an uncontrolled field at its selected range", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "alpha omega";
    textarea.setSelectionRange(6, 11);

    expect(insertTextAtTextareaCursor(textarea, "linked")).toBe(true);

    expect(textarea.value).toBe("alpha linked");
    expect(textarea.selectionStart).toBe(12);
    expect(textarea.selectionEnd).toBe(12);
  });
});

// Q-06 real test (2026-10-17): the note's plain-mode Insert below / above
// spliced the block right at the selection's characters, splitting the line.
import { insertBlockAtLine } from "./text-insertion";

describe("insertBlockAtLine — Insert below / above follow the selection's line", () => {
  const NOTE = "Crew call confirmed for 06:00.\nDestination: Mexico City (CDMX)\nDock check: (pending)";
  const at = NOTE.indexOf("Mexico City");
  const end = at + "Mexico City".length;

  it("below a mid-line selection = under that line", () => {
    expect(insertBlockAtLine(NOTE, at, end, "Los Angeles", "after")).toBe(
      "Crew call confirmed for 06:00.\nDestination: Mexico City (CDMX)\n\nLos Angeles\nDock check: (pending)",
    );
  });

  it("above a mid-line selection = over that line", () => {
    expect(insertBlockAtLine(NOTE, at, end, "Los Angeles", "before")).toBe(
      "Crew call confirmed for 06:00.\nLos Angeles\n\nDestination: Mexico City (CDMX)\nDock check: (pending)",
    );
  });

  it("below the last line = at the end", () => {
    const p = NOTE.indexOf("pending");
    expect(insertBlockAtLine(NOTE, p, p + 7, "Done", "after")).toBe(`${NOTE}\n\nDone`);
  });
});
