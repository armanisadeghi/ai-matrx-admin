/** An action is drawn at the width it last settled at, right-anchored, so a late sibling never nudges it (CLS at 1440 on /data/<table>). */
jest.mock("@/lib/sync/client-storage", () => ({ defineClientKeyFamily: () => ({ getJSON: () => null, setJSON: () => undefined, storageKey: () => "k" }) }));
import { reservedActionStyle, reservedActionWidth } from "../RouteHeader";

it("remembers a width per action key and falls back to the measured first visit", () => {
  expect(reservedActionWidth({ a: 120 }, "data-table:wide", "a")).toBe(120);
  expect(reservedActionWidth(null, "data-table:wide", ".0/.$access")).toBe(204);
  expect(reservedActionWidth(null, "other:wide", "x")).toBeUndefined();
});
it("reserves right-anchored room, and nothing when no width is known", () => {
  expect(reservedActionStyle(204)).toEqual({ minWidth: 204, justifyContent: "flex-end" });
  expect(reservedActionStyle(undefined)).toBeUndefined();
});
