import { OAuthProviderConfig } from '../types/oauth';

/**
 * Initiates OAuth flow for the specified provider
 */
export function startOAuthFlow(provider: OAuthProviderConfig): void {
  if (!provider.clientId) {
    console.error(`${provider.name} client ID is not configured.`);
    return;
  }

  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    scope: provider.scopes.join(provider.scopeDelimiter),
  });

  // Add any additional parameters
  if (provider.additionalParams) {
    Object.entries(provider.additionalParams).forEach(([key, value]) => {
      params.append(key, value);
    });
  }

  const authUrl = `${provider.authUrl}?${params.toString()}`;
  
  console.log(`Starting OAuth flow for ${provider.name}`, authUrl);
  
  // Redirect to the authorization URL
  window.location.href = authUrl;
}

/**
 * Exchanges an authorization code for a token
 */
export async function exchangeCodeForToken(provider: string, code: string) {
  console.log(`Exchanging code for ${provider} token`);
  
  try {
    const response = await fetch(`/app_callback/${provider}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error exchanging code for ${provider} token:`, errorData);
      throw new Error(errorData.error || `Failed to authenticate with ${provider}`);
    }

    const data = await response.json();
    console.log(`Successfully exchanged code for ${provider} token`);
    return data;
  } catch (error) {
    console.error(`Error exchanging code for ${provider} token:`, error);
    throw error;
  }
}

/**
 * Generates mock data for a specific provider (for demo purposes)
 */
export function generateMockData(provider: string) {
  switch (provider) {
    case 'slack':
      return {
        ok: true,
        access_token: 'xoxb-mock-slack-token-12345',
        token_type: 'bot',
        scope: 'app_mentions:read,channels:read,chat:write,commands,files:read,files:write,users:read,groups:read',
        bot_user_id: 'U01MOCK123',
        app_id: 'A01MOCK456',
        team: {
          id: 'T01MOCK789',
          name: 'Mock Workspace',
          domain: 'mockworkspace'
        },
        authed_user: {
          id: 'U01MOCKUSER',
          name: 'mockuser',
          email: 'mock@example.com'
        }
      };
    // Other providers remain the same
    case 'microsoft':
      return {
        access_token: 'eyJ0eXAiOiJKV1QiLCJub25jZSI6IlVhU...MOCK_TOKEN',
        token_type: 'Bearer',
        expires_in: 3599,
        scope: 'offline_access user.read files.read mail.read calendars.read',
        refresh_token: 'M.R3_BAY...MOCK_REFRESH_TOKEN',
        user: {
          displayName: 'John Doe',
          givenName: 'John',
          surname: 'Doe',
          mail: 'john.doe@example.com',
          userPrincipalName: 'john.doe@example.com',
          id: '12345678-1234-1234-1234-123456789012'
        }
      };
    // Add other providers as before
    default:
      return {
        access_token: 'mock-token-for-' + provider,
        token_type: 'bearer',
        scope: 'read,write'
      };
  }
}