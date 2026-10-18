// lib/custom-domains/request-host.ts — the path a visitor follows BACK on the host they are on.
// On a business's custom domain a form lives at "/intake", not /f/<id> (which 404s there), so return
// and "start again" links built by the public APIs go through this. Our own hosts keep the internal path.

import { hostClass, normalizeHost, publicPathFor } from "./host-routing";
import { lookupDomain } from "./lookup";

export async function pathOnRequestHost(request: Request, internalPath: string): Promise<string> {
  const host = request.headers.get("host");
  if (!host || hostClass(host, []) === "platform") return internalPath;
  try {
    const domain = await lookupDomain(normalizeHost(host));
    return (domain && publicPathFor(internalPath, domain)) ?? internalPath;
  } catch (error) {
    console.error(`[custom-domain] back-link lookup failed for ${host}:`, error);
    return internalPath;
  }
}
