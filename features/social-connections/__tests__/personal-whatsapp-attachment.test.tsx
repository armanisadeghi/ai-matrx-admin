/** Component custody guards; sandbox media delivery is a separate real proof. */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NativeWhatsAppAttachment } from "@/features/messaging/messenger/NativeWhatsAppAttachment";
import { createPersonalWhatsAppClient, type PersonalAttachment } from "../personal-whatsapp-service";

jest.mock("@ai-matrx/media/react", () => ({ InlineMediaRef: ({ ref, as }: { ref: { url: string }; as: string }) => <div data-testid="shared-media" data-source={ref.url}>{as}</div> }));
jest.mock("@ai-matrx/kit/download", () => ({ downloadFile: jest.fn() }));
jest.mock("@/components/official/InfoHint", () => ({ InfoHint: ({ text }: { text: string }) => <span>{text}</span> }));
jest.mock("@/lib/local-engine/discovery", () => ({ discoverLocalEngine: jest.fn() }));
jest.mock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
const { downloadFile } = jest.requireMock("@ai-matrx/kit/download");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const item: PersonalAttachment = { index: 0, revision: "a".repeat(64), name: "sandbox.png", available: true, mime_type: "image/png", size_bytes: 5 };

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:sandbox");
  URL.revokeObjectURL = jest.fn();
});

async function click(host: HTMLElement, name: string) {
  const button = Array.from(host.querySelectorAll("button")).find((x) => x.textContent === name);
  expect(button).toBeDefined();
  await act(async () => { button!.click(); });
}

async function setup(attachment = item) {
  const client = createPersonalWhatsAppClient();
  const request = jest.spyOn(client, "attachment").mockResolvedValue(new Blob(["asset"], { type: "image/png" }));
  const host = document.createElement("div"); document.body.appendChild(host);
  const root = createRoot(host);
  const props = { client, chatId: "sandbox", messageId: "message", attachment };
  await act(async () => root.render(<NativeWhatsAppAttachment {...props} />));
  return { request, props, host,
    rerender: async (next: PersonalAttachment) => { await act(async () => root.render(<NativeWhatsAppAttachment {...props} attachment={next} />)); },
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
}

test("one explicit load uses shared renderer; canonical download reuses bytes", async () => {
  const { request, host, unmount } = await setup();
  expect(request).not.toHaveBeenCalled();
  await click(host, "Open sandbox.png");
  expect(host.querySelector('[data-testid="shared-media"]')?.textContent).toBe("img");
  await click(host, "Download sandbox.png");
  expect(downloadFile).toHaveBeenCalledWith("sandbox.png", expect.any(Blob), "image/png");
  expect(request).toHaveBeenCalledTimes(1);
  await unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sandbox");
});

test("edited attachment aborts old load and never materializes late bytes", async () => {
  let finish!: (blob: Blob) => void;
  const { request, host, rerender, unmount } = await setup();
  request.mockImplementation(() => new Promise<Blob>((resolve) => { finish = resolve; }));
  await click(host, "Open sandbox.png");
  const signal = request.mock.calls[0][3];
  await rerender({ ...item, revision: "b".repeat(64) });
  expect(signal.aborted).toBe(true);
  await act(async () => finish(new Blob(["old"], { type: "image/png" })));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(host.querySelector('[data-testid="shared-media"]')).toBeNull();
  await unmount();
});

test("edited loaded attachment revokes old object URL before new load", async () => {
  const { host, rerender, unmount } = await setup();
  await click(host, "Open sandbox.png");
  expect(host.querySelector('[data-testid="shared-media"]')).not.toBeNull();
  await rerender({ ...item, revision: "b".repeat(64) });
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sandbox");
  expect(host.querySelector('[data-testid="shared-media"]')).toBeNull();
  expect(Array.from(host.querySelectorAll("button")).find(x => x.textContent === "Open sandbox.png")?.disabled).toBe(false);
  await unmount();
});

test("unsupported file never fetches; provider failure gives retry", async () => {
  const first = await setup({ ...item, available: false });
  expect(first.host.textContent).toContain("Open this attachment in Beeper.");
  expect(first.request).not.toHaveBeenCalled();
  await first.unmount();
  const { request, host, unmount } = await setup();
  request.mockRejectedValue(new Error("Open this attachment in Beeper."));
  await click(host, "Open sandbox.png");
  expect(host.textContent).toContain("Open this attachment in Beeper.");
  expect(Array.from(host.querySelectorAll("button")).find(x => x.textContent === "Open sandbox.png")?.disabled).toBe(false);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  await unmount();
});
