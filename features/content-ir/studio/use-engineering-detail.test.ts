/**
 * B4 (2026-10-15): class and function names ("StreamBlockAccumulator",
 * "variableDefinitionsToKindFields", "deferred to an RTL harness") showed to
 * every admin by default. Engineering detail needs the debug switch too.
 */
import { selectShowsEngineeringDetail } from "./use-engineering-detail";
import type { RootState } from "@/lib/redux/store";

const state = (isAdmin: boolean, isDebugMode: boolean) =>
  ({ userAuth: { isAdmin }, adminDebug: { isDebugMode } }) as unknown as RootState;

describe("selectShowsEngineeringDetail", () => {
  it("is off for an admin with the debug switch off — plain words by default", () => {
    expect(selectShowsEngineeringDetail(state(true, false))).toBe(false);
  });
  it("is off for a member, whatever the switch says", () => {
    expect(selectShowsEngineeringDetail(state(false, true))).toBe(false);
  });
  it("is on only for an admin who turned debug on", () => {
    expect(selectShowsEngineeringDetail(state(true, true))).toBe(true);
  });
});
