/**
 * @jest-environment node
 */
/**
 * A CONVERSATION OF AN ARCHIVED ORGANIZATION IS NOT "SOMEONE ELSE'S".
 *
 * Live 2026-10-22 (admin@admin.com on her own conversation 971f6ff6-d82c-4cf0-a69b-394e3e2c122b): the
 * organization that holds it is archived, the `org_open_gate` policy hides every row of an archived
 * organization, and the resolver answered { level: none, is_owner: true, can_request: true }. The
 * screen said "You don't have access ... It belongs to someone else. You can ask for access below."
 * The resolver now also answers `organization_archived: {id, name}`; the words say the organization is
 * archived, name it, and offer no request.
 */
import { parsePayload } from "@/features/access-gate/service/accessDeniedContext";
import { archivedOrganizationExplanation, archivedOrganizationHeadline } from "@/features/access-gate/service/archivedWords";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/utils/supabase/claimsUser", () => ({ getClaimsUser: async () => null }));

// The resolver's exact answer on live for the conversation above, plus the new key.
const LIVE_ANSWER = {
  level: "none",
  owner: null,
  entity: { label: "Conversation", token: "conversation" },
  exists: true,
  deleted: false,
  request: null,
  ancestor: null,
  is_owner: true,
  disclosure: "kind_only",
  can_request: true,
  organization: null,
  organization_archived: { id: "dbaceae4-0ddb-43af-ae58-9e143ce6ad75", name: "Harbor Point Physical Therapy" },
};

describe("an archived organization is said as archived", () => {
  it("the parsed context carries the archived organization", () => {
    const context = parsePayload(LIVE_ANSWER, "conversation", "access-question");
    expect(context.organizationArchived).toEqual({ id: "dbaceae4-0ddb-43af-ae58-9e143ce6ad75", name: "Harbor Point Physical Therapy" });
  });

  it("the words name the organization and never say 'someone else' or offer to ask", () => {
    const context = parsePayload(LIVE_ANSWER, "conversation", "access-question");
    const said = `${archivedOrganizationHeadline(context)} ${archivedOrganizationExplanation(context)}`;
    expect(said).toContain("Harbor Point Physical Therapy");
    expect(said).toMatch(/archived/i);
    expect(said).not.toMatch(/someone else|ask for access|don't have access/i);
  });

  it("an answer without the key is unchanged", () => {
    const { organization_archived: _gone, ...plain } = LIVE_ANSWER;
    expect(parsePayload(plain, "conversation", "access-question").organizationArchived).toBeNull();
  });
});
