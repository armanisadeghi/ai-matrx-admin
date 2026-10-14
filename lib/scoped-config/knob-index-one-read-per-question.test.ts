const rpc = jest.fn(async () => ({ data: { keys: [] }, error: null }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema: () => ({ rpc }) }) }));

import { fetchKnobIndex, resetSharedKnobIndexReads } from "./service";
import { invalidateEffectiveKnob } from "./effectiveKnobs";

beforeEach(() => {
  rpc.mockClear();
  resetSharedKnobIndexReads();
});

it("two asks of the same question share ONE knob_index read", async () => {
  await Promise.all([
    fetchKnobIndex({ organizationId: "o1", featurePrefix: "files", userId: "u1" }),
    fetchKnobIndex({ organizationId: "o1", featurePrefix: "files", userId: "u1" }),
  ]);
  await fetchKnobIndex({ organizationId: "o1", featurePrefix: "files", userId: "u1" });
  expect(rpc).toHaveBeenCalledTimes(1);
  await fetchKnobIndex({ organizationId: "o1", featurePrefix: "messaging.inbox", userId: "u1" });
  expect(rpc).toHaveBeenCalledTimes(2);
});

it("a knob WRITE, or an explicit refresh, reads fresh", async () => {
  await fetchKnobIndex({ organizationId: "o1", featurePrefix: "files" });
  invalidateEffectiveKnob("files.page_size");
  await fetchKnobIndex({ organizationId: "o1", featurePrefix: "files" });
  await fetchKnobIndex({ organizationId: "o1", featurePrefix: "files", fresh: true });
  expect(rpc).toHaveBeenCalledTimes(3);
});
