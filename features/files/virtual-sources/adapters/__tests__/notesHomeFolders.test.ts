import { homeVidFromScopeId, nameHomeDirectories, scopeIdFromHomeVid } from "../notesHomeFolders";

describe("the /files notes tree: one directory per home", () => {
  it("names a directory by its home; the organization only when two homes share a name", () => {
    const names = nameHomeDirectories([
      { scopeId: "a", name: "Prompts/Agents", organizationName: "Matrx" },
      { scopeId: "b", name: "General", organizationName: "Titanium" },
      { scopeId: "c", name: "General", organizationName: "Harbor Dental Group" },
    ]);
    expect(names.get("a")).toBe("Prompts/Agents");
    expect(names.get("b")).toBe("General · Titanium");
    expect(names.get("c")).toBe("General · Harbor Dental Group");
  });

  it("round-trips the directory id and refuses anything else", () => {
    expect(scopeIdFromHomeVid(homeVidFromScopeId("scope-1"))).toBe("scope-1");
    expect(scopeIdFromHomeVid("folder:Draft")).toBeNull();
  });
});
