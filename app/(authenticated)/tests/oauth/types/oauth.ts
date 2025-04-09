// Base OAuth response with common fields
export interface OAuthBaseResponse {
  access_token: string;
  token_type: string;
  scope?: string;
}

// Slack-specific types
export interface SlackTeam {
  id: string;
  name: string;
  domain?: string;
}

export interface SlackUser {
  id: string;
  name?: string;
  email?: string;
}

export interface SlackTokenResponse extends OAuthBaseResponse {
  ok: boolean;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: SlackTeam;
  authed_user: SlackUser;
  error?: string;
}

// Microsoft-specific types
export interface MicrosoftUser {
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName: string;
  id: string;
}

export interface MicrosoftTokenResponse extends OAuthBaseResponse {
  expires_in: number;
  ext_expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  user?: MicrosoftUser;
}

// Provider configuration for UI
export interface OAuthProviderConfig {
  name: string;
  clientId: string | undefined;
  authUrl: string;
  redirectUri: string;
  scopes: string[];
  scopeDelimiter: string;
  color: string;
  textColor?: string;
  additionalParams?: Record<string, string>;
  iconSvg: React.ReactElement;
}

// Provider state information
export interface ProviderState {
  isLoading: boolean;
  isConnected: boolean;
  token: string | null;
  data: any | null;
  error: string | null;
}