/**
 * The browser-tab title of an agent's version page (`/agents/<id>/v/<n>`, `/agents/<id>/latest`):
 * "<agent name> · v<n>". A bare "v1" told a person with several agents open nothing. An unreadable
 * agent (denied, deleted) keeps the generic "Agent"; the page body says which it is.
 */
export function agentVersionTabTitle(agentName: string | null | undefined, version: number | null | undefined): string {
  const name = typeof agentName === "string" && agentName.trim() ? agentName.trim() : "Agent";
  return typeof version === "number" && Number.isInteger(version) && version > 0 ? `${name} · v${version}` : `${name} · Versions`;
}
