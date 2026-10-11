// features/files/virtual-sources/adapters/notesHomeFolders.ts
//
// The /files notes tree has one directory per HOME (a scope — notes have no
// folders). A directory is named by its home's name; the organization is
// appended only when two visible homes share a name, so a person who works in
// one organization never sees an organization on a directory.

export interface HomeDirectory {
  scopeId: string;
  name: string;
  organizationName: string;
}

/** Virtual id of a home's directory. */
export function homeVidFromScopeId(scopeId: string): string {
  return `home:${scopeId}`;
}

/** The home a directory id stands for; null for anything that is not one. */
export function scopeIdFromHomeVid(vid: string): string | null {
  return vid.startsWith("home:") ? vid.slice("home:".length) : null;
}

/** Directory name per scope id: the home's name, plus " · <Organization>" where two homes share one. */
export function nameHomeDirectories(homes: readonly HomeDirectory[]): Map<string, string> {
  const holders = new Map<string, number>();
  for (const home of homes) {
    const key = home.name.toLocaleLowerCase();
    holders.set(key, (holders.get(key) ?? 0) + 1);
  }
  const names = new Map<string, string>();
  for (const home of homes) {
    const shared = (holders.get(home.name.toLocaleLowerCase()) ?? 0) > 1;
    names.set(home.scopeId, shared && home.organizationName ? `${home.name} · ${home.organizationName}` : home.name);
  }
  return names;
}
