// Read never paints the note's raw markdown while the rich-content host is still loading.
// FAILS on the old code (EditInPlace/RichDocument rendered at once, and RichDocument's
// host-loading fallback prints `content` as plain text); passes with the host gate.
import fs from "node:fs";
import path from "node:path";

const core = fs.readFileSync(path.join(__dirname, "NoteEditorCore.tsx"), "utf8");
const bar = fs.readFileSync(path.join(__dirname, "NoteMetadataBar.tsx"), "utf8");

it("the Read branch renders the document only once the host has landed", () => {
  expect(core).toMatch(/const readRendererReady = useNoteRenderHost\(\)/);
  expect(core).toMatch(/\{readRendererReady && \(\s*<EditInPlace/);
});

it("the metadata bar asks for the note's view key only after the host landed", () => {
  expect(bar).toMatch(/hostLanded \? richDocumentViewKey\(/);
});
