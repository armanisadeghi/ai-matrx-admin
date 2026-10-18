# Slack integration — a person's own Slack account

Slack OAuth v2 with a USER token (`channels:history`, `channels:read`, `chat:write`), sealed in the Vault by
aidream (`aidream/services/slack_integrations`). Replaces the retired demo callback (the official Slack MCP
needs a directory-published app, so it cannot be the connection path pre-launch).

- Card: `SlackConnectionCard.tsx` (Settings › Integrations, `native:slack`); hook `useSlackConnection.ts`;
  aidream calls in `service.ts` (`/slack/connection`, `/slack/connection/check`).
- Round trip (Hugging Face shape): `app/api/slack/oauth/start` → Slack → `app/api/slack/oauth/callback`
  (state + browser-proof cookie) → aidream `/slack/oauth/complete` → `app/api/slack/oauth/complete` popup page.
- The callback URL must be registered on the Slack app and listed in aidream `ALLOWED_REDIRECT_URIS`.
- `app/api/app_callback/[provider]` (old demo exchange) never logs or returns a token.
