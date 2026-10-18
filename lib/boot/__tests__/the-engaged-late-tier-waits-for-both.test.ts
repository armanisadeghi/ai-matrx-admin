/**
 * Owner rule 2026-10-17: informational reads wait for the page to settle AND for the person to
 * engage it. Settling alone (a page nobody touches) never opens them; an engagement before the page
 * settles waits for the settle.
 */
let idleResolve: (() => void) | null = null;
jest.mock("@ai-matrx/kit/idle-scheduler", () => ({
  whenPageIdle: () => new Promise<boolean>((resolve) => (idleResolve = () => resolve(true))),
}));

import { whenEngagedLate } from "@/lib/boot/engagedLate";
import { engageForTest, resetFirstEngagement } from "@/lib/boot/firstEngagement";

const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
  resetFirstEngagement();
  idleResolve = null;
});

it("a settled page nobody touches never opens the tier", async () => {
  let done = false;
  void whenEngagedLate(0).then(() => (done = true));
  await tick();
  idleResolve!();
  await tick();
  await tick();
  expect(done).toBe(false);
  engageForTest();
  await tick();
  expect(done).toBe(true);
});

it("an engagement before the page settles waits for the settle", async () => {
  let done = false;
  void whenEngagedLate(0).then(() => (done = true));
  engageForTest();
  await tick();
  expect(done).toBe(false);
  idleResolve!();
  await tick();
  await tick();
  expect(done).toBe(true);
});

it("an abort resolves false", async () => {
  const controller = new AbortController();
  const result = whenEngagedLate(0, controller.signal);
  await tick();
  idleResolve!();
  await tick();
  controller.abort();
  expect(await result).toBe(false);
});
