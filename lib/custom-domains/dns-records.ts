// lib/custom-domains/dns-records.ts — what an organization puts at its DNS provider, and what a
// domain's state means (pure; unit-tested). Vercel's own recommendations win; the documented
// defaults (A 76.76.21.21, CNAME cname.vercel-dns.com) stand in only when Vercel names none.

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  /** The record name as a DNS provider asks for it: "@" for the apex, else the label(s). */
  name: string;
  value: string;
  /** Why the record is needed: routing, or proving ownership to Vercel. */
  purpose: "routing" | "ownership";
}

export interface DomainState {
  onProject: boolean;
  verified: boolean;
  misconfigured: boolean;
  records: DnsRecord[];
}

export type DomainStatus = "pending" | "verifying" | "live" | "failed" | "removed";

const DEFAULT_A = "76.76.21.21";
const DEFAULT_CNAME = "cname.vercel-dns.com";

/** Two-label hosts (yourbusiness.com) are apex; a few common two-part suffixes are honoured. */
const TWO_PART_SUFFIXES = new Set(["co.uk", "org.uk", "com.au", "co.nz", "com.br", "co.za", "co.jp", "com.mx"]);

export function apexOf(host: string): string {
  const labels = host.split(".");
  const lastTwo = labels.slice(-2).join(".");
  return labels.slice(TWO_PART_SUFFIXES.has(lastTwo) ? -3 : -2).join(".");
}

export function isApex(host: string): boolean {
  return apexOf(host) === host;
}

export function dnsRecordsFor(
  host: string,
  hints: {
    ipv4?: string;
    cname?: string;
    verification?: Array<{ type: string; domain: string; value: string }>;
  },
): DnsRecord[] {
  const apex = apexOf(host);
  const relative = (fqdn: string) => (fqdn === apex ? "@" : fqdn.endsWith(`.${apex}`) ? fqdn.slice(0, -apex.length - 1) : fqdn);
  const routing: DnsRecord = isApex(host)
    ? { type: "A", name: "@", value: hints.ipv4 || DEFAULT_A, purpose: "routing" }
    : { type: "CNAME", name: relative(host), value: (hints.cname || DEFAULT_CNAME).replace(/\.$/, ""), purpose: "routing" };
  const ownership: DnsRecord[] = (hints.verification ?? [])
    .filter((v) => v.type.toUpperCase() === "TXT")
    .map((v) => ({ type: "TXT", name: relative(v.domain), value: v.value, purpose: "ownership" }));
  return [routing, ...ownership];
}

/** live only when Vercel both owns the domain for the project and sees the DNS pointing at it. */
export function statusFor(state: DomainState): DomainStatus {
  if (!state.onProject) return "failed";
  return state.verified && !state.misconfigured ? "live" : "verifying";
}
