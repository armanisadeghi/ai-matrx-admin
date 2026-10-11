import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import {
  addInstanceTab,
  markTabInteraction,
  setInstanceActiveTab,
} from "./slice";
import { copyNote } from "./thunks";

jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: jest.fn(),
}));

const single = jest.fn();
const select = jest.fn(() => ({ single }));
const insert = jest.fn(() => ({ select }));
const from = jest.fn(() => ({ insert }));
const schema = jest.fn((_name: string) => ({ from }));

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: (name: string) => schema(name) },
}));

const NOTE_ID = "11111111-1111-4111-8111-111111111111";
const COPY_ID = "22222222-2222-4222-8222-222222222222";
const ORG_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const INSTANCE_ID = "notes-test-instance";

describe("copyNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureOrgId).mockResolvedValue(ORG_ID);
    single.mockResolvedValue({
      data: {
        id: COPY_ID,
        label: "Original (Copy)",
        content: "Body",
        tags: [],
        organization_id: ORG_ID,
      },
      error: null,
    });
  });

  it("opens and focuses the duplicate in the invoking Notes instance", async () => {
    const dispatch = jest.fn((action) => action);
    const getState = () => ({
      userAuth: { id: USER_ID },
      notes: {
        notes: {
          [NOTE_ID]: {
            id: NOTE_ID,
            label: "Original",
            content: "Body",
            tags: [],
            organization_id: ORG_ID,
          },
        },
      },
    });

    const result = await copyNote({
      noteId: NOTE_ID,
      instanceId: INSTANCE_ID,
    })(dispatch, getState, undefined);

    expect(copyNote.fulfilled.match(result)).toBe(true);
    expect(schema).toHaveBeenCalledWith("workbench");
    expect(dispatch).toHaveBeenCalledWith(
      markTabInteraction({ instanceId: INSTANCE_ID }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      addInstanceTab({ instanceId: INSTANCE_ID, noteId: COPY_ID }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      setInstanceActiveTab({ instanceId: INSTANCE_ID, noteId: COPY_ID }),
    );
  });

  it("files the duplicate in the original's home and never writes a folder", async () => {
    const HOME_ID = "55555555-5555-4555-8555-555555555555";
    const dispatch = jest.fn((action) => action);
    const getState = () => ({
      userAuth: { id: USER_ID },
      notes: {
        notes: {
          [NOTE_ID]: {
            id: NOTE_ID,
            label: "Original",
            content: "Body",
            tags: [],
            organization_id: ORG_ID,
            home_scope_id: HOME_ID,
          },
        },
      },
    });

    await copyNote({ noteId: NOTE_ID, instanceId: INSTANCE_ID })(dispatch, getState, undefined);

    const written = (insert.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0];
    expect(written.home_scope_id).toBe(HOME_ID);
    expect(written.organization_id).toBe(ORG_ID);
    expect(written).not.toHaveProperty("folder_name");
    expect(written).not.toHaveProperty("folder_id");
  });
});
