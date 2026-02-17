# Chrome Extension Auth Setup -- Web App Side (ai-matrx-admin)

This document describes exactly what needs to happen in the web app to support proper Chrome extension authentication using `chrome.identity.launchWebAuthFlow`.

## Context

The Chrome extension needs to authenticate users against the same Supabase project as the web app. The recommended pattern is:

1. Extension uses `chrome.identity.launchWebAuthFlow()` to open a Supabase OAuth URL
2. Supabase redirects to Google/GitHub/Apple
3. Provider redirects back to Supabase
4. Supabase redirects to `https://<extension-id>.chromiumapp.org/` with tokens in the URL fragment
5. Chrome intercepts this redirect and passes the URL back to the extension
6. Extension extracts the access_token and refresh_token from the URL fragment

This flow works entirely with Supabase's built-in OAuth -- no custom consent screen, no code exchange, no intermediary API routes needed.

## Changes Required in This Project

### 1. Supabase Dashboard Configuration

Add the Chrome extension's redirect URL to the Supabase redirect allowlist:

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Under "Redirect URLs", add: `https://<EXTENSION-ID>.chromiumapp.org/`
   - The extension ID is visible at `chrome://extensions/` when loaded in developer mode
   - For published extensions, it's the permanent ID from the Chrome Web Store
   - You can also add a wildcard pattern: `https://*.chromiumapp.org/` for development

### 2. Delete the Extension Auth Code Exchange System

The following files implement a manual code-exchange pattern that is no longer needed. Delete them:

- `app/api/auth/extension/generate-code/route.ts`
- `app/api/auth/extension/exchange/route.ts`
- `utils/auth/extensionAuthHelper.ts`

Also delete the database table (run this SQL in Supabase):
```sql
DROP TABLE IF EXISTS extension_auth_codes;
```

### 3. No Other Changes Needed

The web app doesn't need any new routes, API endpoints, or callback handlers for the Chrome extension. The entire flow happens between the extension, Supabase Auth, and the OAuth provider. The web app is not involved at all in the extension's auth flow.

### 4. About the `/app/oauth/consent` Route

The OAuth consent screen (`app/oauth/consent/`) is for when your platform acts as an OAuth PROVIDER (e.g., "Sign in with AI Matrx" for third-party apps or MCP servers). This is a separate concern from the Chrome extension authentication and should be kept as-is. The Chrome extension does NOT use this consent screen -- it authenticates directly with Supabase via Google/GitHub OAuth.

## Architecture Diagram

```
Chrome Extension Auth Flow (no web app involvement):

Extension                    Supabase Auth               Google/GitHub
   │                              │                           │
   │  signInWithOAuth()           │                           │
   │  (via launchWebAuthFlow)     │                           │
   │─────────────────────────────>│                           │
   │                              │  redirect to provider     │
   │                              │──────────────────────────>│
   │                              │                           │
   │                              │  auth code callback       │
   │                              │<──────────────────────────│
   │                              │                           │
   │  redirect to extension       │                           │
   │  with tokens in URL fragment │                           │
   │<─────────────────────────────│                           │
   │                              │                           │
   │  Extract tokens from URL     │                           │
   │  Store in chrome.storage     │                           │
   │  Done -- user is logged in   │                           │
```
