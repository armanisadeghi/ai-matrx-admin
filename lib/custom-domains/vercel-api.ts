// lib/custom-domains/vercel-api.ts — the Vercel Domains API for organization custom domains.
// Plain fetch, no "server-only" marker, so proxy.ts can re-check a waiting host; app code imports
// it through ./vercel (which carries the marker).
//
// Token: VERCEL_API_TOKEN, the team token "ai-matrx server: custom domains" (AI Matrx org Vault item
// "Vercel — custom domains"; Vercel project env; .env.local). The project and team are the ai-matrx
// Vercel project that serves aimatrx.com; both ids are non-secret and overridable for another project.
// Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md

import { dnsRecordsFor, type DomainState } from "./dns-records";

const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_ZIeMm2FW8RgOAO9BJgQ2YQcXpwrH";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_zWxJHqDHuRr1kpl9Hu9oON3g";
const API = "https://api.vercel.com";
const TIMEOUT_MS = 15_000;

export class VercelUnavailable extends Error {}

export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN);
}

interface VercelError {
  error?: { code?: string; message?: string };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T & VercelError }> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new VercelUnavailable("VERCEL_API_TOKEN is not set on this server.");
  const sep = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API}${path}${sep}teamId=${TEAM_ID}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & VercelError;
  return { status: response.status, data };
}

interface ProjectDomain {
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason: string }>;
}

interface DomainConfig {
  misconfigured?: boolean;
  recommendedIPv4?: Array<{ rank: number; value: string[] }>;
  recommendedCNAME?: Array<{ rank: number; value: string }>;
}

function fail(what: string, status: number, data: VercelError): never {
  throw new VercelUnavailable(`Vercel ${what} answered ${status}: ${data.error?.message ?? data.error?.code ?? "no detail"}`);
}

/** Reads the domain on the project + its DNS config (verifying first when still unverified). */
async function readState(host: string, tryVerify: boolean): Promise<DomainState> {
  let domain = await call<ProjectDomain>("GET", `/v9/projects/${PROJECT_ID}/domains/${host}`);
  if (domain.status === 404) return { onProject: false, verified: false, misconfigured: true, records: [] };
  if (domain.status >= 400) fail("domain read", domain.status, domain.data);
  if (tryVerify && !domain.data.verified) {
    const verified = await call<ProjectDomain>("POST", `/v9/projects/${PROJECT_ID}/domains/${host}/verify`);
    // 400 = still not verifiable (the TXT record is not there yet); keep the last answer.
    if (verified.status < 400) domain = verified;
  }
  const config = await call<DomainConfig>("GET", `/v6/domains/${host}/config`);
  if (config.status >= 400) fail("DNS config", config.status, config.data);
  return {
    onProject: true,
    verified: Boolean(domain.data.verified),
    misconfigured: config.data.misconfigured !== false,
    records: dnsRecordsFor(host, {
      ipv4: config.data.recommendedIPv4?.[0]?.value?.[0],
      cname: config.data.recommendedCNAME?.[0]?.value,
      verification: domain.data.verification,
    }),
  };
}

export async function addDomain(host: string): Promise<DomainState> {
  const added = await call<ProjectDomain>("POST", `/v10/projects/${PROJECT_ID}/domains`, { name: host });
  if (added.status < 400) return readState(host, false);
  // Already on THIS project (a retry) is fine; on another project or account it is Vercel's refusal.
  const existing = await readState(host, false);
  if (existing.onProject) return existing;
  fail("add", added.status, added.data);
}

export async function checkDomain(host: string): Promise<DomainState> {
  return readState(host, true);
}

export async function removeDomain(host: string): Promise<void> {
  const removed = await call<unknown>("DELETE", `/v9/projects/${PROJECT_ID}/domains/${host}`);
  if (removed.status >= 400 && removed.status !== 404) fail("remove", removed.status, removed.data);
}
