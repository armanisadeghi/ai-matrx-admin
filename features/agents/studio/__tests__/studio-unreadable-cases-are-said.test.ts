/**
 * Review F-5A-2 (2026-10-21): a build whose `sample_inputs` does not parse used to read as "no
 * cases" (`catch { return null }` / `catch { return [] }`). The failure is now RETURNED by the one
 * parse (`sampleInputsError`) and raised by the page in an effect, after mount - the case readers
 * run during render, and a toast raised there updates the Toaster mid-render ("Cannot update a
 * component while rendering a different component").
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const toastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { sampleInputsError, studioCaseFromBuild, studioCasesFromBuild } from "../studio-state";
import type { FactoryBuildState } from "@/features/agents/factory/types";

const build = (sample_inputs: string) => ({ request: { spec: { sample_inputs } } }) as unknown as FactoryBuildState;
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

beforeEach(() => toastError.mockClear());

describe("unparseable sample_inputs", () => {
  it("is returned as an error value and never raised while the readers run (render)", () => {
    expect(sampleInputsError(build("{not json"))).toEqual(expect.any(String));
    expect(studioCaseFromBuild(build("{not json"))).toBeNull();
    expect(studioCasesFromBuild(build("{not json"), "chat")).toEqual([]);
    expect(toastError).not.toHaveBeenCalled();
  });
  it("valid or absent sample_inputs has no error", () => {
    expect(sampleInputsError(build("[]"))).toBeNull();
    expect(sampleInputsError(null)).toBeNull();
  });
  it("the page raises it once, inside an effect keyed on the error, not in the render body", () => {
    expect(read("studio-state.ts")).not.toMatch(/lib\/toast|toast\.\w+\(/);
    const page = read("components/AgentStudioPage.tsx");
    const at = page.indexOf('id: "studio-sample-inputs-unreadable"');
    expect(at).toBeGreaterThan(0);
    const before = page.slice(Math.max(0, at - 220), at);
    expect(before).toMatch(/useEffect\(\(\) => \{\s*if \(casesError\) \{\s*toast\.error/);
    expect(page.slice(at, at + 250)).toMatch(/\}, \[casesError\]\)/);
  });
});
