/**
 * `load_media` / `play_embed` — how a shape in the sealed frame plays media — and the frame's
 * CSP / locale wiring. Pins: Play fetches bytes through the host (never at render), the size
 * ceiling is a sentence, play_embed opens only http(s) and turns a provider link into its embed
 * address, media-src is blob: only (no frame-src is ever opened), and the locale rides init + theme.
 */
import type { KindActionContext } from "../react/actions/kind-action-context";
import { MAX_FRAME_MEDIA_BYTES, loadMediaAction, parsePlayEmbed, playEmbedAction } from "../react/actions/handlers/media";
import { HOST_MESSAGE_TYPES } from "../sandbox/protocol";
import fs from "node:fs";
import path from "node:path";

const base: KindActionContext = {
  launchAgent: async () => ({}) as never,
  userId: "u1",
  openShortcut: async () => ({ conversationId: "c" }),
  runShortcut: async () => ({ ok: true, data: null }),
  itemState: null,
  openFile: () => undefined,
  shareFile: () => undefined,
  openUrl: () => undefined,
};

describe("load_media", () => {
  it("returns the file's bytes from the host's loader", async () => {
    const blob = new Blob(["abc"], { type: "video/mp4" });
    const loadMedia = jest.fn(async () => ({ blob, mime_type: "video/mp4" }));
    const out = await loadMediaAction.handler({ file_id: " f1 ", organization_id: "o1" }, { ...base, loadMedia });
    expect(loadMedia).toHaveBeenCalledWith("f1", "o1");
    expect(out).toEqual({ ok: true, result: { blob, mime_type: "video/mp4" } });
  });
  it("says why, never throws: no file, no loader, a failed read, a file too large", async () => {
    expect(await loadMediaAction.handler({}, base)).toEqual({ ok: false, error: "This needs a saved file." });
    expect((await loadMediaAction.handler({ file_id: "f" }, base)).ok).toBe(false);
    const failing = await loadMediaAction.handler({ file_id: "f" }, { ...base, loadMedia: async () => { throw new Error("x"); } });
    expect(failing).toEqual({ ok: false, error: "This file couldn't be loaded." });
    const huge = { size: MAX_FRAME_MEDIA_BYTES + 1, type: "video/mp4" } as Blob;
    const tooBig = await loadMediaAction.handler({ file_id: "f" }, { ...base, loadMedia: async () => ({ blob: huge, mime_type: null }) });
    expect(tooBig.ok).toBe(false);
  });
});

describe("play_embed", () => {
  it("turns a provider link into its embed address and a media address into itself", () => {
    expect(parsePlayEmbed({ url: "https://youtu.be/dQw4w9WgXcQ", title: "Intro" })).toEqual({
      url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
      title: "Intro",
    });
    expect(parsePlayEmbed({ url: "https://cdn.example.com/a.mp4", title: "Clip" })).toEqual({ url: "https://cdn.example.com/a.mp4", title: "Clip" });
  });
  it("refuses anything that is not a web address", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "blob:https://x/y", "file:///etc/passwd", "", "nope"]) {
      expect("error" in parsePlayEmbed({ url })).toBe(true);
    }
  });
  it("opens through the host, or says it cannot", async () => {
    const playEmbed = jest.fn();
    const ok = await playEmbedAction.handler({ url: "https://vimeo.com/76979871" }, { ...base, playEmbed });
    expect(ok.ok).toBe(true);
    expect(playEmbed).toHaveBeenCalledWith("https://player.vimeo.com/video/76979871?autoplay=1", "Vimeo");
    expect((await playEmbedAction.handler({ url: "https://vimeo.com/76979871" }, base)).ok).toBe(false);
  });
});

describe("frame wiring", () => {
  const root = path.resolve(__dirname, "../../..");
  it("the frame CSP allows blob: media and still opens no frame-src", () => {
    const route = fs.readFileSync(path.join(root, "app/kind-sandbox/route.ts"), "utf8");
    expect(route).toContain('"media-src blob:"');
    expect(route).not.toMatch(/frame-src/);
    expect(route).toContain("\"default-src 'none'\"");
  });
  it("the reader's locale rides init and every theme message, and the frame applies it", () => {
    const frame = fs.readFileSync(path.join(root, "features/content-ir/react/db-component/KindSandboxFrame.tsx"), "utf8");
    expect((frame.match(/locale: readDocumentLocale\(\)/g) ?? []).length).toBe(2);
    expect(frame).toContain('"lang", "dir"');
    const bridge = fs.readFileSync(path.join(root, "features/content-ir/sandbox/runtime/frame-bridge.ts"), "utf8");
    expect(bridge).toContain("document.documentElement.lang = locale.locale");
    expect(bridge).toContain("document.documentElement.dir = dir");
    expect(HOST_MESSAGE_TYPES).toContain("matrx:sandbox:theme");
  });
  it("the frame bundle swaps the app media module for the frame-safe twin", () => {
    const build = fs.readFileSync(path.join(root, "features/content-ir/sandbox/build-kind-sandbox.ts"), "utf8");
    expect(build).toContain("react/kind-media/AppKindMedia");
    expect(build).toContain("runtime/FrameKindMedia.tsx");
  });
});
