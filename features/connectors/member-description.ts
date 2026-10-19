/**
 * The line a MEMBER reads for one ability on the Connectors page. Catalog rows carry an internal description
 * (setup notes, scopes, blocked actions) written for builders; a member never sees it. Only an admin with the
 * admin debug view on gets the internal text. Everyone else gets a short plain line made from the name.
 */
export function memberDescription(name: string): string {
  return `Lets your agents work with ${name} for you.`;
}

export function describeForViewer(
  entry: { name: string; description: string | null },
  showInternal: boolean,
): string {
  if (showInternal && entry.description) return entry.description;
  return memberDescription(entry.name);
}
