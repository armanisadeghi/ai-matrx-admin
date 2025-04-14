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

// Twitter-specific types
export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
}

export interface TwitterTokenResponse extends OAuthBaseResponse {
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  user?: TwitterUser;
}

// Todoist-specific types
export interface TodoistUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  premium?: boolean;
}

export interface TodoistTokenResponse extends OAuthBaseResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user?: TodoistUser;
}

// Yahoo-specific types
export interface YahooUser {
  guid: string;
  familyName: string;
  givenName: string;
  nickname?: string;
  displayName?: string;
  emails: { handle: string; id?: string; primary?: boolean; type?: string }[];
  imageUrl?: string;
}

export interface YahooTokenResponse extends OAuthBaseResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  xoauth_yahoo_guid: string;
  scope?: string;
  user?: YahooUser;
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