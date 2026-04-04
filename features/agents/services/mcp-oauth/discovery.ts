export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
}

export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
}

export async function fetchProtectedResourceMetadata(
  mcpServerUrl: string,
): Promise<ProtectedResourceMetadata | null> {
  const origin = new URL(mcpServerUrl).origin;
  const url = `${origin}/.well-known/oauth-protected-resource`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProtectedResourceMetadata;
  } catch {
    return null;
  }
}

export async function fetchAuthServerMetadata(
  authServerUrl: string,
): Promise<AuthServerMetadata | null> {
  const origin = new URL(authServerUrl).origin;

  const urls = [
    `${origin}/.well-known/oauth-authorization-server`,
    `${origin}/.well-known/openid-configuration`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        return (await res.json()) as AuthServerMetadata;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export interface DiscoveryResult {
  protectedResource: ProtectedResourceMetadata;
  authServer: AuthServerMetadata;
}

export async function discoverOAuthEndpoints(
  mcpServerUrl: string,
): Promise<DiscoveryResult> {
  const protectedResource = await fetchProtectedResourceMetadata(mcpServerUrl);
  if (!protectedResource) {
    throw new Error(
      `No protected resource metadata at ${mcpServerUrl}. Server may not support OAuth discovery.`,
    );
  }

  const authServerUrls = protectedResource.authorization_servers ?? [
    new URL(mcpServerUrl).origin,
  ];

  let authServer: AuthServerMetadata | null = null;
  for (const serverUrl of authServerUrls) {
    authServer = await fetchAuthServerMetadata(serverUrl);
    if (authServer) break;
  }

  if (!authServer) {
    throw new Error(
      `Could not discover auth server metadata for ${mcpServerUrl}`,
    );
  }

  return { protectedResource, authServer };
}

export interface DynamicClientRegistrationResult {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
}

export async function registerDynamicClient(
  registrationEndpoint: string,
  params: {
    redirectUri: string;
    clientName?: string;
    grantTypes?: string[];
    responseTypes?: string[];
    scope?: string;
  },
): Promise<DynamicClientRegistrationResult> {
  const body = {
    redirect_uris: [params.redirectUri],
    client_name: params.clientName ?? "AI Matrx",
    grant_types: params.grantTypes ?? ["authorization_code", "refresh_token"],
    response_types: params.responseTypes ?? ["code"],
    token_endpoint_auth_method: "none",
    scope: params.scope,
  };

  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Dynamic client registration failed (${res.status}): ${text}`,
    );
  }

  return (await res.json()) as DynamicClientRegistrationResult;
}
