/**
 * Someone a table was SHARED with (an Editor, not a member of the table's organization) presses
 * "Open as workbook". The workbook insert into the table's organization is refused by row-level
 * security — live on 2026-10-10 that raw refusal was the toast a member walk saw. The workbook now
 * goes to the person's own active organization instead; any other failure is still said as it is.
 */


const createWorkbook = jest.fn();
const peekSelectedOrganizationId = jest.fn();
jest.mock("@/lib/api/organization-admission", () => ({
  peekSelectedOrganizationId: () => peekSelectedOrganizationId(),
}));
jest.mock("@/features/workbooks/workbook-service", () => ({
  createWorkbook: (...a: unknown[]) => createWorkbook(...a),
  saveSnapshot: jest.fn(),
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@ai-matrx/data/db", () => ({ mergeJsonColumn: jest.fn() }));
jest.mock("@/features/data-tables/service", () => ({
  addTableColumn: jest.fn(),
  bulkWrite: jest.fn(),
  getCompleteTable: jest.fn(),
  readRelationWords: jest.fn(),
}));

import { createLinkedWorkbook } from "../link-service";

const CEDAR_RIDGE = "bb6fec2f-e635-40b0-8e78-5b610e8bc65e";
const GUEST_ORGANIZATION = "bf9328dc-794c-4b3b-94dd-918a496ef3e1";
const RLS = 'new row violates row-level security policy for table "udt_workbooks"';

beforeEach(() => {
  createWorkbook.mockReset();
  peekSelectedOrganizationId.mockReset();
  peekSelectedOrganizationId.mockReturnValue(GUEST_ORGANIZATION);
});

describe("Open as workbook from a table shared with you", () => {
  it("a member gets the workbook in the table's organization", async () => {
    createWorkbook.mockResolvedValueOnce({ success: true, data: { id: "wb-1" } });
    const made = await createLinkedWorkbook("Physio Follow-ups", CEDAR_RIDGE);
    expect(made).toEqual({ success: true, data: { id: "wb-1" } });
    expect(createWorkbook).toHaveBeenCalledTimes(1);
    expect(createWorkbook.mock.calls[0][0]).toMatchObject({ organizationId: CEDAR_RIDGE });
  });

  it("a guest refused in the table's organization gets it in their own active organization", async () => {
    createWorkbook
      .mockResolvedValueOnce({ success: false, error: RLS })
      .mockResolvedValueOnce({ success: true, data: { id: "wb-2" } });
    const made = await createLinkedWorkbook("Physio Follow-ups", CEDAR_RIDGE);
    expect(made).toEqual({ success: true, data: { id: "wb-2" } });
    expect(createWorkbook).toHaveBeenCalledTimes(2);
    expect(createWorkbook.mock.calls[1][0].organizationId).toBe(GUEST_ORGANIZATION);
  });

  it("does not guess a guest organization when none is selected", async () => {
    peekSelectedOrganizationId.mockReturnValue(null);
    createWorkbook.mockResolvedValueOnce({ success: false, error: RLS });
    const made = await createLinkedWorkbook("Physio Follow-ups", CEDAR_RIDGE);
    expect(made).toEqual({ success: false, error: "Select an organization before creating a workbook." });
    expect(createWorkbook).toHaveBeenCalledTimes(1);
  });

  it("any other failure is said as it is, never retried elsewhere", async () => {
    createWorkbook.mockResolvedValueOnce({ success: false, error: "not authenticated" });
    const made = await createLinkedWorkbook("Physio Follow-ups", CEDAR_RIDGE);
    expect(made).toEqual({ success: false, error: "not authenticated" });
    expect(createWorkbook).toHaveBeenCalledTimes(1);
  });
});
