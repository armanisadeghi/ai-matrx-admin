// A template's cover-library photo travels with Use template: the installed root page stores the same
// `gallery:<key>` value, and drawing it resolves to our own CDN photo (never a third-party link). The bundled
// gallery keys the pack checker knows (lib/spaces-blocks/cover-library BUNDLED_COVER_KEYS) are exactly the ones
// Spaces draws.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import { BUNDLED_COVER_KEYS, COVER_LIBRARY } from "@/lib/spaces-blocks/cover-library";

import type { SpaceDoc, SpacesStore } from "../../contract";
import { COVER_GALLERY, COVER_PHOTOS, galleryImage } from "../../page/gallery";
import { makeTemplatePages, type PackRun, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const photo = COVER_LIBRARY[0];
const cover = { url: `gallery:${photo.key}`, offsetY: 50 };
const template = {
  pack: {
    cover,
    pages: [
      { key: "home", title: "Dental Practice", parent: null, cover, blocks: [] },
      { key: "guide", title: "Guide", parent: "home", blocks: [] },
    ],
  },
} as unknown as SpaceTemplateFull;

function world() {
  const docs = new Map<string, SpaceDoc>();
  let n = 0;
  const make = (title: string) => {
    const doc = { id: `doc-${++n}`, title, blocks: [], version: 1, cover: null } as unknown as SpaceDoc;
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { title?: string }) => make(input.title ?? ""),
    get: async (id: string) => docs.get(id) ?? null,
    save: async (doc: SpaceDoc) => {
      const next = { ...docs.get(doc.id)!, ...doc, version: docs.get(doc.id)!.version + 1 };
      docs.set(doc.id, next);
      return next;
    },
    archive: async () => undefined,
  } as unknown as SpacesStore;
  let saved: PackRun | null = null;
  const journal: PackRunJournal = { read: () => saved, write: (run) => void (saved = run) };
  return { store, journal, createRoot: async (title: string) => make(title), docs };
}

describe("a cover-library photo installs with the template", () => {
  it("the installed root page carries the template's cover and draws our CDN photo", async () => {
    const w = world();
    const root = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal);
    expect(root.cover).toEqual(cover);
    expect(galleryImage(root.cover && "url" in root.cover ? root.cover.url : "")).toBe(photo.src);
    expect(galleryImage(cover.url, true)).toBe(photo.thumb);
    expect(photo.src.startsWith("https://cdn.matrxserver.com/")).toBe(true);
  });

  it("the checker's bundled keys are exactly the gallery Spaces draws", () => {
    expect([...BUNDLED_COVER_KEYS].sort()).toEqual([...Object.keys(COVER_GALLERY), ...COVER_PHOTOS.map((p) => p.key)].sort());
  });
});
