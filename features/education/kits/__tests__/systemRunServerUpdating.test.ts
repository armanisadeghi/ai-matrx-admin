/**
 * MKT-094: during a rolling deploy a start lands on a server older than the workflow. The server says so (503
 * `node_types_unavailable_here`; an older server 422 "Unknown node type"), and the start retries onto a newer server.
 */
import { isServerUpdatingRefusal } from "../systemRuns";

describe("a start refused by a server mid-update is retried", () => {
  it("503 node_types_unavailable_here", () => {
    expect(
      isServerUpdatingRefusal({ status: 503, serverDetail: { detail: { error: "node_types_unavailable_here" } } }),
    ).toBe(true);
  });
  it("422 Unknown node type (a server without the 503 answer)", () => {
    expect(
      isServerUpdatingRefusal({
        status: 422,
        serverDetail: { detail: { error: "validation_failed", issues: [{ message: "Unknown node type 'brand.identify.email'." }] } },
      }),
    ).toBe(true);
  });
  it("any other refusal is not retried", () => {
    expect(isServerUpdatingRefusal({ status: 422, serverDetail: { detail: { error: "invalid_subject" } } })).toBe(false);
    expect(isServerUpdatingRefusal({ status: 503, message: "database busy" })).toBe(false);
    expect(isServerUpdatingRefusal(null)).toBe(false);
  });
});
