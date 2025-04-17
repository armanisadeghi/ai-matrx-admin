import { OAuthProviderConfig } from "../types/oauth";

// Provider configurations
export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  slack: {
    name: "Slack",
    clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    authUrl: "https://slack.com/oauth/v2/authorize",
    redirectUri: `${process.env.NEXT_PUBLIC_SLACK_REDIRECT_URL}/app_callback/slack`,
    scopes: ["app_mentions:read", "channels:read", "chat:write", "commands", "files:read", "files:write", "users:read", "groups:read"],
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
  todoist: {
    name: "Todoist",
    clientId: process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID,
    authUrl: "https://todoist.com/oauth/authorize",
    redirectUri: `${process.env.NEXT_PUBLIC_TODOIST_REDIRECT_URL}/app_callback/todoist`,
    scopes: ["data:read", "data:read_write", "data:delete", "project:delete"],
    scopeDelimiter: ",",
    color: "red-600",
    textColor: "white",
    additionalParams: {
      state: "random_state_string" // In a real implementation, you'd generate a random state for CSRF protection
    },
    iconSvg: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19.36 5.17l-.09-.09l-3.6-3.6c-.34-.34-.86-.4-1.26-.14c-1.26.82-2.1 1.19-3.27 1.19c-1.67 0-3.16-.74-4.26-1.18c-.06-.03-.12-.04-.18-.04c-.22 0-.43.1-.57.27A.647.647 0 0 0 6 2c0 .22.11.43.29.56c.36.26.94.67 1.62 1.05C8.94 4.14 10 4.91 11.77 5c.97.04 1.97-.14 2.97-.45c.05-.02.12 0 .16.04l3.11 3.11c.06.06.08.13.04.2c-.17.48-.36.92-.58 1.32c-.18.33-.37.65-.61.95c-.11.13-.3.14-.41.03c-1.79-1.81-4.66-2.26-6.95-1.11c-2.3 1.15-3.76 3.42-3.76 5.93c0 .29.03.58.08.86c.05.29.34.45.62.34c.17-.07.3-.22.33-.4c.33-2.16 2.18-3.81 4.39-3.81c2.45 0 4.45 2 4.45 4.45c0 2.45-2 4.45-4.45 4.45c-1.67 0-3.13-.94-3.88-2.31c-.09-.16-.26-.27-.45-.27c-.19 0-.38.1-.48.27c-.1.19-.09.4.03.57C7.5 21.5 9.47 22.5 11.56 22.5c3.22 0 5.85-2.63 5.85-5.85c0-2.57-1.68-4.77-4-5.56c-.17-.06-.21-.28-.08-.41c.98-.98 1.72-2.08 2.13-3.32c.09-.26.17-.54.22-.81c.07-.37-.03-.74-.32-.95z" />
      </svg>
    ),
  },
  yahoo: {
    name: "Yahoo",
    clientId: process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID,
    authUrl: "https://api.login.yahoo.com/oauth2/request_auth",
    redirectUri: `${process.env.NEXT_PUBLIC_YAHOO_REDIRECT_URL}/app_callback/yahoo`,
    scopes: [
      "openid",
    ],
    scopeDelimiter: " ",
    color: "fuchsia-600",
    textColor: "white",
    additionalParams: {
      response_type: "code",
      language: "en-us"
    },
    iconSvg: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M11.993 4c.816 0 7.604.302 7.604 6.76 0 .25-.006 1.37-.365 1.37h-3.813c-.343 0-.365-.456-.365-.478.026-4.607-3.092-4.748-3.092-4.748-.132 0-3.118.133-3.118 4.748 0 .022-.022.478-.365.478H4.694c-.37 0-.377-1.12-.377-1.37C4.317 4.302 11.105 4 11.993 4zm-2.971 9.282c-.165 0-1.537 0-1.537 1.628v4.99c0 .112.052.1.14.1h2.785c.106 0 .139 0 .139-.113V15.13c0-.15.006-1.848-1.527-1.848zm5.942 0c-.165 0-1.537 0-1.537 1.628v4.99c0 .112.052.1.14.1h2.785c.106 0 .139 0 .139-.113V15.13c0-.15.006-1.848-1.527-1.848z" />
      </svg>
    ),
  },
};