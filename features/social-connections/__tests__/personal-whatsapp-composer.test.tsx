import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ComposerInputRenderProps } from "@ai-matrx/messaging/react";
import { PersonalWhatsAppComposer } from "@/features/messaging/messenger/PersonalWhatsAppComposer";
import type { PersonalOutboxEntry, PersonalWhatsAppClient } from "../personal-whatsapp-service";
// The shared editor is a visual boundary; real composer state/request identity remain under test.
jest.mock("@/features/messaging/components/MessagesComposerInput", () => ({ MessagesComposerInput: ({ input }: { input: ComposerInputRenderProps }) => <div><textarea aria-label="Reply" disabled={input.disabled} value={input.value} onChange={e => input.onChange(e.target.value)} /><button disabled={!input.canSend} onClick={input.onSubmit}>Send</button></div> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const receipt: PersonalOutboxEntry = { client_id: "152d535f-eb67-4b5c-9c1d-44c34514ce33", state: "accepted", pending_message_id: "alias", created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z", draft_text: "sandbox fixture", network_status: "SUCCESS" };
const key = "matrx:personal-send:grant:sandbox";
function client(send: PersonalWhatsAppClient["send"], outbox: PersonalWhatsAppClient["outbox"]): PersonalWhatsAppClient {
  return { send, outbox } as PersonalWhatsAppClient;
}
async function click(host: HTMLElement, name: string) { await act(async () => { const button = Array.from(host.querySelectorAll("button")).find(b => b.textContent === name); if (!button) throw new Error(name); button.click(); }); }
beforeEach(() => sessionStorage.clear());

it("rehydrates an interrupted request identity after reload and never enables a new send", async () => {
  sessionStorage.setItem(key, receipt.client_id);
  const send = jest.fn(); const outbox = jest.fn().mockResolvedValue([]);
  const host = document.createElement("div"); const root = createRoot(host);
  try {
    await act(async () => root.render(<PersonalWhatsAppComposer client={client(send, outbox)} chatId="sandbox" grantId="grant" onAccessFailure={() => undefined} />));
    await click(host, "Check send status");
    expect(host.querySelector("textarea")?.disabled).toBe(true);
    await click(host, "Send"); expect(send).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(key)).toBe(receipt.client_id);
  } finally { await act(async () => root.unmount()); }
});
it("unknown server receipts block new sends and are never presented as delivered", async () => {
  const send = jest.fn(); const outbox = jest.fn().mockResolvedValue([{ ...receipt, state: "unknown", network_status: null }]);
  const host = document.createElement("div"); const root = createRoot(host);
  try {
    await act(async () => root.render(<PersonalWhatsAppComposer client={client(send, outbox)} chatId="sandbox" grantId="grant" onAccessFailure={() => undefined} />));
    expect(host.textContent).toContain("Send unconfirmed"); expect(host.textContent).not.toContain("Delivery reported");
    await click(host, "Send"); expect(send).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); }
});
it("native success without delivery evidence says sent and clears only the matching interrupted identity", async () => {
  sessionStorage.setItem(key, receipt.client_id);
  const host = document.createElement("div"); const root = createRoot(host);
  try {
    await act(async () => root.render(<PersonalWhatsAppComposer client={client(jest.fn(), jest.fn().mockResolvedValue([receipt]))} chatId="sandbox" grantId="grant" onAccessFailure={() => undefined} />));
    expect(host.textContent).toContain("Sent"); expect(host.textContent).not.toContain("Delivery reported"); expect(host.textContent).not.toContain("Read reported");
    expect(host.querySelector("textarea")?.disabled).toBe(false); expect(sessionStorage.getItem(key)).toBeNull();
  } finally { await act(async () => root.unmount()); }
});
