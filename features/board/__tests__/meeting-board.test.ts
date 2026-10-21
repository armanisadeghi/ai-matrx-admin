// A meeting's board is a SAVED board: the viewer's own boards row
// linked by settings.meeting_id. These cases drive the real service against a
// recorded fake of the table, and fail when the link, the seed or the
// one-at-a-time rule breaks.

type Call = { op: string; args: unknown[] };
const calls: Call[] = [];
let existing: unknown[] = [];
/** Set to simulate the unique index refusing the insert: the winner appears for the re-read. */
let refuseInsert: unknown[] | null = null;

function chain(result: () => unknown) {
  const c: Record<string, unknown> = {};
  for (const op of ["select", "eq", "is", "contains", "order", "limit", "insert", "single"]) {
    c[op] = (...args: unknown[]) => {
      calls.push({ op, args });
      return c;
    };
  }
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject);
  return c;
}

const row = (over: Record<string, unknown>) => ({
  id: "b1",
  organization_id: "org1",
  title: "Weekly sync",
  description: null,
  camera: { x: 0, y: 0, z: 0.6 },
  nodes: [],
  edges: [],
  settings: {},
  version: 1,
  created_by: "u1",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  last_opened_at: null,
  ...over,
});

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/projectsDb", () => ({
  projectsDb: () => ({
    from: () => {
      let inserting: Record<string, unknown> | null = null;
      const c = chain(() => {
        if (inserting && refuseInsert) {
          existing = refuseInsert;
          refuseInsert = null;
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
        return inserting ? { data: row({ id: "new", ...inserting }), error: null } : { data: existing, error: null };
      });
      const insert = c.insert as (...a: unknown[]) => unknown;
      c.insert = (values: Record<string, unknown>) => {
        inserting = values;
        return insert(values);
      };
      return c;
    },
  }),
}));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "u1" }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: jest.fn(async (organizationId: string | null) => organizationId ?? "picked"),
}));
jest.mock("@/lib/organizations/orgBootstrapGate", () => ({ whenOrgBootstrapResolved: async () => undefined }));
jest.mock("@/features/trash/service", () => ({ restoreFromTrash: jest.fn() }));

import { getMeetingBoard, meetingIdOfSettings, settingsForCopy } from "../persistence/boardsService";
import { meetingNotesDocument } from "../items/meeting-items.logic";
import { meetingPartOf } from "../items/meeting-items.logic";

beforeEach(() => {
  calls.length = 0;
  existing = [];
  refuseInsert = null;
});

describe("getMeetingBoard", () => {
  it("opens the person's existing board for that meeting, found by settings.meeting_id", async () => {
    existing = [row({ id: "b7", settings: { meeting_id: "m1" } })];
    const board = await getMeetingBoard({ meetingId: "m1", title: "Weekly sync", organizationId: "org1", seed: meetingNotesDocument("m1") });
    expect(board.id).toBe("b7");
    expect(calls).toContainEqual({ op: "contains", args: ["settings", { meeting_id: "m1" }] });
    expect(calls).toContainEqual({ op: "eq", args: ["created_by", "u1"] });
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("creates it, linked and seeded with the meeting's notes, when there is none", async () => {
    const board = await getMeetingBoard({ meetingId: "m1", title: "Weekly sync", organizationId: "org1", seed: meetingNotesDocument("m1") });
    const insert = calls.find((c) => c.op === "insert")?.args[0] as Record<string, unknown>;
    expect(insert.settings).toEqual({ meeting_id: "m1" });
    expect(insert.organization_id).toBe("org1");
    expect(insert.title).toBe("Weekly sync");
    expect(meetingIdOfSettings(insert.settings as never)).toBe("m1");
    // The new board opens on the five parts of THIS meeting inside its frame.
    expect(board.doc.groups.map((g) => g.title)).toEqual(["Meeting notes"]);
    expect(board.doc.nodes.map((n) => meetingPartOf(n.source)?.meetingId)).toEqual(["m1", "m1", "m1", "m1", "m1"]);
  });

  it("two opens at once make ONE board", async () => {
    const seed = meetingNotesDocument("m1");
    const [a, b] = await Promise.all([
      getMeetingBoard({ meetingId: "m1", title: "Weekly sync", organizationId: "org1", seed }),
      getMeetingBoard({ meetingId: "m1", title: "Weekly sync", organizationId: "org1", seed }),
    ]);
    expect(a).toBe(b);
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(1);
  });

  it("a refused duplicate (the unique index) re-reads the winner instead of failing", async () => {
    // Another tab inserted between our read and our insert: the database refuses with 23505.
    refuseInsert = [row({ id: "winner", settings: { meeting_id: "m1" } })];
    const board = await getMeetingBoard({ meetingId: "m1", title: "Weekly sync", organizationId: "org1", seed: meetingNotesDocument("m1") });
    expect(board.id).toBe("winner");
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(1);
  });

  it("a copy of a meeting's board is an ordinary board", () => {
    expect(settingsForCopy({ meeting_id: "m1", home: true, theme: "dark" })).toEqual({ theme: "dark" });
  });
});

import { meetingPartNote } from "../items/meeting-items.logic";
import { meetingPartText, publishMeetingPartText } from "../items/meeting-part-text";
import { sendMeetingPartToNotes } from "../items/meeting-to-notes";

const createNote = jest.fn(async (input: { label: string; content: string }) => ({ id: "n1", ...input }));
jest.mock("@/features/notes/service/notesService", () => ({ createNote: (i: never) => createNote(i) }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org1" }));

describe("Send to Notes carries the part's content", () => {
  it("formats each part's text, empty when there is none", () => {
    const src = {
      notes: [{ text: "Ship the pilot" }],
      decisions: [{ text: "Use plan B" }],
      actionItems: [{ text: "Draft brief", assigneeDisplayName: "Dana" }],
      summary: { text: "We agreed on plan B." },
      transcript: [{ speaker: "Dana", text: "Hello all" }],
    };
    expect(meetingPartText("notes", src)).toBe("- Ship the pilot");
    expect(meetingPartText("actions", src)).toBe("- Draft brief (Dana)");
    expect(meetingPartText("summary", src)).toBe("We agreed on plan B.");
    expect(meetingPartText("transcript", src)).toBe("**Dana** Hello all");
    expect(meetingPartText("decisions", {})).toBe("");
  });

  it("the note holds the text, then the link back", () => {
    const note = meetingPartNote({ meetingId: "m 1", meetingTitle: "Weekly sync", part: "decisions", text: "- Use plan B" });
    expect(note.label).toBe("Decisions · Weekly sync");
    expect(note.content).toContain("- Use plan B");
    expect(note.content.indexOf("- Use plan B")).toBeLessThan(note.content.indexOf("](/meetings/m%201)"));
  });

  it("an empty part says so in one line", () => {
    expect(meetingPartNote({ meetingId: "m1", meetingTitle: "T", part: "summary", text: "" }).content).toContain("Summary: nothing yet.");
  });

  it("sending reads what the tile published and creates the note", async () => {
    publishMeetingPartText("m1", "notes", "- Ship the pilot");
    await sendMeetingPartToNotes({ kind: "entity", entity: "meeting_part", id: "m1", meta: { part: "notes" } }, "Notes");
    const input = createNote.mock.calls[0][0];
    expect(input.content).toContain("- Ship the pilot");
    expect(input.content).toContain("](/meetings/m1)");
  });
});
