# Secrets — Unified Credential Vault

> **Status:** active · **Tier:** 1 · **Owners:** platform · **Updated:** 2026-10-16

> Cross-repo implementation authority: `/Users/armanisadeghi/code/common-docs/systems/account/vault-secrets/FEATURE.md` — read it before expanding this feature in ANY repository.
>
> **Follow-on, in progress:** `/Users/armanisadeghi/code/common-docs/projects/credential-sharing-browser-login/REGISTER.md` (ratified 2026-07-26) — destination-login items, one-to-one sharing/transfer/assignment, and agent-safe browser login. Read it before touching scopes, sharing, transfer, or item metadata.
>
> **Cloud Browser follow-on:** `/Users/armanisadeghi/code/common-docs/systems/web/persistent-cloud-browser/FEATURE.md` — read it before adding server-side profile login, unattended credential use, MFA delegation, session-health automation, or Cloud Browser controls.
>
> **Picking this up cold?** `/Users/armanisadeghi/code/common-docs/projects/credential-sharing-browser-login/REGISTER.md` — vision, gap analysis, cross-repo architecture, next steps, and landmines. Start there.

ONE definition-driven vault for both principals — personal and organization — covering env values, API keys, logins, tokens, service accounts, and multi-field credential bundles. A **credential item** (`users.credential_items`) owns one or more encrypted **fields** (`users.user_secrets`); non-secret **definitions and provider presets** come from Remote Catalogs (`public.catalog_entries`, kind `credential_definition`, app `matrx`, 120+ active).

Items may also own multiple encrypted **protected files**
(`users.credential_attachments`) such as signing keys, certificates, and
recovery exports. Attachment metadata is shown as explicit labeled values
(label, filename, purpose, type/size, protection); bytes never enter list JSON,
Redux, storage, URLs, or logs.

## The one workspace — `@ai-matrx/vault`

Every Vault screen is the shared package `@ai-matrx/vault` (source `aidream/apps/shared/vault`, its own `FEATURE.md`): the same `VaultApp` the browser extension and the desktop app render. This folder keeps no screen. [`components/WebVault.tsx`](./components/WebVault.tsx) is the website's host and supplies identity only:

- port: `createApiVaultPort(serverApi, { userState: supabase, platformDoor: supabase.schema("platform"), passkeys: supabase.auth })` — `serverApi` (`lib/api/server-api.ts`) is the app's one `@ai-matrx/api` client;
- host: `identity: createSupabaseIdentity(supabase.auth, { redirectTo })`, `knobs: createVaultKnobs(supabase, { organizationId, userId })` (the placement's organization, else the active one), `openUrl` through `openOutbound`, `notify` through `@/lib/toast`;
- styles: `@source "../node_modules/@ai-matrx/vault/dist"` in `app/globals.css`.

Placements:

| Where | How the location is kept |
|---|---|
| `/vault`, `/vault/[itemId]` (`VaultRouteBody`) | Item id in the path, everything else in query params (`locationToParams` / `locationFromParams`); writes go through `push/replaceAddressWithoutNavigating` (no RSC round trip, no remount) |
| `/vault/authenticator` | Redirects to `/vault?view=authenticator` |
| `/vault/approve-browser?key=&label=[&kind=]` | Redirects to `/vault?panel=approve:<key>&label=…`; the host carries `label`/`kind` while that panel is open |
| Vault window (`features/window-panels/windows/vault/VaultWindow.tsx`) | In memory; persisted as `{ selectedItemId, location }` (query text, never a value) |
| Organization page vault section (`OrganizationVault`, `OrgManage.tsx`) | In memory, opened on `vault=<organizationId>` |

"Add a login" elsewhere (`features/marketing/social/gated/CloudCaptureButton.tsx`) opens the Vault window at `mode=new&kind=website_login&url=…` and re-reads its logins when the window closes.

## What else this folder still holds (and who uses it)

Hand-written transport kept only for consumers outside the Vault screens; each is a candidate to move onto the package's port (`createApiVaultPort`) or `@ai-matrx/api/account` and then be deleted:

| Export | Used by |
|---|---|
| `fetchVaultItems`, type `VaultItem` | `features/marketing/connections/DomainConnections.tsx`, `features/marketing/news-monitor/DeliveryControls.tsx` (credential pickers) |
| `createVaultItem` | `features/spaces/io/NotionImport.tsx`, `features/unified-data/base/AirtableImportDialog.tsx` |
| `getVaultExportActor`, `confirmVaultPasswordIdentity`, `restoreVaultItem`, `VaultRestoreTransportError`, `VaultIdentityConfirmationError`, types `VaultRestoreResult` / `VaultVerifiedExportActor` | `app/(core)/trash/page.tsx`, `features/trash/VaultTrashRestoreDialog.tsx` |
| `fetchOrganizationVaultMemberAccess`, `setOrganizationVaultMemberAccess` (via `components/MemberVaultAccessControl.tsx`) | `features/organizations/components/MemberManagement.tsx` |
| `webVaultIdentity`, `webVaultSignIn` (`webVaultIdentity.ts`): the web's ONE "Confirm it's you" (Google, password, email code; a different account back from Google is signed out of this device) and sign-in door | `components/WebVault.tsx`, `features/sharing/secure/SecureLinkPanel.tsx` (through `@ai-matrx/vault` `IdentityGate`) |
| `safeVaultLoginUrl` (`utils.ts`) | `features/organizations/provider-accounts/ProviderAccountsSection.tsx` |

## Item/field model and handling doctrine

Every field carries exactly three controls (independent; catalog definitions provide defaults):

| Control               | Values       | Meaning                                                                                                              |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `handling`            | `visible`    | Shown to any authorized viewer (still encrypted at rest); FE shows it via `POST /api/vault/resolve` under `can_use`. |
|                       | `revealable` | Masked; explicit audited reveal via `POST /api/vault/items/{id}/reveal` under `can_reveal`.                          |
|                       | `sealed`     | NO human path, ever — only trusted execution resolves it. The API refuses structurally.                              |
| `editable`            | bool         | Whether a human may change the value (integration-managed tokens are `false`).                                       |
| `inject_into_sandbox` | bool         | Whether the field enters authorized sandbox environments. **REQUIRES an env alias in `key`** — see below.            |

`user_secrets.key` is the **optional env alias** (`VALID_KEY_RE`); `field_key` is the stable lowercase-snake identity within the item. Legacy single-value rows are one-field `env_value` items.

**Sandbox injection REQUIRES an env alias.** A container environment is a NAME→value map; a field with no `key` has nowhere to land, so the resolver drops it. The server refuses `inject_into_sandbox=true` with no alias (422, `SandboxInjectionWithoutEnvKeyError`) and a DB CHECK makes the state unrepresentable. The UI may keep the switch interactive, but turning it on without a runtime key must show a focused reminder and move focus to the runtime-key input; it must never build the invalid request. Until 2026-07-26 the toggle was live on keyless fields and flipping it "succeeded" while the value silently never reached any sandbox — the exact class this rule kills. Note that catalog definitions `env_value` and `visible_config` ship `inject_into_sandbox: true` with no default alias, so prompting for the key is the NORMAL path there, not an edge case.

Field metadata (inject flag, env alias set/clear, description, `is_active`, handling, `editable`) is edited via `PATCH /api/vault/items/{id}/fields/{fid}` — there is NO direct client write path to `users.user_secrets` (all client write grants were revoked in Phase 1). **Sealing is a one-way door:** the UI confirms with a cannot-be-undone warning, a sealed field shows a lock and no unseal control, and the server 403s any change away from `sealed`. Sharing carries per-recipient grants (`grantees: [{user_id, can_use, can_manage}]`).

## Trust boundary — two data paths, one per operation

1. **Masked metadata → DIRECT Supabase.** Items + fields + catalog definitions are read via supabase-js with the **explicit column lists** `CREDENTIAL_ITEM_COLUMNS` / `VAULT_FIELD_COLUMNS` (`types.ts`). `users.user_secrets.value_encrypted` is unreadable by client roles — **never `select *` on these tables.** Scope is declared per THE VIEW LAW; RLS provides owner reads, org-member masked reads, personal-grantee reads, and self-reads on `user_secret_grants`.
2. **Everything value-bearing or mutating → aidream `/api/vault/*`** (the package's `createApiVaultPort` over `@ai-matrx/api`; the few kept `vault-service.ts` calls above). The legacy `/api/user-secrets` + `/api/organization-secrets` routes are server-side aliases only — this FE must never call them.

Every Vault and Authenticator aidream transport requires the explicitly
selected request organization from `appContext.organization_id` and sends it
through `lib/api/organization-context.ts` as `X-Organization-Id`.
No other organization is ever substituted. The
transport itself refuses to call `fetch` when that request context is absent,
including for personal Vault rows; organization context accompanies the
request but does not replace the `user_id = auth.uid()` ownership boundary.
The server's `/vault` and `/authenticator` routers independently require the
same header and exact middleware-context agreement before any handler runs.

Capabilities on the direct list are projected client-side (`deriveCapabilities` in `vault-service.ts`, mirroring aidream `item_capabilities`); the server re-checks every mutation and its responses carry authoritative capabilities.

## Invariants

1. Plaintext never appears in list responses, Redux, browser storage, query caches, URLs, analytics, or logs. In the workspace the package holds a revealed value 20 s (`useTransientSecret`).
2. Never select `value_encrypted`; never `select *` on `credential_items` / `user_secrets` — explicit column lists only.
3. `sealed` fields get no show/copy affordance at any capability level.
4. One workspace: a Vault screen in this repo is a defect — it belongs in `@ai-matrx/vault` (released, then adopted here).
5. Access never depends on the active organization — the active organization only names whose vault settings (knobs) apply.
6. Every mutation surfaces its error via toast; catalog rows failing schema validation are skipped LOUDLY (`console.error`).
7. **Vault Trash recovery is aggregate-only.** `credential_item` previews `vault_recovery_preview` directly without lifecycle JSON or values, then restores through `POST /vault/items/{id}/restore`; generic undelete and bulk Keep never handle Vault tokens. Preview exposes only exact field, attachment, and `native_passkeys_count` accounting; an absent count is the installed v1 ordinary-record compatibility case, never inferred native state. A restored item stays disabled with its fields inactive and sharing, browser fill, authenticators, sandbox, agent and integration use off until separately reenabled. A restored passkey is separately disabled and does not prove website acceptance or remove the website registration. Account, organization, close, unmount and an unknown response keep the deletion ID fenced for an honest exact retry.

## MCP connections (Phase 4 cutover, 2026-07-23)

MCP is a vault consumer, not a token store. `tool.mcp_user_conn` is a
NON-SECRET connection record (`credential_item_id` + `auth_method` +
status/scopes/expiry metadata); the tokens/keys live in a sealed vault item
owned by the connecting user (`definition_key='oauth_token_set'` or
`'mcp_auth'`, `source='mcp'`, fields `sealed` + `editable=false`).

- **The browser never holds an MCP token.** The OAuth callback
  (`app/api/mcp/oauth/callback`) still exchanges the code (it holds the PKCE
  verifier) but POSTs the token response to aidream
  `/api/mcp-connections/{server_id}/oauth-tokens` — it never writes token
  columns. The old browser refresh path (`mcp-client/token-refresh.ts`), the
  browser MCP JSON-RPC client, and the `/api/mcp/servers/[serverId]/*` Next
  routes are DELETED.
- Discovery/invocation/refresh/disconnect run in aidream with vault-resolved
  auth via `../aidream/apps/shared/chat/src/agents/services/mcp-connections.service.ts`; refresh is
  server-side (atomic battery rotation of the same vault fields).
- Manual methods (bearer / API-key header / stdio env) post through
  `connectServerWithCredentials` → aidream `/credentials` → sealed vault item.
- `upsert_mcp_connection` is metadata-only (config/transport/endpoint
  override) — the pgcrypto functions and token bytea columns were dropped
  (aidream migrations `0237` / `0237b`).
- Disconnect (aidream `DELETE /api/mcp-connections/{server_id}`) clears the
  connection AND soft-deletes the owned vault item.

## Change Log

- 2026-10-18 — the password-only `VaultRevealReauthDialog` is deleted: the secure-link sender confirms through the package's ONE `IdentityGate` over `webVaultIdentity`; Google confirmations check the same person came back (device-scoped sign-out otherwise); the Vault offers the site's sign-in when the session ended.

- **2026-10-16** — Adopted `@ai-matrx/vault` 0.1.x: `/vault`, `/vault/[itemId]`, the Vault window and the organization vault section render the package's `VaultApp` through `components/WebVault.tsx`; `/vault/authenticator` and `/vault/approve-browser` redirect into it. Deleted every old screen (workspace, item detail, create/import/export/backup dialogs, generator, password history, browsers dialog, approve-browser workspace, authenticator UI), the import parsers and workers, the authenticator client and hooks, `vault-list.ts`, `use-vault-item-state.ts`, `vault-hooks.ts`, `credential-identity.ts`, `features/files/vault/vaultAttachmentTransport.ts`, their tests and the old import-dialog browser harnesses. `vault-service.ts`, `types.ts` and `utils.ts` keep only what the consumers listed above import.

- `2026-10-09` — Scopes cutover (lane SCOPES-WEB-CONSUMERS): favorite results use `isAssociationsRpcErr` from `@ai-matrx/associations`.

- `2026-10-07` — `parseCsvFile` moved to `csv-import-file.ts`: the CSV worker reached the module that starts it, and that cycle hung every main/manage/demos Turbopack build from v0.4.2931 at the 45-minute limit. Guard: `pnpm check:worker-cycles`.

- `2026-09-28` — Passkey approval for turning on filling in a browser (`/vault/approve-browser`), the equal alternative to the password; Browsers dialog copy says what re-enabling takes; vault calls surface the server's own refusal sentence instead of "Vault request failed (N)".

- `2026-09-25` — Added Firefox, RoboForm, Dashlane, and Apple Passwords ordinary-login CSV choices to selected-login preview and download; external destination ingestion remains unverified.

- `2026-09-20` — Added per-user Vault favorites and server-backed recent views with authorized-list-only state, context/request fences, reconciliation, fixed retry messaging, and separate Open/Favorite controls in both presentations.

- **2026-09-20** — Credential detail now shows tags as compact chips and edits
  them through the existing item update boundary; new tags trim blank input,
  deduplicate exact strings, and keep case, commas, and Unicode intact. The
  desktop Vault toolbar gives search its own row so Sort and New cannot collapse it.

- **2026-09-20** — Added metadata-only Vault search and deterministic local
  sorting (newest, recently updated, name A–Z/Z–A) without reading values.

- 2026-09-19 — **THE FOURTH ORGANIZATION STATE (R37) in `useAuthenticator`.** The hook answered a FAILED organization read with "No organization is selected … choose one from the organization picker" — a claim about memberships nobody read, because `setOrgBootstrapFailure` sets `orgBootstrapResolved` TRUE. It now reads `useOrganizationRequired().organizationState`: `required` keeps the refusal, `unavailable` says we could not check, `resolving` keeps loading, and `organizationRequired` is only ever the first. Test: `hooks/use-authenticator.test.tsx` (the failed-read case is red on the prior bytes). Guard: `pnpm check:org-three-states` rule 5.
- `2026-09-19` — Replaced local password randomness with the published shared generator, canonical host limits and staged password/passphrase controls for management forms.

- `2026-09-19` — Added ordinary Vault aggregate recovery to the existing Trash inventory: metadata-only preview, explicit disabled/quarantine confirmation, current-password retry, actor/request-organization cancellation, and generic bulk-Keep refusal for Vault tokens.

- `2026-09-19` — Extended the shared Trash recovery dialog for retained native passkeys: strict value-free component counts, native recovery refusals, exact restored-passkey result validation, and compatibility-unavailable wording without automatic reenablement or website-acceptance claims.

- `2026-09-17` — **An empty authenticator list is no longer a calm lie.** `useAuthenticator` cleared the error and stopped loading once the org bootstrap settled with nothing selected, so the list rendered as "you have no authenticator codes" to a person who has several. It now says which organization is missing and where to choose one. Guard: `pnpm check:org-refusal-honesty`.

- `2026-09-17` — **The Vault's Organization tab switches to the organization the person SELECTED.** All three "Organization" controls fell back to `availableOrganizations[0]?.id`, so from "My credentials" the tab opened the first organization the person happened to belong to — another tenant's credentials, chosen by nobody. They now use the selected organization (`selectOrganizationId`), and when nothing is selected the click changes nothing and says why in a toast. The organization Select beside the tab stays the explicit picker. Guard: `pnpm check:organization-context`.

- **2026-09-16** — Added Mine-only selected login CSV export with explicit loaded-item selection, value-free revision preview, loss accounting, plaintext acknowledgement, current-password reauthentication, actor/request-organization cancellation, and private Blob cleanup.

- **2026-09-12** — Unified existing Bitwarden JSON and 1Password 1PUX worker envelopes around required request IDs and matching cancellation. Bitwarden file decoding now stays inside its worker, and worker exceptions project to a fixed source-free import error.

- **2026-09-12** — Completed the plain Bitwarden JSON lifecycle guard: terminal worker replies cannot repopulate a cleared session; previews and results distinguish duplicate skips, invalid, unsupported, and deleted records; retry preserves the unresolved command receipt.

- **2026-09-12** — Added the first CSV password-manager import vertical: worker parsing, encrypted source preservation, effective-org limits, frozen per-row receipt identity, masked preview, duplicate skip and bounded sequential cancellation. Server receipt/schema integration remains a required live verification.

- **2026-09-09** — Repaired Authenticator's fresh-route organization race. The
  hook now waits for shell bootstrap, reloads on organization changes, and
  request-orders results; the page uses the canonical organization picker when
  no organization is selected instead of caching a pre-hydration transport
  error beside “No codes yet.”

- **2026-08-24** — Moved Vault and Authenticator JSON calls onto the shared
  organization-context kernel, moved the protected-file byte adapter onto the
  same UUID admission, rejected conflicting caller headers instead of overriding
  selected context, and pinned missing/malformed JSON plus multipart zero-I/O
  behavior in the non-skippable frontend release gate.

- **2026-08-24** — Vault gained its canonical v3 right-click menu
  (`components/VaultContextMenu.tsx`), mounted by `VaultWorkspace` so `/vault`,
  the org embed and the floating Vault window all get it from ONE wiring — and
  the window therefore stops being answered by the page underneath it. Rows
  carry a `data-vault-item-id` anchor; the menu resolves the clicked credential
  from that attribute, never from DOM text. Invariant 8 records the security
  contract. Live-verified on `/vault`: right-clicking a credential produced
  `Name / Type / Status / Access / Tags / Fields` and nothing else, and a text
  selection over the detail pane did not become the menu's payload.

- **2026-08-23** — Restored the ratified Organization destination on the main
  Vault and its floating window. The user chooses an organization explicitly
  from current memberships; the selected role governs management actions, the
  persisted scope contains only the org id, and the organization-management
  embed remains fixed to its host principal.

- **2026-08-22** — Collapsed credential field display and editing into one
  compact surface: value actions now sit on the value row, Edit replaces the
  value in place, runtime key and description are inline metadata, sandbox
  eligibility no longer adds permanent helper prose, and custom values are
  explicitly grouped as Additional fields.

- **2026-08-22** — Replaced `?item=<id>` with canonical `/vault/[itemId]`
  credential routes across Vault and Authenticator, then began the focused edit
  density pass: removed the redundant credential-details card and replaced
  full-width credential/field save-delete rows with labeled icon actions.

- **2026-08-22** — Sorted every Vault scope newest-created first and replaced
  expanding list cards with one shared two-line identity treatment: icon,
  truncated name, and one truncated supporting line; fields and verbose
  metadata remain complete in detail.

- **2026-08-22** — Completed the Vault route identity follow-up with a
  Vault-specific document title and semantic H1 in the shared route header.

- **2026-08-22** — Made destination entry forgiving and self-validating in
  both create and edit flows: bare hosts normalize to HTTPS on blur, iPhone-safe
  16px inputs avoid zoom, and an advisory server-side public-site probe returns
  a compact confirmed/warning state without making remote availability a save
  requirement.

- **2026-08-22** — Unified Authenticator Add with the canonical Website login
  form; website parts now save progressively instead of requiring URL,
  username, password, and TOTP together. Added optional Restricted recovery
  codes with per-code Copy/Mark-used behavior, Restricted secure notes, and
  multi-file protected attachments during login creation. Hardened the shared
  Credenza mobile primitive to 92dvh, one scroll body, safe-area padding, 16px
  controls, and 44px buttons so variable content cannot trigger iOS zoom or
  hide Save below an unscrollable sheet.

- **2026-08-21** — The website-login create flow is now the ONE recipe (Arman's
  ruling: username + password + 2FA captured together; SoR
  `/Users/armanisadeghi/code/common-docs/systems/account/vault-secrets/FEATURE.md`):
  `VaultCreateDialog` adds a two-factor section (off / authenticator app —
  seed enrolls on the SAME item right after create / SMS / push-other — the
  non-app choice is written as the `mfa_method` non-secret field so agents
  KNOW to hand control back at verification). `VaultItemDetail` gains an
  Authenticator section on website logins (status, on/off, remove, inline
  setup-key enrollment, recorded non-app method). Enrollment targets are
  website logins ONLY (`use-authenticator`), and the enroll dialog's
  suggestion matches the issuer against login-URL HOSTS only — display-name
  substring matching enrolled a Google seed on an unrelated oauth_client
  (root cause of the 2026-08-21 mis-attachment). `uri_match_mode` gains
  `domain` (sister-site matching, aidream eTLD+1 matcher).
- **2026-08-21** — Made Authenticator enrollment create one usable website-login
  bundle instead of a hollow authenticator-only item: labeled name, website,
  username, and password are saved first, then the sealed TOTP seed is added to
  that same item. Existing Vault items remain selectable, and the code-first row
  menu can now rename the underlying credential directly.
- **2026-08-20** — Replaced the oversized authenticator cards with a compact,
  code-first account list modeled on Google and Microsoft Authenticator: one
  provider/account identity, a tap-to-copy grouped code, live countdown ring,
  dependable favicon-to-globe fallback, and a single management menu. Search
  appears only when the list is large enough to need it; the full Vault and
  new-tab doors remain available without permanent explanatory chrome.

- **2026-08-20** — Made the authenticator usable end to end: enrollment now
  immediately returns to a large current-code screen for provider confirmation,
  and every saved authenticator leads with its site/account name and rotating
  code instead of protocol metadata. The setup seed remains sealed.

- **2026-08-20** — Rebuilt authenticator enrollment against what the best password managers actually ship: one intake control for paste / drop / file / camera scan, local QR decoding (`lib/qr/decode.ts` + the reusable `<QrCodeInput>`), an instant parsed preview, inline "A new login" creation, every vault item eligible (not just `website_login` — the empty-picker dead end), page copy cut to one sentence, and consent moved to its own confirm step. Credential deep links now use `/vault/[itemId]`.

- **2026-08-18** — Closed two Vault navigation hazards: scope results are now
  request-ordered and keyed to the active scope so stale credentials cannot
  flash after a switch, and valid login destinations are explicit safe
  Open-website actions while malformed or non-HTTP(S) values are refused.

- **2026-08-17** — Reworked the canonical full Vault around established
  password-manager patterns: full-bleed three-pane workspace, compact identity
  rows, flat grouped field rows, icon-only reveal/copy, visible auto-hide
  countdown, and one shared plain-language protection selector used across
  field and protected-file editing. All encryption and service paths remain
  unchanged.

- **2026-08-11** — Added first-class Vault file attachments and the Secure file
  create purpose. Initial creation uploads atomically from the user's point of
  view (a failed upload removes the empty item), while existing items support
  labeled multi-file management through the canonical file byte transport.

- **2026-07-28** — Removed the obsolete pre-deployment warning after the Vault API and organization-aware browser-login matching shipped through aidream.
- **2026-07-28** — Added the full-route three-pane password-manager workspace,
  responsive detail dialog, basic-purpose-first creation flow, plain-language
  purpose copy, browser-local password generation, and advanced runtime-field
  disclosure while preserving the shared compact organization/settings/window
  presentation.
- **2026-07-28** — Rebuilt the shared personal/organization vault presentation: canonical labels, full wrapping with no truncation/collapsing, hidden-or-complete value display with partial hints removed, one credential edit mode replacing scattered edit/rename/rotate controls, and website metadata limited to actual website credentials.
- **2026-07-26** — Closed the silent sandbox-injection gap: every sandbox switch (item detail, add-field, both create dialogs) is disabled until the field has an env key, the create dialogs surface it as a validation problem, and no build path can send `inject_into_sandbox=true` with a null alias. Backed by an aidream write refusal + a DB CHECK.
- **2026-07-26** — Sharing, ownership, and destination-login build (ratified plan): Mine / Shared-with-me / Organization scopes, each a deliberate query; per-recipient grant CRUD replacing the destructive save-the-whole-list share panel; give-ownership to another user by exact email; create-for-someone with server-side password generation; plaintext destination metadata with the loud Not-encrypted section, browser-fill toggle, and one-click promotion of an encrypted `site_url`/`panel_url` into `login_urls`. Also pinned `--default-non-nullable false` in aidream's type generator — openapi-typescript v7 had started marking every defaulted property required, churning ~1800 lines and breaking partial-patch call sites.
- **2026-07-23** — Phase 4 MCP/OAuth cutover: MCP tokens moved to sealed vault items; browser token paths deleted; refresh/persist/disconnect run in aidream `/api/mcp-connections/*`. Live finding: the legacy pgcrypto store NEVER held a token (its shared key was never configured) — all 4 connections stamped `expired` for re-auth.
- **2026-07-23** — Alignment with final vault API: field-metadata PATCH (env alias set/clear, description, active, one-way seal with confirm; deleted the interim direct `inject_into_sandbox` write) and per-recipient share grantees with a Can-manage toggle (org members + personal email lookup); types regenerated.
- **2026-07-26** — Repaired the credential identity return contract: `metaLine` is always returned and duplicate name-like subtitles are suppressed, restoring a clean type-check for Vault list/detail consumers.
- **2026-07-23** — Phase 3 unification: ONE definition-driven `VaultWorkspace` for both principals (catalog picker + presets + custom builder, reveal/copy with transient auto-clear, env import, share/transfer/fork/rotate/audit, capability-driven actions); data split direct-Supabase masked reads vs `/api/vault/*` value ops; deleted the duplicated personal/org services, hooks, and `OrganizationVaultSection`; regenerated `api-types.ts` from local aidream OpenAPI.
- **2026-07-23** — Linked the cross-repository Unified Credential Vault plan.
- **2026-07-21** — Paste-to-fill for single dotenv assignments (reusable parser).
- **2026-07-20** — Marketing Google integration connections store OAuth refresh tokens in the vault (`users.integration_connections.vault_secret_key`).
- **2026-07-19** — Organization vault v1 (superseded by the unified item model; `private_vault` storage annihilated by aidream migrations 0217/0218).
- **2026-05-28** — Initial personal vault.
