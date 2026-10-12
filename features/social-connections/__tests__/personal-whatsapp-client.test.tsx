import { act } from "react";
import { createRoot } from "react-dom/client";
import { PersonalWhatsAppPanel } from "../PersonalWhatsAppPanel";
import { discoverLocalEngine } from "@/lib/local-engine/discovery";
import { requestRaw } from "@/lib/python-client";
import type { MessengerSource } from "@ai-matrx/chat/messenger/contract";
import { personalWhatsAppDevelopmentTarget, type PersonalGrant } from "../personal-whatsapp-service";

jest.mock("@/lib/local-engine/discovery", () => ({ discoverLocalEngine: jest.fn() }));
jest.mock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "admin-test-owner" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: jest.fn() }));
jest.mock("@ai-matrx/rich-content/markdown-core/MarkdownCore", () => ({ __esModule: true, default: ({ children }: { children: string }) => <span>{children}</span> }));
// Only the shared visual shell is substituted; the panel, native client, and thread remain real.
jest.mock("@ai-matrx/chat/messenger/MessengerShell", () => ({ MessengerShell: ({ source }: { source: MessengerSource }) => <div>
  {source.contacts.map((contact) => <button key={contact.id} onClick={() => source.onSelectContact(contact.id)}>{contact.name}</button>)}
  {source.activeContactId && source.contacts.length > 0 && source.renderThread(source.contacts.find((contact) => contact.id === source.activeContactId) ?? source.contacts[0])}
  {source.listState?.hasMore && <button onClick={source.listState?.loadMore}>More chats</button>}
</div> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const initial: PersonalGrant = { request_profile: "read", max_duration_seconds: 86400, id: "d843d2f8-69ca-47cf-882d-e8e1a41d18e4", generation: 1, revision: 1, status: "active", account_ref: "whatsapp", selected_chat_ids: ["other"], scopes: ["read"], expires_at: "2099-01-01T00:00:00Z", connection_id: "ba9f334f-cb55-44b9-a9fc-1fca4fd568ba", bridge_provider: "cloud", resources_generation: 1, recovery_required: false, refresh_supported: false, renewal: "reauthorization", provider_revoke_pending: false, cloud_retirement_pending: false };
const selection: PersonalGrant = { ...initial, revision: 2, selected_chat_ids: ["sandbox", "other"] };
let status = initial;
let refuseMore = false;
let moreStatus = 403;
let calls: string[] = [];
let failStart = false;

async function click(host: HTMLElement, name: string) {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === name);
  if (!button) throw new Error(`Missing control ${name}`);
  await act(async () => { button.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

describe("personal WhatsApp real panel/client/thread boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks(); status = initial; refuseMore = false; moreStatus = 403; calls = []; failStart = false;
    jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "development" });
    window.history.replaceState(null, "", "/messenger/whatsapp?devLocalEngine=http%3A%2F%2F127.0.0.1%3A22259");
    jest.mocked(discoverLocalEngine).mockResolvedValue({ baseUrl: "http://127.0.0.1:22259", port: 22259, version: "test", capabilities: ["personal_messaging_v1"], discoveredAt: Date.now() });
    jest.mocked(requestRaw).mockImplementation(async (path, _init, options) => {
      calls.push(path); expect(options?.baseUrlOverride).toBe("http://127.0.0.1:22259");
      let body: unknown;
      if (path.endsWith("/disconnect")) { status = { ...initial, status: "retired" }; body = status; }
      else if (path.endsWith("/start") && failStart) return new Response(JSON.stringify({ error: "device_offline", message: "Open Beeper Desktop." }), { status: 503 });
      else if (path.endsWith("/status") || path.endsWith("/refresh")) body = status;
      else if (path.endsWith("/select-chat")) { status = selection; body = selection; }
      else if (path.includes("/chats")) {
        if (refuseMore && path.includes("cursor=")) return new Response(JSON.stringify(moreStatus === 403 ? { detail: "The device owner changed. Sign in again." } : { error: "device_timeout", message: "Beeper is temporarily unavailable." }), { status: moreStatus });
        body = { items: [{ id: "sandbox", title: "Sandbox only", selected: status.selected_chat_ids?.includes("sandbox") }, { id: "other", title: "Other test chat", selected: true }], has_more: true, oldest_cursor: "older", newest_cursor: "newer" };
      } else if (path.includes("/messages")) body = { items: [], has_more: false, oldest_cursor: "older", newest_cursor: "newer", history_coverage: "available_in_beeper", refresh_supported: false, renewal: "reauthorization" };
      else throw new Error(`Unexpected route ${path}`);
      return new Response(JSON.stringify(body), { status: 200 });
    });
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it("unsupported write upgrade preserves the working reader and never disconnects", async () => {
    jest.spyOn(window, "open").mockReturnValue(null);
    const host = document.createElement("div"); const root = createRoot(host);
    try {
      await act(async () => root.render(<PersonalWhatsAppPanel messenger />));
      await click(host, "Enable sending");
      expect(calls.some(path => path.endsWith("/disconnect"))).toBe(false);
      expect(host.textContent).toContain("Connected"); expect(host.textContent).toContain("Update AI Matrx Local");
    } finally { await act(async () => root.unmount()); }
  });
  it("a failed new consent start immediately shows the verified retired reader", async () => {
    jest.spyOn(window, "open").mockReturnValue(null); failStart = true;
    jest.mocked(discoverLocalEngine).mockResolvedValue({ baseUrl: "http://127.0.0.1:22259", port: 22259, version: "test", capabilities: ["personal_messaging_v1", "personal_messaging_write_v1"], discoveredAt: Date.now() });
    const host = document.createElement("div"); const root = createRoot(host);
    try {
      await act(async () => root.render(<PersonalWhatsAppPanel messenger />));
      await click(host, "Enable sending");
      expect(calls.some(path => path.endsWith("/disconnect"))).toBe(true);
      expect(host.textContent).toContain("Disconnected"); expect(host.textContent).not.toContain("Connected");
      expect(host.textContent).toContain("Open Beeper Desktop.");
    } finally { await act(async () => root.unmount()); }
  });
  it("propagates one explicit client and adopts chat selection before reopening", async () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => { root.render(<PersonalWhatsAppPanel messenger />); });
      await click(host, "Sandbox only");
      expect(calls.filter((path) => path.includes("/messages"))).toHaveLength(1);
      await click(host, "Other test chat");
      await click(host, "Sandbox only");
      expect(calls.filter((path) => path.endsWith("/select-chat"))).toHaveLength(1);
      expect(calls.filter((path) => path.includes("/messages"))).toHaveLength(3);
      expect(jest.mocked(discoverLocalEngine).mock.calls.every(([options]) => options?.developmentBaseUrl === "http://127.0.0.1:22259")).toBe(true);
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
  it("checks actual native consent without claiming a refresh token renewal", async () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => { root.render(<PersonalWhatsAppPanel messenger />); });
      await click(host, "Check connection");
      expect(calls.filter((path) => path.endsWith("/refresh"))).toHaveLength(1);
      expect(calls.some((path) => path.endsWith("/start"))).toBe(false);
      expect(host.textContent).toContain("Connected");
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
  it("clears chat titles and connected state on an authoritative refusal", async () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => { root.render(<PersonalWhatsAppPanel messenger />); });
      expect(host.textContent).toContain("Sandbox only"); refuseMore = true;
      await click(host, "More chats");
      expect(host.textContent).not.toContain("Sandbox only"); expect(host.textContent).not.toContain("Connected");
      expect(host.textContent).toContain("The device owner changed. Sign in again.");
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
  it("transient chat pagination preserves the active grant and existing contacts", async () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => root.render(<PersonalWhatsAppPanel messenger />));
      await click(host, "Sandbox only"); refuseMore = true; moreStatus = 503;
      await click(host, "More chats");
      expect(host.textContent).toContain("Sandbox only"); expect(host.textContent).toContain("Other test chat");
      expect(host.textContent).not.toContain("Reconnect required");
      refuseMore = false; await click(host, "More chats");
      expect(calls.filter(path => path.includes("/chats?cursor="))).toHaveLength(2);
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
  it("rejects duplicate DEV targets without quietly using default discovery", async () => {
    window.history.replaceState(null, "", "/messenger/whatsapp?devLocalEngine=a&devLocalEngine=b");
    jest.mocked(discoverLocalEngine).mockResolvedValue(null);
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => { root.render(<PersonalWhatsAppPanel messenger />); });
      expect(discoverLocalEngine).toHaveBeenCalledWith({ developmentBaseUrl: "" }); expect(requestRaw).not.toHaveBeenCalled();
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});


describe("managed preview document intake", () => {
  beforeEach(() => { jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "development" }); });
  afterEach(() => { jest.restoreAllMocks(); });
  const search = "?devLocalEngine=http%3A%2F%2F127.0.0.1%3A22259";
  it.each(["localhost", "127.0.0.1", "meta-customer-connections.localhost"])("accepts the local document %s", (hostname) => {
    expect(personalWhatsAppDevelopmentTarget({ hostname, pathname: "/messenger/whatsapp", search }, true)).toBe("http://127.0.0.1:22259");
  });
  it.each(["evil.localhost.com", "foo.bar.localhost", "127.0.0.1.evil.example", "aimatrx.com"])("ignores the remote or nested document %s", (hostname) => {
    expect(personalWhatsAppDevelopmentTarget({ hostname, pathname: "/messenger/whatsapp", search }, true)).toBeUndefined();
  });
  it("ignores other routes, settings and production", () => {
    expect(personalWhatsAppDevelopmentTarget({ hostname: "localhost", pathname: "/user-settings/integrations", search }, true)).toBeUndefined();
    expect(personalWhatsAppDevelopmentTarget({ hostname: "localhost", pathname: "/messenger/whatsapp", search }, false)).toBeUndefined();
    jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "production" });
    expect(personalWhatsAppDevelopmentTarget({ hostname: "meta-customer-connections.localhost", pathname: "/messenger/whatsapp", search }, true)).toBeUndefined();
  });
  it("keeps duplicate values fail closed", () => {
    expect(personalWhatsAppDevelopmentTarget({ hostname: "localhost", pathname: "/messenger/whatsapp", search: "?devLocalEngine=a&devLocalEngine=b" }, true)).toBe("");
  });
});
