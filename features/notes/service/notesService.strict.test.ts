const schema = jest.fn();
const requireUserId = jest.fn();
const listForSources = jest.fn();
const setTargets = jest.fn();

jest.mock("@/utils/supabase/client", () => ({ supabase: { schema } }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId }));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { listForSources, setTargets },
}));

import type { Note } from "../types";
import { updateNote } from "./notesService";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const HOME_ID = "33333333-3333-4333-8333-333333333333";

function noteRow(overrides: Partial<Note> = {}): Note {
  return {
    id: NOTE_ID,
    content: "",
    content_preview: "",
    content_hash: null,
    created_at: "2026-09-12T00:00:00.000Z",
    created_by: "user-1",
    custom_fields: {},
    deleted_at: null,
    file_path: null,
    home_scope_id: HOME_ID,
    label: "New Note",
    last_device_id: null,
    metadata: {},
    organization_id: ORGANIZATION_ID,
    position: 0,
    project_id: null,
    sync_version: 0, search_engine_indexed: null, shown_to: null,
    tags: [],
    task_id: null,
    updated_at: "2026-09-12T00:00:00.000Z",
    updated_by: null,
    version: 1,
    published_to_web: false,
    published_to_web_at: null,
    published_to_web_by: null,
    ...overrides,
  };
}

function query(result: unknown) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    maybeSingle: jest.fn(),
    update: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(result);
  return chain;
}

describe("notesService persisted-update boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireUserId.mockReturnValue("user-1");
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    setTargets.mockResolvedValue({ ok: true });
  });

  it("rejects an organization change before any note read or mutation", async () => {
    const existing = query({ data: { organization_id: ORGANIZATION_ID }, error: null });
    const from = jest.fn().mockReturnValue(existing);
    schema.mockReturnValue({ from });

    // External clients can bypass TypeScript, so the service must still reject
    // this malformed persisted relationship at runtime.
    const untypedUpdate = JSON.parse('{"organization_id":"44444444-4444-4444-8444-444444444444"}');
    await expect(updateNote(NOTE_ID, untypedUpdate)).rejects.toThrow(/another organization/i);

    expect(from).not.toHaveBeenCalled();
    expect(existing.update).not.toHaveBeenCalled();
  });

  it("writes only the edited fields, scoped to the note's own organization", async () => {
    const existing = query({ data: { organization_id: ORGANIZATION_ID }, error: null });
    const write = query({ data: noteRow({ label: "Edited" }), error: null });
    const from = jest.fn().mockReturnValueOnce(existing).mockReturnValueOnce(write);
    schema.mockReturnValue({ from });

    await updateNote(NOTE_ID, { label: "Edited" });

    expect(write.update).toHaveBeenCalledWith({ label: "Edited" });
    expect(write.eq).toHaveBeenCalledWith("organization_id", ORGANIZATION_ID);
  });
});
