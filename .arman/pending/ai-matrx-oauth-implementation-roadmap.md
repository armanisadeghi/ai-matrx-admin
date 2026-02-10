# AI Matrx OAuth 2.1 — Implementation Roadmap

> **Status:** OAuth Server enabled, Dynamic Client Registration on, Consent Page built at `/oauth/consent`
>
> This document covers everything remaining to fully operationalize OAuth 2.1 across the AI Matrx ecosystem. Each section includes context, rationale, and a concrete task list.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [RLS Policies — Client-Aware Authorization](#2-rls-policies--client-aware-authorization)
3. [User Settings — Authorized Apps Management](#3-user-settings--authorized-apps-management)
4. [Custom Access Token Hook](#4-custom-access-token-hook)
5. [Python/FastAPI Backend Updates](#5-pythonfastapi-backend-updates)
6. [MCP Server Integration](#6-mcp-server-integration)
7. [First-Party App Registration (RealSingles, All Green, etc.)](#7-first-party-app-registration)
8. [Third-Party Developer Support (Future)](#8-third-party-developer-support-future)
9. [Internal Developer Guidelines](#9-internal-developer-guidelines)
10. [Monitoring & Admin](#10-monitoring--admin)
11. [Master Task List](#11-master-task-list)

---

## 1. Current State

What's already done:

- Supabase OAuth 2.1 Server enabled in project settings
- Dynamic OAuth App registration enabled (allows MCP clients to self-register)
- Authorization path set to `/oauth/consent`
- Consent page built at `https://aimatrx.com/oauth/consent` — handles `getAuthorizationDetails`, user authentication check, scope display, approve/deny flow, and redirect

What Supabase handles automatically (no code needed):

- OAuth 2.1 protocol (authorization code flow with PKCE)
- Token issuance (access tokens, refresh tokens, ID tokens)
- Token refresh and rotation
- JWKS endpoint for third-party token verification
- OpenID Connect discovery endpoints
- Dynamic client registration API
- Authorization code generation and validation (10-minute expiry)

---

## 2. RLS Policies — Client-Aware Authorization

### Why This Matters

OAuth access tokens are standard Supabase JWTs, but they include an additional `client_id` claim identifying which application is making the request. Without updated RLS policies, every OAuth client gets the exact same data access as a user logged into the AI Matrx web app directly. This is the single most important security boundary to implement.

### How It Works

- **No `client_id` in JWT** → Regular browser session (user on aimatrx.com directly)
- **`client_id` present** → Request is coming through an OAuth client (could be your own app, an MCP agent, or a third-party integration)
- Extract it in RLS with: `auth.jwt() ->> 'client_id'`

### Policy Strategy

Decide on access tiers:

- **First-party full access:** Your own registered apps (AI Matrx web, mobile, etc.) get the same access as a direct session. Whitelist their `client_id` values.
- **Third-party read-only (or scoped):** External clients and MCP agents get restricted access — likely read-only on specific tables like public profiles, and no access to sensitive data.
- **Blocked:** Certain tables should never be accessible via OAuth (payment details, internal admin data, etc.).

### Example Patterns

```sql
-- First-party apps get full access (same as direct session)
CREATE POLICY "first_party_full_access" ON user_data
  FOR ALL USING (
    auth.uid() = user_id
    AND (
      (auth.jwt() ->> 'client_id') IS NULL
      OR (auth.jwt() ->> 'client_id') IN (
        'your-web-app-client-id',
        'your-mobile-app-client-id'
      )
    )
  );

-- Third-party clients: read-only on public profiles
CREATE POLICY "oauth_client_read_profiles" ON public_profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() ->> 'client_id') IS NOT NULL
  );

-- Block OAuth clients from sensitive tables entirely
CREATE POLICY "no_oauth_access" ON payment_methods
  FOR ALL USING (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'client_id') IS NULL
  );
```

### Tasks

- [ ] **Audit all existing RLS policies** — identify every table with RLS enabled and determine which should be accessible via OAuth clients vs. first-party only
- [ ] **Define access tiers** — document which tables/operations are available to first-party apps, third-party apps, and MCP agents
- [ ] **Create a reference list of first-party `client_id` values** — after registering your own apps (Section 7), maintain a list that RLS policies can reference
- [ ] **Update RLS policies on all user-facing tables** — add `client_id` checks per the strategy above
- [ ] **Add RLS policies that block OAuth access to sensitive tables** — payment data, admin tables, internal config, etc.
- [ ] **Test policies** — verify first-party tokens get full access, third-party tokens get restricted access, and blocked tables reject OAuth tokens entirely

---

## 3. User Settings — Authorized Apps Management

### Why This Matters

Every OAuth provider (Google, GitHub, etc.) gives users a page to see what apps they've authorized and revoke access. Without this, users have no visibility into or control over which apps have access to their AI Matrx data. This is both a security requirement and a trust signal.

### API Methods

```typescript
// List all OAuth apps the user has authorized
const { data: grants } = await supabase.auth.oauth.listGrants()

// Revoke a specific app's access
// Immediately invalidates all sessions and refresh tokens for that client
const { error } = await supabase.auth.oauth.revokeGrant(clientId)
```

### What to Display Per Authorized App

- Application name
- When it was authorized (date)
- What scopes/permissions were granted
- A "Revoke Access" button with confirmation dialog

### Tasks

- [ ] **Create route `/settings/authorized-apps`** (or add a section to existing settings page)
- [ ] **Build the authorized apps list UI** — call `listGrants()` on mount, display each app with name, authorization date, scopes
- [ ] **Implement revoke functionality** — confirmation dialog → `revokeGrant(clientId)` → refresh the list
- [ ] **Handle empty state** — "No apps have been authorized to access your account"
- [ ] **Handle errors** — failed to load grants, failed to revoke
- [ ] **Add navigation** — link to this page from the main settings menu
- [ ] **Mobile responsive** — this page will be used on mobile too

---

## 4. Custom Access Token Hook

### Why This Matters

By default, OAuth access tokens include `user_id`, `role`, and `client_id`. If you need to customize tokens — for example, setting a specific `audience` claim so third-party APIs can validate tokens, adding custom permissions per client, or stripping claims for third-party clients — you configure a Custom Access Token Hook in Supabase.

This is optional but recommended if you plan to have different permission levels across clients or if any consuming service needs a specific `aud` claim.

### How It Works

- Hook fires on every token issuance, including OAuth flows
- Receives the `client_id` in the payload so you can branch logic per client
- Set up in Supabase Dashboard: Authentication → Hooks → Custom Access Token
- Implemented as a Postgres function or Edge Function

### Tasks

- [ ] **Decide if you need custom claims now** — if all clients get the same token shape and your RLS policies handle scoping, you can defer this
- [ ] **If needed: design the claim customization logic** — what changes per client? (audience, custom permissions, restricted claims)
- [ ] **Implement the hook** — Postgres function or Supabase Edge Function
- [ ] **Test with first-party and third-party tokens** — verify claims are correct for each case
- [ ] **Document the custom claims** — so developers consuming tokens know what to expect

---

## 5. Python/FastAPI Backend Updates

### Why This Matters

Your Python backend already validates Supabase JWTs from client requests. The only change is that tokens from OAuth clients will now contain a `client_id` claim. If any of your Python endpoints should behave differently for OAuth clients vs. direct sessions (rate limiting, restricted endpoints, audit logging), you need to handle that.

### What Changes

- JWT validation logic stays the same — the token is still a Supabase JWT, still signed the same way
- New claim available: `client_id` (present only for OAuth-issued tokens)
- Your Python endpoints may need to check `client_id` for authorization decisions, similar to what RLS does at the database level

### Tasks

- [ ] **Update JWT parsing to extract `client_id`** — make it available in your request context/dependency injection
- [ ] **Identify Python endpoints that should restrict OAuth client access** — any endpoint that should be first-party-only (admin operations, sensitive mutations, etc.)
- [ ] **Add authorization checks on restricted endpoints** — reject or limit requests with a `client_id` that isn't in the first-party whitelist
- [ ] **Add `client_id` to audit/request logging** — so you can track which OAuth client made which API calls
- [ ] **Consider rate limiting per `client_id`** — third-party clients may need different rate limits than your own apps

---

## 6. MCP Server Integration

### Why This Matters

This is one of the primary reasons you enabled OAuth 2.1. MCP (Model Context Protocol) allows AI agents and LLM tools to authenticate against your Supabase project and access user data with proper authorization. Your Python/FastAPI backend is where MCP servers will live.

### How It Works

- Point MCP servers at your Supabase Auth: `https://<project-ref>.supabase.co/auth/v1`
- MCP clients auto-discover OAuth config from: `https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`
- If dynamic registration is on (it is), MCP clients self-register as OAuth apps
- Users approve access via your consent page → MCP server receives tokens → makes authenticated requests

### Recommended: FastMCP

FastMCP has built-in Supabase Auth integration and handles OAuth config, token management, and auth flows automatically. Given your Python/FastAPI stack, this is the fastest path. See: https://gofastmcp.com/integrations/supabase

### Tasks

- [ ] **Evaluate FastMCP vs. building MCP auth manually** — FastMCP handles most of the boilerplate
- [ ] **Build a proof-of-concept MCP server** — connect it to your Supabase project, verify the full flow (discovery → registration → consent → token exchange → authenticated API call)
- [ ] **Define what data/tools MCP agents should access** — this directly informs your RLS policies (Section 2)
- [ ] **Test with an MCP client** (Claude Desktop, Cursor, etc.) — verify end-to-end auth works
- [ ] **Document the MCP server setup** — for your team to replicate across AI Matrx's 20+ applications

---

## 7. First-Party App Registration

### Why This Matters

If you want "Sign in with AI Matrx" on RealSingles, All Green, or your other projects, each one becomes an OAuth client registered with your Supabase project. For your own apps, pre-register them manually rather than using dynamic registration — this gives you known `client_id` values you can whitelist in RLS policies and more control over credentials.

### How to Register

Dashboard: Authentication → OAuth Server → OAuth Apps → Register a new app

For each app, provide:
- App name
- Redirect URI(s) — must exactly match what the app sends during authorization (protocol, domain, path, port)
- Store the `client_id` and `client_secret` securely — secret is shown only once

### What Each Client App Needs to Implement

Each app that wants "Sign in with AI Matrx" must implement the OAuth 2.1 Authorization Code flow with PKCE:

1. Generate a PKCE code verifier and challenge
2. Redirect user to `https://<project-ref>.supabase.co/auth/v1/oauth/authorize` with `client_id`, `redirect_uri`, `code_challenge`, `response_type=code`, and requested `scope`
3. Handle the callback — extract the authorization `code` from the redirect
4. Exchange the code for tokens via `POST /auth/v1/oauth/token` with the code, `code_verifier`, `client_id`, and `client_secret`
5. Store the access token and refresh token securely
6. Use the access token for API calls (Bearer token)
7. Handle refresh token rotation — a new refresh token may be issued on each refresh

### Tasks

- [ ] **Decide which AI Matrx projects need "Sign in with AI Matrx"** — list them out
- [ ] **Register each first-party app in Supabase Dashboard** — note down each `client_id`
- [ ] **Create a secure internal document** with all first-party `client_id` values — this is referenced by RLS policies and Python authorization logic
- [ ] **Implement OAuth 2.1 PKCE flow in each client app** — or create a shared SDK/library that handles it
- [ ] **Test the full flow per app** — authorize → consent → token exchange → API access → token refresh
- [ ] **For mobile apps (Expo/React Native):** Ensure redirect URIs work with deep linking — the Supabase GitHub discussion notes that `redirect_uri` must include the scheme (`http://`, `https://`, or custom scheme like `myapp://`)

---

## 8. Third-Party Developer Support (Future)

### Why This Matters

If AI Matrx ever opens up to third-party developers, partners, or a marketplace, the OAuth infrastructure you're building now is the foundation. This section is future planning — not immediate work.

### What You'd Need to Provide

- **Developer documentation** with:
  - Discovery URL
  - Available scopes (`openid`, `email`, `profile`, `phone`) and what each grants
  - Which APIs/tables are accessible via OAuth tokens
  - Rate limits for third-party clients
  - How to register an app (dynamically or through a developer portal)
- **A developer portal** for app registration, credential management, and analytics
- **Webhook notifications** when users revoke access
- **Custom scopes** (not yet supported by Supabase — on their roadmap) for fine-grained permissions beyond the standard OIDC scopes

### Tasks (Deferred — Capture for Planning)

- [ ] **Track Supabase's custom scope roadmap** — this will unlock fine-grained permission models for third-party apps
- [ ] **Design the developer portal UX** when the time comes
- [ ] **Draft third-party developer documentation** as a template — even if not published yet, having the structure helps
- [ ] **Define rate limits and usage policies** for third-party OAuth clients

---

## 9. Internal Developer Guidelines

### For All AI Matrx Developers

These are the key things every developer on the team needs to know now that OAuth is active.

**API requests may now come from OAuth clients, not just browser sessions.**
- The JWT will contain a `client_id` claim when the request originates from an OAuth client
- If `client_id` is absent, it's a regular browser session (user on aimatrx.com)
- Never assume all authenticated requests are from the web app

**When writing RLS policies:**
- Always consider whether the table should be accessible to OAuth clients
- Use `auth.jwt() ->> 'client_id'` to differentiate
- Default to blocking OAuth access on sensitive tables — opt in explicitly

**When writing Python/FastAPI endpoints:**
- Extract `client_id` from the JWT when available
- Add authorization checks on any endpoint that should be restricted to first-party apps
- Log `client_id` in request telemetry

**When building new features:**
- Ask: "Should this be accessible via a third-party app or AI agent?"
- If no, ensure the endpoint/table blocks OAuth access
- If yes, ensure RLS and API authorization allow it appropriately

### For Developers Building MCP Servers

- Authorization server URL: `https://<project-ref>.supabase.co/auth/v1`
- Use FastMCP with Supabase integration for the fastest setup
- Tokens are standard Supabase JWTs — use with Supabase client or as Bearer tokens to Python API
- Test the full flow: discovery → registration → consent → token exchange → authenticated API call
- Each MCP server should clearly define what data/tools it exposes and document them

### For Developers Integrating Other AI Matrx Products as OAuth Clients

- Register the app in Supabase Dashboard (don't use dynamic registration for first-party apps)
- Implement OAuth 2.1 Authorization Code flow with PKCE — no other grant types are supported
- Redirect URI must exactly match what's registered (protocol, domain, path, port)
- Store refresh tokens securely, handle rotation (new refresh token may be issued on each refresh)
- The `client_secret` is shown only once at registration — store it immediately in your secrets manager

### Tasks

- [ ] **Write an internal knowledge base article / Notion doc** summarizing the guidelines above
- [ ] **Brief the development team** — ensure everyone building features or APIs understands that OAuth clients now exist in the system
- [ ] **Add `client_id` awareness to your PR review checklist** — any new RLS policy or API endpoint should address OAuth access
- [ ] **Create a shared utility/helper** for extracting and checking `client_id` from JWTs (both TypeScript and Python)

---

## 10. Monitoring & Admin

### Why This Matters

With dynamic client registration enabled, any client can register with your project. You need visibility into what's registered and how it's being used.

### Tasks

- [ ] **Build an admin view of registered OAuth clients** — use the Supabase admin API (`supabase.auth.admin.oauth.listClients()`) to list all registered clients with their names, redirect URIs, and registration dates
- [ ] **Set up periodic review of registered clients** — monthly check for suspicious registrations (unknown redirect URIs, unusual names)
- [ ] **Monitor token issuance** — track how many OAuth tokens are being issued per client via Supabase logs or your own analytics
- [ ] **Set up alerts** — unusual spikes in registrations or token exchanges could indicate abuse
- [ ] **Document the process for revoking a malicious client** — admin deletes the client → all tokens invalidated

---

## 11. Master Task List

All tasks consolidated, grouped by priority.

### Priority 1 — Security Foundation (Do Now)

- [ ] Audit all existing RLS policies for OAuth client awareness
- [ ] Define access tiers (first-party full, third-party restricted, blocked)
- [ ] Update RLS policies on all user-facing tables with `client_id` checks
- [ ] Block OAuth access on sensitive tables (payments, admin, internal config)
- [ ] Update Python JWT parsing to extract and expose `client_id`
- [ ] Add authorization checks to Python endpoints that should be first-party only
- [ ] Test RLS and API authorization with both regular sessions and OAuth tokens

### Priority 2 — User-Facing Features (Do Soon)

- [ ] Build authorized apps management page (`/settings/authorized-apps`)
- [ ] Implement list grants and revoke functionality
- [ ] Add `client_id` to audit/request logging (Python)

### Priority 3 — Cross-App Auth (Do When Ready)

- [ ] Decide which AI Matrx projects need "Sign in with AI Matrx"
- [ ] Register each first-party app in Supabase Dashboard
- [ ] Create secure internal document of all first-party `client_id` values
- [ ] Implement OAuth 2.1 PKCE flow in each client app (or build shared SDK)
- [ ] Test full auth flow per app including token refresh

### Priority 4 — MCP Integration (Do In Parallel)

- [ ] Evaluate FastMCP vs. manual MCP auth implementation
- [ ] Build proof-of-concept MCP server with Supabase Auth
- [ ] Define what data/tools MCP agents should access
- [ ] Test with MCP client (Claude Desktop, Cursor, etc.)
- [ ] Document MCP server setup for the team

### Priority 5 — Team Enablement (Do Alongside Everything)

- [ ] Write internal developer guidelines doc
- [ ] Brief development team on OAuth implications
- [ ] Add `client_id` awareness to PR review checklist
- [ ] Create shared `client_id` extraction utilities (TypeScript + Python)

### Priority 6 — Operations & Admin

- [ ] Build admin view of registered OAuth clients
- [ ] Set up periodic client registration review process
- [ ] Set up monitoring/alerts for token issuance anomalies
- [ ] Document process for revoking malicious clients

### Priority 7 — Custom Token Claims (If/When Needed)

- [ ] Decide if custom access token claims are needed
- [ ] Design claim customization logic per client
- [ ] Implement Custom Access Token Hook
- [ ] Test and document custom claims

### Priority 8 — Future (Capture for Planning)

- [ ] Track Supabase custom scope roadmap
- [ ] Design third-party developer portal
- [ ] Draft third-party developer documentation template
- [ ] Define rate limits and usage policies for third-party clients
- [ ] Consider rate limiting per `client_id` in Python backend
