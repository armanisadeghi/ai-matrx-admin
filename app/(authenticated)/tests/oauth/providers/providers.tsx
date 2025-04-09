import { OAuthProviderConfig } from "../types/oauth";

// Provider configurations
export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  slack: {
    name: "Slack",
    clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    authUrl: "https://slack.com/oauth/v2/authorize",
    redirectUri: `${process.env.NEXT_PUBLIC_SLACK_REDIRECT_URL}/app_callback/slack`,
    scopes: ["chat:write", "channels:read", "team:read", "users:read"],
    scopeDelimiter: ",",
    color: "purple-600",
    textColor: "white",
    iconSvg: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
      </svg>
    ),
  },
  microsoft: {
    name: "Microsoft Office",
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    redirectUri: `${process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URL}/app_callback/microsoft`,
    scopes: [
      "offline_access",
      "user.read",
      "files.read",
      "mail.read",
      "calendars.read",
    ],
    scopeDelimiter: " ",
    color: "blue-600",
    textColor: "white",
    additionalParams: {
      response_type: "code",
      response_mode: "query",
    },
    iconSvg: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M11.5 5.5H5.5v13h6v-13zm1 0v13h6v-13h-6z" />
      </svg>
    ),
  },
  twitter: {
    name: "Twitter (X)",
    clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
    authUrl: "https://twitter.com/i/oauth2/authorize",
    redirectUri: `${process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URL}/app_callback/twitter`,
    scopes: ["tweet.read", "users.read", "offline.access"],
    scopeDelimiter: " ",
    color: "black",
    textColor: "white",
    additionalParams: {
      response_type: "code",
      code_challenge: "challenge", // In a real implementation, you'd generate a proper PKCE challenge
      code_challenge_method: "plain"
    },
    iconSvg: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
};