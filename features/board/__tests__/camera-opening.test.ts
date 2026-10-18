import { BoardCameraStore, cameraIsUnreadable } from "../engine/camera-store";

// A phone cannot read a whole board at 5-15%: the first view opens on the first tile (top-left, one screen wide).
function open(size: { w: number; h: number }, rects: Array<{ x: number; y: number; w: number; h: number }>) {
  const store = new BoardCameraStore({ x: 0, y: 0, z: 0.6 });
  store.setSize(size);
  rects.forEach((r, i) => store.registerItem(`t${i}`, r));
  const fly = jest.spyOn(store, "flyTo").mockImplementation(() => undefined);
  store.fitOpening();
  return fly.mock.calls[0]?.[0];
}

const STUDIO = [
  { x: 1300, y: 0, w: 460, h: 420 },
  { x: 0, y: 0, w: 440, h: 168 },
  { x: 680, y: 0, w: 520, h: 640 },
];

describe("fitOpening", () => {
  it("on a phone opens on the first tile in reading order, readable and top-left", () => {
    const cam = open({ w: 375, h: 700 }, STUDIO)!;
    expect(cam.z).toBeGreaterThanOrEqual(0.5);
    expect(cam.x + 0 * cam.z).toBe(16); // the first tile's left edge sits one margin in
    expect(cam.y).toBe(16);
  });
  it("on a desktop view fits everything as before", () => {
    const cam = open({ w: 1400, h: 800 }, STUDIO)!;
    expect(cam.z).toBeGreaterThan(0.3);
    expect(cam.x).not.toBe(16);
  });
  it("on a phone a board that already fits readably keeps fit-all", () => {
    const cam = open({ w: 375, h: 700 }, [{ x: 0, y: 0, w: 300, h: 300 }])!;
    expect(cam.z).toBeGreaterThan(0.5);
  });
});

// SHIFT: the opening view is a jump behind a hidden world, never a flight over painted tiles (the browser
// measures tiles painted at the default camera and then flown as one 0.34 layout shift). Fails against a
// fitOpening that always flies.
describe("fitOpening(instant)", () => {
  it("sets the camera in one write and starts no flight", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    store.setSize({ w: 1400, h: 800 });
    STUDIO.forEach((r, i) => store.registerItem(`t${i}`, r));
    const fly = jest.spyOn(store, "flyTo");
    store.fitOpening(48, true);
    expect(fly).not.toHaveBeenCalled();
    expect(store.getCamera().z).toBeLessThan(1);
  });
});

describe("cameraIsUnreadable", () => {
  it("reopens a saved 27% view on a phone, never on a desktop", () => {
    expect(cameraIsUnreadable({ z: 0.27 }, { w: 375 })).toBe(true);
    expect(cameraIsUnreadable({ z: 0.27 }, { w: 1280 })).toBe(false);
  });
  it("keeps a readable phone view", () => {
    expect(cameraIsUnreadable({ z: 0.7 }, { w: 375 })).toBe(false);
  });
});

// A phone's page column is measured from the room the chrome leaves; when that room changes after load
// (an outline drawer closing), the page must hear it, or it keeps a too-narrow first column.
describe("setInsets", () => {
  it("tells frame listeners when the room changes, and only then", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    store.setSize({ w: 376, h: 700 });
    store.setInsets({ top: 0, right: 0, bottom: 0, left: 260 });
    const heard = jest.fn();
    store.subscribeFrame(heard);
    const narrow = store.pageViewWidth();
    store.setInsets({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(heard).toHaveBeenCalled();
    expect(store.pageViewWidth()).toBeGreaterThan(narrow);
    heard.mockClear();
    store.setInsets({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(heard).not.toHaveBeenCalled();
  });
});
