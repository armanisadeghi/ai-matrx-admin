const serverCall = jest.fn();
jest.mock("@/lib/api/server-api", () => ({
  ...jest.requireActual("@/lib/api/server-api"),
  serverApi: { call: (...args: unknown[]) => serverCall(...args) },
}));

import { createSourceRef, createSourceSet } from "@ai-matrx/agents/sources";
import { sourcesClient } from "./sourceSetApi";

/**
 * V1-A (verifier shot 03): a person with no organization selected picked a file and
 * saw "Sizes and parts could not be read: Select an organization before sending this
 * request." Both doors are reads the server admits without one (aidream
 * `read_by_access.py` BODY_CARRIED_READS). The package client marks every call
 * `bodyCarriedRead`; this proves the web app's transport sends each door through the
 * generated operation (organization "optional" in its descriptor) on the one
 * `serverApi`, naming no organization itself and never refusing in the browser.
 */
const ref = createSourceRef("file", "0b8d1a52-2f0c-4a57-9d2c-3a6f0e8f1c11");
const set = createSourceSet([ref]);
const signal = new AbortController().signal;

beforeEach(() => {
  serverCall.mockReset();
  serverCall.mockResolvedValue({ __kind: "source_manifest", sources: [] });
});

it.each([
  ["manifest", () => sourcesClient.manifest(set), "/sources/manifest", { source_set: set }],
  ["resolve", () => sourcesClient.resolve(set), "/sources/resolve", { source_set: set }],
  ["review manifest", () => sourcesClient.manifest(set, { signal }), "/sources/manifest", { source_set: set }],
  [
    "part search",
    () => sourcesClient.searchParts(ref, "photosynthesis"),
    "/sources/parts/search",
    { source_ref: ref, query: "photosynthesis" },
  ],
])("%s is sent as an organization-free read", async (_name, call, path, sent) => {
  await call();
  expect(serverCall).toHaveBeenCalledTimes(1);
  const [op, args, options] = serverCall.mock.calls[0]!;
  expect(op).toMatchObject({ m: "POST", p: path, o: "optional" });
  expect(args).toEqual({ body: sent });
  expect(options.organizationId).toBeUndefined();
});

it("still names an organization a host already resolved", async () => {
  await sourcesClient.manifest(set, { organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b" });
  expect(serverCall.mock.calls[0]![2]).toMatchObject({
    organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
  });
});

it("passes the review's AbortSignal through", async () => {
  await sourcesClient.manifest(set, { signal });
  expect(serverCall.mock.calls[0]![2]).toMatchObject({ signal });
});
