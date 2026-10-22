/**
 * 2026-10-22 browser walk: a canceled run had no way to continue, and the runs list footer
 * ("All loaded / 1-7 of 7") overlapped the open run's summary bar because <main> was squeezed to
 * the scroll owner's height (a row-flex stretch), collapsing the runs table onto the panel.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("server-only", () => ({}));
import { runCanResume } from "../components/AgentTestPage";

describe("resume", () => {
  it("is offered on paused and canceled runs, not on live or finished ones", () => {
    expect(runCanResume("cancelled")).toBe(true);
    expect(runCanResume("paused_limit")).toBe(true);
    expect(runCanResume("running")).toBe(false);
    expect(runCanResume("succeeded")).toBe(false);
  });
});

describe("the page's scroll chain", () => {
  const src = readFileSync(join(__dirname, "../components/AgentTestPage.tsx"), "utf8");
  it("lets <main> keep its content height inside the scrolling row, so the runs table never collapses onto the panel", () => {
    const main = /<main className="([^"]*)"/.exec(src)?.[1] ?? "";
    expect(main).toContain("shrink-0");
    expect(main).toContain("lg:self-start");
  });
});
