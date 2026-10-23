/**
 * EVERY HR DOOR IS CALLED IN THE SCHEMA IT LIVES IN (2026-10-22). The transport moved every door to
 * `supabase.schema("hr")`, but `hr_my_context`, `hr_employee_profile` and `hr_break_glass` exist only
 * in `public`: PostgREST answered PGRST202 and /hr said "Your HR employers could not be loaded" for
 * everyone. The compile-time half (a door name absent from `hr` fails type-check unless listed in
 * `HR_DOORS_IN_PUBLIC`) is proven by type-check; this pins the runtime routing.
 *
 * RED before: `fetchHrContext` went through `schema("hr")`.
 */
const rpc = jest.fn(async () => ({ data: { employers: [], active: null, as_of: "2026-10-22" }, error: null }));
const hrRpc = jest.fn(async () => ({ data: {}, error: null }));
const schema = jest.fn(() => ({ rpc: hrRpc }));
jest.mock("@/utils/supabase/client", () => ({ supabase: { rpc, schema } }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { fetchHrContext, fetchHrEmployeeProfile, fetchHrDirectory } = require("../service") as typeof import("../service");
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  rpc.mockClear();
  hrRpc.mockClear();
  schema.mockClear();
});

it("the employers read (/hr landing) goes to public, where hr_my_context lives", async () => {
  await fetchHrContext(null);
  expect(rpc).toHaveBeenCalledWith("hr_my_context", { p_organization_id: null });
  expect(hrRpc).not.toHaveBeenCalled();
});

it("the employee profile goes to public, where hr_employee_profile lives", async () => {
  await fetchHrEmployeeProfile({ employeeId: "11111111-2222-4333-8444-555555555555" } as Parameters<typeof fetchHrEmployeeProfile>[0]);
  expect(rpc.mock.calls[0]?.[0]).toBe("hr_employee_profile");
  expect(hrRpc).not.toHaveBeenCalled();
});

it("a door that lives in hr still goes to hr", async () => {
  await fetchHrDirectory({ organizationId: "11111111-2222-4333-8444-555555555555" });
  expect(schema).toHaveBeenCalledWith("hr");
  expect(hrRpc.mock.calls[0]?.[0]).toBe("hr_directory_list");
  expect(rpc).not.toHaveBeenCalled();
});
