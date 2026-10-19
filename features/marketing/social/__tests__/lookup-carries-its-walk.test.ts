// A Track that reuses the field's lookup loads no posts itself, so the lookup must carry what its walk loaded:
// otherwise the success toast would lose "· N posts" (review of the Track double-fetch fix).
import { fetchAccount } from "../account-lookup";
import { ingestProfile } from "../server";
import { readProfile } from "../service";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("../server", () => ({ ingestProfile: jest.fn() }));
jest.mock("../service", () => ({ readProfile: jest.fn() }));
jest.mock("../post-count", () => ({ rememberedMaxPostsPlain: async () => 50 }));

test("fetchAccount returns the walk: posts loaded, the setting's cut and an early stop", async () => {
  jest.mocked(ingestProfile).mockResolvedValue({
    profile_id: "6f0d2c1e-tiktok-khaby", platform: "tiktok", handle: "khaby.lame", pages_walked: 3, posts_upserted: 51,
    post_ids: [], has_more: true, list_trace: [], notes: [], posts_received: 51,
    limit_applied: { setting: "max_posts", value: 51, requested: 60 }, stopped_reason: null,
  } as unknown as Awaited<ReturnType<typeof ingestProfile>>);
  jest.mocked(readProfile).mockResolvedValue({
    id: "6f0d2c1e-tiktok-khaby", platform: "tiktok", handle: "khaby.lame", display_name: "Khabane lame",
    avatar_url: null, avatar_file_id: null, follower_count: 163_000_000,
  } as unknown as Awaited<ReturnType<typeof readProfile>>);
  const found = await fetchAccount({
    account: { platform: "tiktok", handle: "khaby.lame", url: "https://www.tiktok.com/@khaby.lame" },
    organizationId: "travel-org",
  });
  expect(found.source).toBe("fetched");
  expect(found.walk).toEqual({ postsReceived: 51, limitApplied: { setting: "max_posts", value: 51, requested: 60 }, stoppedReason: null });
});
