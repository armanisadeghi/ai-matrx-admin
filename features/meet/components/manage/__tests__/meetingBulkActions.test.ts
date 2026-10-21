/** @jest-environment jsdom */
import { buildMeetingBulkActions } from "../meetingBulkActions";

jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const meeting = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, title: `Meeting ${id}`, deletedAt: null, cancelledAt: null, endedAt: null, recurrenceRule: null, ...extra }) as never;

const selectionOf = (rows: unknown[]) => ({
  mode: "ids" as const,
  ids: (rows as { id: string }[]).map((r) => r.id),
  rows: rows as never[],
  count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} } as never,
});

function build(roles: Record<string, "host" | "cohost" | "invitee">) {
  const actions = {
    ready: true,
    respond: jest.fn().mockResolvedValue({}),
    cancel: jest.fn().mockResolvedValue(undefined),
    announce: jest.fn().mockResolvedValue(true),
    repository: { invitees: jest.fn().mockResolvedValue([{ id: "g1" }]) },
  };
  const list = buildMeetingBulkActions({
    actions: actions as never,
    roles: new Map(Object.entries(roles)),
  });
  return { actions, byId: (id: string) => list.find((a) => a.id === id)! };
}

describe("meeting bulk twins", () => {
  it("rsvp asks one answer and answers only meetings you are invited to", async () => {
    const { actions, byId } = build({ a: "invitee", b: "host", c: "invitee" });
    const rsvp = byId("rsvp");
    const rows = [meeting("a"), meeting("b"), meeting("c", { cancelledAt: "2026-01-01" })];
    const confirm = rsvp.confirm!(selectionOf(rows) as never);
    expect(confirm?.ask?.kind).toBe("choice");
    await rsvp.run(selectionOf(rows) as never, { value: "tentative" });
    expect(actions.respond).toHaveBeenCalledTimes(1);
    expect(actions.respond).toHaveBeenCalledWith("a", "tentative");
  });

  it("cancel names the guests emailed, and cancels + announces per meeting", async () => {
    const { actions, byId } = build({ a: "host", b: "invitee" });
    const cancel = byId("cancel-meeting");
    const rows = [meeting("a"), meeting("b")];
    expect(cancel.confirm!(selectionOf(rows) as never)?.description).toMatch(/emailed a cancellation/);
    await cancel.run(selectionOf(rows) as never, { reason: "weather" });
    expect(actions.cancel).toHaveBeenCalledTimes(1);
    expect(actions.cancel.mock.calls[0][1]).toBe("weather");
    expect(actions.announce).toHaveBeenCalledWith("a", true);
  });
});
