/**
 * A write refused inside an ARCHIVED organization (org_open_gate's bare 42501) shows the honest
 * sentence, never "new row violates row-level security policy". A live organization, or any other
 * error, keeps the caller's own message.
 */
const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ rpc }) },
}));

import {
  ARCHIVED_ORGANIZATION_WRITE_REFUSAL,
  archivedOrganizationWriteRefusal,
} from "../organizationArchive";

const RLS_REFUSAL = {
  code: "42501",
  message: 'new row violates row-level security policy for table "data_store_members"',
};

describe("archivedOrganizationWriteRefusal", () => {
  beforeEach(() => rpc.mockReset());

  it("says the organization is archived when it is", async () => {
    rpc.mockResolvedValue({ data: { known: true, archived: true }, error: null });
    await expect(archivedOrganizationWriteRefusal(RLS_REFUSAL, "org-1")).resolves.toBe(
      ARCHIVED_ORGANIZATION_WRITE_REFUSAL,
    );
    expect(rpc).toHaveBeenCalledWith("organization_archive_state", { p_org: "org-1" });
  });

  it("stays out of the way for a live organization", async () => {
    rpc.mockResolvedValue({ data: { known: true, archived: false }, error: null });
    await expect(archivedOrganizationWriteRefusal(RLS_REFUSAL, "org-1")).resolves.toBeNull();
  });

  it("never asks about an error that is not a refusal", async () => {
    await expect(
      archivedOrganizationWriteRefusal({ code: "23505", message: "duplicate" }, "org-1"),
    ).resolves.toBeNull();
    await expect(archivedOrganizationWriteRefusal(RLS_REFUSAL, null)).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
