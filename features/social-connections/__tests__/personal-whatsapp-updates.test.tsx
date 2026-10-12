import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { usePersonalWhatsAppUpdates, personalWhatsAppReconcileBatch } from "@/features/messaging/messenger/usePersonalWhatsAppUpdates";
import { createPersonalWhatsAppClient, PersonalWhatsAppFailure, type PersonalMessage, type PersonalMessages, type PersonalLiveFrame } from "../personal-whatsapp-service";
jest.mock("@/lib/local-engine/discovery", () => ({ discoverLocalEngine: jest.fn() }));
jest.mock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const message = (id: string, text = id): PersonalMessage => ({ id, account_id: "whatsapp", sender_id: "sender", sender_name: null, deleted: false, attachment_count: 0, attachment_access: "local_device", chat_id: "sandbox", direction: "inbound", created_at: "2026-10-11T12:00:00Z", content: { parts: [{ id: "text", type: "text", text }] }, attachments: [] });
const page = (items: PersonalMessage[], cursor = "older"): PersonalMessages => ({ items, has_more: true, oldest_cursor: cursor, newest_cursor: "newest", history_coverage: "available_in_beeper", refresh_supported: false, renewal: "reauthorization" });
async function mount() {
 const client = createPersonalWhatsAppClient();
 const pages = jest.spyOn(client, "messages").mockResolvedValue(page([message("one")]));
 const lookup = jest.spyOn(client, "message").mockResolvedValue({ message: message("one", "edited") });
 let emit!: (frame: PersonalLiveFrame) => void;
 jest.spyOn(client, "events").mockImplementation((_chat, signal, onFrame) => { emit = onFrame; return new Promise<void>(resolve => signal.addEventListener("abort", () => resolve(), { once: true })); });
 let read!: (cursor?: string) => Promise<void>;
 const failures = jest.fn();
 function Surface() { const [messages, setMessages] = useState([message("one")]); const [current, setPage] = useState<PersonalMessages | null>(page(messages)); const updates = usePersonalWhatsAppUpdates({ client, chatId: "sandbox", enabled: true, messages, setMessages, setPage, onAccessFailure: failures }); read = updates.readPage; return <div>{updates.status}|{current?.oldest_cursor}|{messages.map(m => m.content.parts[0].text).join(",")}</div>; }
 const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
 await act(async () => root.render(<Surface />));
 return { host, pages, lookup, emit: (frame: PersonalLiveFrame) => act(async () => emit(frame)), read: (cursor?: string) => read(cursor), failures, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
beforeEach(() => jest.useFakeTimers()); afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test("edits and tombstones reconcile without resurrection, preserving pagination", async () => {
 const s = await mount();
 try {
  await s.emit({ type: "ready", chat_id: "sandbox", reconcile: false, ids: [] });
  await act(async () => s.read("older"));
  s.pages.mockResolvedValue(page([message("one", "stale")], "latest-cursor"));
  await s.emit({ type: "changed", chat_id: "sandbox", reconcile: false, ids: ["one"], change: "upsert" });
  expect(s.host.textContent).toContain("edited");
  await s.emit({ type: "changed", chat_id: "sandbox", reconcile: false, ids: ["one"], change: "deleted" });
  await act(async () => jest.advanceTimersByTimeAsync(30_000));
  expect(s.host.textContent).not.toContain("stale"); expect(s.host.textContent).toContain("older");
 } finally { await s.close(); }
});
test("manual refresh waits for the active automatic read", async () => {
 const s = await mount();
 try {
  let finish!: (value: PersonalMessages) => void;
  s.pages.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await s.emit({ type: "ready", chat_id: "sandbox", reconcile: false, ids: [] });
  let manual!: Promise<void>;
  await act(async () => { manual = s.read("older"); });
  expect(s.pages).toHaveBeenCalledTimes(1);
  await act(async () => { finish(page([message("one")])); await manual; });
  expect(s.pages.mock.calls.map(call => call[1])).toEqual([undefined, "older"]);
 } finally { await s.close(); }
});
test("retirement ends access immediately and no periodic call survives", async () => {
 const s = await mount();
 try { await s.emit({ type: "access_lost", chat_id: "sandbox", reconcile: false, ids: [] }); expect(s.failures).toHaveBeenCalledTimes(1); await act(async () => jest.advanceTimersByTimeAsync(90_000)); expect(s.pages).not.toHaveBeenCalled(); }
 finally { await s.close(); }
});
test("loaded-history checks rotate fairly across more than fifty messages", () => {
 const ids = Array.from({ length: 120 }, (_, i) => String(i)); let cursor = 0; const seen = new Set<string>();
 for (let i = 0; i < 3; i++) { const batch = personalWhatsAppReconcileBatch(ids, cursor); expect(batch.ids).toHaveLength(50); batch.ids.forEach(id => seen.add(id)); cursor = batch.nextCursor; }
 expect(seen.size).toBe(120);
});

test("transient periodic and manual reads preserve history and retry", async () => {
 const s = await mount();
 try {
  await s.emit({ type: "ready", chat_id: "sandbox", reconcile: false, ids: [] });
  s.pages.mockClear();
  s.pages.mockRejectedValueOnce(new PersonalWhatsAppFailure("Beeper timed out", 409, "device_timeout"));
  await act(async () => jest.advanceTimersByTimeAsync(30_000));
  expect(s.failures).not.toHaveBeenCalled(); expect(s.host.textContent).toContain("one"); expect(s.host.textContent).toContain("Reconnecting");
  s.pages.mockRejectedValueOnce(new TypeError("network failed"));
  await act(async () => { await expect(s.read("older")).rejects.toThrow("network failed"); });
  expect(s.failures).not.toHaveBeenCalled(); expect(s.host.textContent).toContain("one");
  await act(async () => jest.advanceTimersByTimeAsync(30_000)); expect(s.pages).toHaveBeenCalledTimes(3); expect(s.host.textContent).toContain("Updating");
 } finally { await s.close(); }
});
test("terminal typed HTTP refusal ends the grant and rejects queued manual reads", async () => {
 const s = await mount();
 try {
  s.pages.mockRejectedValueOnce(new PersonalWhatsAppFailure("Consent revoked", 409, "reauthorization_required"));
  await act(async () => { await expect(s.read()).rejects.toThrow("Consent revoked"); });
  expect(s.failures).toHaveBeenCalledWith("Consent revoked");
  await act(async () => jest.advanceTimersByTimeAsync(90_000)); expect(s.pages).toHaveBeenCalledTimes(1);
 } finally { await s.close(); }
});
