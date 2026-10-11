import { act } from "react";
import { createRoot } from "react-dom/client";
import { TikTokConnectionsPanel } from "./TikTokConnectionsPanel";
import { discoverTikTokAccount, listTikTokConnections, listTikTokVideos } from "./service";

jest.mock("./service", () => ({ listTikTokConnections: jest.fn(), discoverTikTokAccount: jest.fn(),
  listTikTokVideos: jest.fn(), attachTikTokAccount: jest.fn(), disconnectTikTokConnection: jest.fn(),
  finishTikTokAuthorization: jest.fn(), refreshTikTokConnection: jest.fn(), startTikTokAuthorization: jest.fn() }));
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (selector: () => string) => selector() }));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({ selectOrganizationId: () => "customer-org" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "customer" }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn() } }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Guards real rendering and page accumulation: zero and unavailable metrics differ,
// page two must preserve page one, and provider-supplied links stay navigable only on TikTok.
it("keeps unavailable metrics distinct from zero and appends the next public-video page", async () => {
  jest.mocked(listTikTokConnections).mockResolvedValue([{ id: "grant", account_name: "AI Matrx",
    status: "connected", scopes: ["video.list"], last_error: null, last_verified_at: null }]);
  jest.mocked(discoverTikTokAccount).mockResolvedValue({ resource_type: "account", resource_ref: "creator",
    display_name: "AI Matrx", granted_scopes: ["video.list"], environment: "sandbox", comments_access: "unavailable",
    profile: { open_id: "creator", username: "ai.matrx", follower_count: null, following_count: 0,
      likes_count: 7, video_count: 2, profile_deep_link: "https://www.tiktok.com/@ai.matrx" } });
  jest.mocked(listTikTokVideos)
    .mockResolvedValueOnce({ videos: [{ id: "one", title: "First clip", view_count: null, like_count: 0,
      share_url: "https://www.tiktok.com/@ai.matrx/video/1" }], cursor: 42, has_more: true })
    .mockResolvedValueOnce({ videos: [{ id: "two", title: "Second clip", view_count: 9,
      share_url: "javascript:alert(1)" }], cursor: 73, has_more: false });
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const click = async (label: string) => {
    const button = Array.from(host.querySelectorAll("button")).find(node => node.textContent === label);
    if (!button) throw new Error(`Missing ${label}`);
    await act(async () => { button.click(); });
  };
  try {
    await act(async () => { root.render(<TikTokConnectionsPanel />); });
    await click("Select account");
    const metric = (label: string) => Array.from(host.querySelectorAll("dt"))
      .find(node => node.textContent === label)?.nextElementSibling?.textContent;
    expect(metric("Followers")).toBe("—");
    expect(metric("Following")).toBe("0");
    expect(metric("Likes")).toBe("7");
    await click("Public videos");
    expect(metric("Views")).toBe("—");
    expect(host.textContent).toContain("First clip");
    await click("Load more");
    expect(listTikTokVideos).toHaveBeenNthCalledWith(1, "grant");
    expect(listTikTokVideos).toHaveBeenNthCalledWith(2, "grant", 42);
    expect(host.textContent).toContain("First clip");
    expect(host.textContent).toContain("Second clip");
    expect(Array.from(host.querySelectorAll("button")).some(node => node.textContent === "Load more")).toBe(false);
    expect(Array.from(host.querySelectorAll("a")).some(node => node.textContent === "Second clip")).toBe(false);
  } finally { await act(async () => { root.unmount(); }); host.remove(); }
});
