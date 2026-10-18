# Notion integration — a person's own Notion workspaces

Notion public OAuth (AI Matrx's Notion app), token sealed in the Vault by aidream
(`aidream/api/routers/notion_connection.py`, mounted at `/notion`). One person can connect several workspaces.

- Card: `NotionConnectionCard.tsx` (Settings › Integrations, `native:notion`); hook `useNotionConnection.ts`;
  aidream calls in `service.ts` (`/notion/connection`, `/notion/connection/check`, `DELETE ?connection_id=`).
- Round trip (Slack shape): `app/api/notion/oauth/start` → Notion → `app/api/notion/oauth/callback`
  (state + browser-proof cookie; Notion sends `code`, `state`, and `error` on refusal) → aidream
  `/notion/oauth/complete` → `app/api/notion/oauth/complete` popup page.
- The callback URL must be registered on the Notion app and listed in aidream `ALLOWED_REDIRECT_URIS`.
