/**
 * The Video clone item is on the Board. The catalog pulls the whole app under jest (the add-sections suite cannot
 * load either), so this reads the registration from source and the manifest from its module.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_CLONE_SURFACE_NAME, videoCloneManifest } from "@/features/surfaces/manifests/video-clone.manifest";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("video clone board item", () => {
  it("is in the catalog, under Web & social, started from a post link", () => {
    expect(read("items/catalog.ts")).toMatch(/\.\.\.VIDEO_CLONE_ITEMS/);
    const item = read("items/video-clone-items.tsx");
    expect(item).toMatch(/section: "social"/);
    expect(item).toMatch(/startNew: \{[^}]*Picker: ClonePicker/);
    expect(item).toMatch(/comments: null/);
    expect(item).toMatch(new RegExp(`surface: \\{ name: VIDEO_CLONE_SURFACE_NAME \\}`));
  });

  it("mounts the Socials studio itself, never a look-alike", () => {
    const item = read("items/video-clone-items.tsx");
    expect(item).toMatch(/<VideoProjectStudio projectId=/);
    expect(item).toMatch(/<CloneWorkspace /);
  });

  it("declares the project values an agent needs", () => {
    expect(videoCloneManifest.surfaceName).toBe(VIDEO_CLONE_SURFACE_NAME);
    const names = videoCloneManifest.values.map((v) => v.name);
    expect(names).toEqual(expect.arrayContaining(["project_loaded", "project_id", "head_version"]));
    for (const brief of videoCloneManifest.briefValues ?? []) expect(names).toContain(brief);
  });
});
