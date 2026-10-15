import { collidingLabelSuffixes, roomCountText, splitRooms } from "../presence";

const room = (kind: string | null, lastMessageAt: string | null = null) => ({
  conversation: { metadata: kind ? { kind } : {} },
  lastMessageAt,
});

describe("splitRooms: the one split every hub count uses", () => {
  const rooms = [
    room("agent_room"),
    room("agent_pair", "2026-10-15T10:00:00Z"),
    room("agent_direct", "2026-10-15T10:00:00Z"),
    room("agent_direct"), // unwritten direct line: reached through its session
    room("agent_review"),
    room("agent_review"),
    room(null),
  ];
  const split = splitRooms(rooms);

  it("every room lands in exactly one bucket", () => {
    expect(split.listed.length + split.review.length + split.unwritten.length).toBe(rooms.length);
    expect(split.listed).toHaveLength(4);
    expect(split.review).toHaveLength(2);
    expect(split.unwritten).toHaveLength(1);
  });

  it("the summary says the sidebar's numbers, never the raw total", () => {
    // The 2026-10-15 walk: "963 rooms" beside "Rooms 24 + Review rooms 926".
    expect(roomCountText(split, true)).toBe("4 rooms · 2 review rooms");
    expect(roomCountText(split, true)).not.toContain(String(rooms.length));
    expect(roomCountText(split, false)).toBe("4+ rooms · 2+ review rooms");
    expect(roomCountText(splitRooms([room("agent_room")]), true)).toBe("1 room");
  });
});

describe("collidingLabelSuffixes", () => {
  const s = (id: string, title = "Claude Code session", workspace: string | null = "agent-mail-live-test") => ({
    id,
    title,
    provider: "claude_code",
    workspace,
  });

  it("ten identical labels become ten distinguishable labels", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `a5851de2-e4c8-4755-8dce-${String(i).padStart(12, "0")}`);
    const out = collidingLabelSuffixes(ids.map((id) => s(id)));
    expect(out.size).toBe(10);
    expect(new Set(out.values()).size).toBe(10);
  });

  it("unique labels get no suffix; same title in another workspace is already distinct", () => {
    const out = collidingLabelSuffixes([s("11111111-0000"), s("22222222-0000", "Other"), s("33333333-0000", "Claude Code session", "elsewhere")]);
    expect(out.size).toBe(0);
  });

  it("a short prefix is used when it already tells them apart", () => {
    const out = collidingLabelSuffixes([s("abcdef12-0000"), s("123456ab-0000")]);
    expect(out.get("abcdef12-0000")).toBe("abcdef");
    expect(out.get("123456ab-0000")).toBe("123456");
  });
});
