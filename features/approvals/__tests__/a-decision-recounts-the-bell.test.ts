/**
 * FORCING TEST — the bell reads ["shell-counts", uid], a sibling of every older key a writer
 * settles. A decision (the record store's change approval included) goes through
 * `invalidateApprovals`, so that call must mark the shell counts stale too.
 */
import { QueryClient } from "@tanstack/react-query";
import { invalidateApprovals } from "../queryKeys";
import { SHELL_COUNTS_QUERY_KEY, invalidateShellCounts } from "@/lib/boot/shellCountsKey";

function seeded() {
  const client = new QueryClient();
  client.setQueryData([...SHELL_COUNTS_QUERY_KEY, "user-1"], { inbox: 1 });
  client.setQueryData(["approvals", "store_change", "user-1"], []);
  return client;
}
const isStale = (client: QueryClient) =>
  client.getQueryState([...SHELL_COUNTS_QUERY_KEY, "user-1"])?.isInvalidated === true;

test("a store-change decision (invalidateApprovals) refreshes the shell counts", () => {
  const client = seeded();
  expect(isStale(client)).toBe(false);
  invalidateApprovals(client, ["approvals", "store_change"]);
  expect(isStale(client)).toBe(true);
});

test("invalidateShellCounts alone marks the bell's counts stale", () => {
  const client = seeded();
  invalidateShellCounts(client);
  expect(isStale(client)).toBe(true);
});
