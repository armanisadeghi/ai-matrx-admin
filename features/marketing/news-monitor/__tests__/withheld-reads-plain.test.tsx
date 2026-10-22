/**
 * A withheld story's reason is plain words on the run view (2026-10-22): never a flag code like
 * "unreviewed_language:greek script" or "hard_safety_term:killed". The server's brand-safety
 * `describe` writes the words — the one place a flag becomes words; a run recorded before that
 * says it is older instead of printing codes.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import { SetAsideLists } from "../SetAsideLists";
import { OLDER_RUN_SAFETY_DETAIL, plainSafetyDetail, readSetAside, type RunParts } from "../run-document";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RAW = /hard_safety_term|unreviewed_language|profile_exclusion|death_injury|crime_harmful_acts|\w+ script\b/;

function parts(withheld: unknown[]): RunParts {
  return {
    runId: "r", nodeId: "n", summary: { counts: { safety_withheld: withheld.length } }, digest: null, report: null,
    triage: null, angleSets: [], verdicts: {}, clientContext: null, withheld, diagnostics: {}, rejected: [],
    preGated: [], notices: [], stages: [],
  };
}

describe("withheld reasons read as plain words", () => {
  it("shows the server's plain reason and never a raw flag code", () => {
    const lists = readSetAside(parts([
      { signal_id: "a", title: "Fire in Athens", reason: "safety",
        detail: "Not checked for safety: we can't read Greek yet" },
      { signal_id: "b", title: "Gunman kills 3", reason: "safety",
        detail: "Death or injury: “kills 3”; Violence or crime: “gunman”" },
      { signal_id: "c", title: "An older run", reason: "safety",
        detail: "unreviewed_language:greek script, hard_safety_term:killed" },
    ]));
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <SetAsideLists lists={lists} stories={new Map()} storyActions={() => null} initiallyOpen="withheld" />,
      ),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Not checked for safety: we can't read Greek yet");
    expect(text).toContain("Death or injury: “kills 3”; Violence or crime: “gunman”");
    expect(text).toContain(OLDER_RUN_SAFETY_DETAIL);
    expect(text).not.toMatch(RAW);
    act(() => root.unmount());
  });

  it("passes plain words through untouched and turns codes into the older-run line", () => {
    expect(plainSafetyDetail("Death or injury: “killed”")).toBe("Death or injury: “killed”");
    expect(plainSafetyDetail("hard_safety_term:killed")).toBe(OLDER_RUN_SAFETY_DETAIL);
    expect(plainSafetyDetail("")).toBeNull();
  });
});
