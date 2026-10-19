/**
 * @jest-environment jsdom
 */
export {};
type Store = typeof import("./errorCaptureStore");
function loadPage(): Store {
  let mod!: Store;
  jest.isolateModules(() => {
    mod = jest.requireActual("./errorCaptureStore") as Store;
  });
  return mod;
}
function check(s: Store, where: string) {
  const list = s.getSnapshot();
  const st = s.getStatsSnapshot();
  const red = list.filter((e) => e.tier === "red").length;
  const orange = list.filter((e) => e.tier === "orange").length;
  const yellow = list.filter((e) => e.tier === "yellow").length;
  expect({ where, total: st.total, red: st.red, orange: st.orange, yellow: st.yellow }).toEqual({
    where, total: list.length, red, orange, yellow,
  });
}
beforeEach(() => window.sessionStorage.clear());
it("stats always equal the list through capture/dedupe/dismiss/clear/reload", () => {
  let s = loadPage();
  for (let i = 0; i < 8; i++) {
    s.captureError({ source: "supabase-postgrest", message: `e${i % 5}` });
    check(s, "capture");
  }
  s.dismissCapturedError(s.getSnapshot()[1].id);
  check(s, "dismiss");
  window.dispatchEvent(new Event("pagehide"));
  s = loadPage();
  check(s, "reload");
  s.dismissCapturedError(s.getSnapshot()[0].id);
  check(s, "dismiss-after-reload");
  s.clearCapturedErrors();
  check(s, "clear");
  window.dispatchEvent(new Event("pagehide"));
  s = loadPage();
  check(s, "reload-after-clear");
  expect(s.getSnapshot()).toHaveLength(0);
});
