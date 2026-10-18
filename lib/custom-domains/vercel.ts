// lib/custom-domains/vercel.ts — the server-only door to the Vercel Domains API (see ./vercel-api).
import "server-only";

export { addDomain, checkDomain, isVercelConfigured, removeDomain, VercelUnavailable } from "./vercel-api";
