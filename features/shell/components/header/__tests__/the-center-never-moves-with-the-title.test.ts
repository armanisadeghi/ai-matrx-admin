import { routeHeaderColumns, titleTrack } from "../RouteHeader";

// 2026-10-22, chat-switch-stability: switching between chats whose titles differ in width moved
// the header's center cell (and the Chat · Work · Advanced switch with it) because the title's
// track was `fit-content`. Once the switch fits at the true center, the title's track is fixed, so
// the columns are the same string for a short title and a long one.
describe("the center control never moves with the title", () => {
  const total = 953;
  const right = 155;
  const navFull = 191;
  const navMin = 96;
  it("a short title and a long title get the same columns", () => {
    const shortTitle = titleTrack(total, right, navFull, navMin, 60);
    const longTitle = titleTrack(total, right, navFull, navMin, 88);
    const pad = { left: 0, right: 207 };
    expect(routeHeaderColumns(pad, shortTitle)).toBe(routeHeaderColumns(pad, longTitle));
    expect(routeHeaderColumns(pad, shortTitle)).toBe("365px minmax(0, 1fr) auto");
  });
  it("without a centered face the title keeps its natural width up to the trigger's cap", () => {
    const track = titleTrack(400, 300, 191, 46, 88);
    expect(track.fixed).toBe(false);
    expect(routeHeaderColumns({ left: 0, right: 0 }, track)).toMatch(/^(auto|fit-content\(\d+px\)) /);
  });
  it("before the first measurement the center is centered by CSS alone", () => {
    expect(routeHeaderColumns(null, { max: 365, fixed: true })).toBe(
      "minmax(max-content, 1fr) auto minmax(max-content, 1fr)",
    );
  });
});
