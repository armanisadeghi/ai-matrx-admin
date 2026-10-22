/**
 * Review F-5A-2 (2026-10-21): a build whose `sample_inputs` does not parse used to read as "no
 * cases" (`catch { return null }` / `catch { return [] }`). The failure is now said, once, with a
 * stable toast id; the functions still return the empty value so the page renders.
 */
const toastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { studioCaseFromBuild, studioCasesFromBuild } from "../studio-state";
import type { FactoryBuildState } from "@/features/agents/factory/types";

const build = (sample_inputs: string) => ({ request: { spec: { sample_inputs } } }) as unknown as FactoryBuildState;

beforeEach(() => toastError.mockClear());

describe("unparseable sample_inputs", () => {
  it("studioCaseFromBuild says so", () => {
    expect(studioCaseFromBuild(build("{not json"))).toBeNull();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][1]).toMatchObject({ id: "studio-sample-inputs-unreadable" });
  });
  it("studioCasesFromBuild says so", () => {
    expect(studioCasesFromBuild(build("{not json"), "chat")).toEqual([]);
    expect(toastError).toHaveBeenCalledTimes(1);
  });
  it("valid or absent sample_inputs stays quiet", () => {
    studioCasesFromBuild(build("[]"), "chat");
    studioCaseFromBuild(null);
    expect(toastError).not.toHaveBeenCalled();
  });
});
