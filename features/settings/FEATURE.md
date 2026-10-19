# FEATURE.md — `settings`

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/account/settings/FEATURE.md — read it before touching this feature in ANY repo (product rules, destinations, status, open findings). Mechanism: /Users/armanisadeghi/code/common-docs/systems/platform/feature-knobs/FEATURE.md. Exact-control doors: /Users/armanisadeghi/code/common-docs/systems/platform/setting-doors/FEATURE.md. Active campaign: /Users/armanisadeghi/code/common-docs/systems/account/settings/projects/unified-settings-platform/PLAN.md (register: REGISTER.md, ruling ledger: DECISIONS.md) — read before adding, moving or migrating ANY setting in ANY repo.

This file keeps only the code-path map and the traps in `features/settings/`. Every preference is read and written through `useSetting`, composed from the primitives in `components/official/settings/` (their rules: that folder's FEATURE.md). `useSettingsControlSearch(query, isAdmin)` is the public search seam (stable static-control and registry full-key anchors plus the visible destination path). The registry-backed editor (`universal/`) receives a fixed user, route-organization or administration destination from its host and never asks for an editing role; system defaults read the full `platform.feature_knob` register and write only through `feature_knob_set`, rendering a structured refusal inline.

---

## Entry points

**Routes**

- `/user-settings/[[...path]]` — THE settings route; the window (`userPreferencesWindow`) and the phone drawer render the same core (registry + `SettingsTabHost`).
- **Retired `/settings/*` pages (2026-10-01)** — `app/(transitional)/settings/**` and `app/(core)/settings/access-requests` are deleted; every old URL is a 307 config redirect in `utils/next-config/legacySettingsRedirects.js` (wired in `next.config.js`): each page → its tab, `/settings/preferences?tab=…` and `/settings?tab=…` → the tab (old aliases kept; `?control=`/`?box=`/`?show=` survive because Next keeps the query), `/settings/secrets` → `/vault`, `/settings/projects` → `/projects`. Never 308: `/user-settings` may be renamed back to `/settings`. Guard: `route-shell/__tests__/legacy-settings-redirects.test.ts` (table = registry ids, hrefs = `tabIdToHref`, no retired page file exists). The shell's "Account" route menu that served those pages is deleted.
- `app/(authenticated)/settings-shell-demo/page.tsx` — dev demo page with Open Settings button + admin-view toggle.
- `app/(authenticated)/settings-primitives/page.tsx` — primitive gallery (every control, every state).
- `app/(authenticated)/settings-tree-demo/page.tsx` — tree + drawer-nav demo with a fake 20-node tree.
- `app/(authenticated)/settings-hooks-demo/page.tsx` — `useSetting` across 3 slices.
- `/user-settings/sandbox-defaults` (`sandboxDefaults`) — knob-backed sandbox defaults (`infrastructure.sandbox.defaults.*`, org + user rungs), rendered with `UniversalSettingsRows` exactly like `appearance.density`; read by `SandboxPanel` (`lib/sandbox/sandbox-defaults.ts`) and aidream `ensure_default_sandbox`. No env vars: sandbox env comes only from the Vault.
- `/user-settings/access-requests` (`accessRequests`) — the `iam.access_requests` inbox (`AccessRequestsSurface`, embedded: inline box bar, local box state seeded from `?box=`). Not a setting.
- `/user-settings/account/writing-voice` (`account.writingVoice`) — the person's writing voice (`VoicePage` scope person, `embedded`).
- `/user-settings/communication/messaging` — production SMS enrollment, notification-family preferences, opt-out, and personal text-assistant binding.
- `app/(core)/settings/data/page.tsx` → **redirect to `/trash`**. "Your data" is NOT a settings surface: `/trash` already lists everything a person soft-deleted, and the lifecycle clock is a column on that list, not a second page. The route survives only because the weekly digest email takes its link as a value and old mail keeps its URL forever. **General → Privacy** and `/education/data` now link straight to `/trash`.

**Overlay ids** (dispatched via `openOverlay(...)`)

- `userPreferencesWindow` — canonical. Every caller should use this one.
- `userPreferences` — legacy modal id. Resolves to the same shell via `SettingsShellOverlay`.

**Hooks**

- `useSetting<T>(path)` — read/write any setting. `[value, setter]`. Throws at init if the path's slice isn't registered.
- `useSettingPersistence(path)` — returns `"synced" | "local-only" | "session"` for surfacing badges.
- `useSettingsSearch(query, { isAdmin })` — ranked hits (label > keyword > description).
- `usePreferencesModal()` — Phase 8 shim, same API as the deleted legacy hook but dispatches into summon overlay state.
- `useSettingsPresentation()` — returns `{ presentation: "route" | "window" | "drawer", closeShell?, setActiveTabId? }`. Defaults to `"route"` outside a provider, so route pages "just work."
- `useSettingsNavigate()` — returns `(href, event?, options?)`. Smart navigation that closes the shell first when called from inside the window/drawer; in route mode it's a plain `router.push`. Cmd/Ctrl/Shift/middle-click always opens a new tab and leaves the shell open.
- `useSettingsTabNavigate()` — switches the active settings tab in-place inside the shell; on a route it navigates to the tab's own `/user-settings/...` URL (or a custom href).

**Public API** — `@/features/settings`

- `SettingsShell`, `SettingsShellOverlay`, `SettingsTabHost`
- `SettingDoor`, `SettingAnchor`, `settingDoorHref`
- `useSetting`, `useSettingPersistence`, `useSettingsSearch`, `countSearchHits`
- `settingsRegistry`, `getVisibleTabs`, `getTabTree`, `getTabTreeNodes`, `findTab`
- `parseSettingsPath`, `getSliceBinding`, `sliceBindings`
- Types: `SettingsPath`, `SettingsPersistence`, `SettingsTabDef`, `ResolvedSettingsTab`, `SettingsSearchHit`, `SliceBinding`

**Presentation-aware nav** — `@/features/settings/components/SettingsPresentationContext` (imported directly; not re-exported through the barrel because barrels are being eliminated)

- `SettingsPresentationProvider` (provider)
- `useSettingsPresentation`, `useSettingsNavigate`, `useSettingsTabNavigate`
- Types: `SettingsPresentation`, `SettingsPresentationContextValue`, `SettingsNavigateOptions`

**Primitives** — `@/components/official/settings`

- Form: `SettingsSwitch`, `SettingsSelect`, `SettingsSlider`, `SettingsNumberInput`, `SettingsTextInput`, `SettingsTextarea`, `SettingsRadioGroup`, `SettingsCheckbox`, `SettingsSegmented`, `SettingsColorPicker`, `SettingsMultiSelect`, `SettingsButton`, `SettingsLink`, `SettingsKeybinding`, `SettingsModelPicker`
- Layout: `SettingsSection`, `SettingsSubHeader`, `SettingsCallout`, `SettingsGrid`, `SettingsReadOnlyValue`
- Navigation: `SettingsFlatNavigation`, `SettingsTree`, `SettingsDrawerNav`, `SettingsBreadcrumb`
- Shared types: `SettingsBadge`, `SettingsCommonProps`, `SettingsRowVariant`, `SettingsRowDensity`, `SettingsControlSize`, `SettingsOption`, `SettingsTreeNode`

**Redux slice(s) exposed through `useSetting`**

- `userPreferences` (`lib/redux/preferences/userPreferencesSlice.ts`) — 20 modules (incl. `favorites` — user-curated pins, capped at `FAVORITES_MAX`, mutated via dedicated `addFavorite`/`removeFavorite`/`toggleFavorite`/`reorderFavorites` reducers); persistence: **synced** (warm-cache: IDB + localStorage + Supabase).
- `theme` (`styles/themes/themeSlice.ts`) — stored `{ mode: "light" | "dark" | "system" }`; persistence: **synced** (boot-critical: pre-paint localStorage). UI painting uses the separate resolved `light | dark` value, so an OS change never overwrites the saved System preference.
- `adminPreferences` (`lib/redux/preferences/adminPreferencesSlice.ts`) — admin-only backend host override and desktop delegation target override (`desktopTargetInstanceId`); persistence: **local-only** (flagged for sync migration).
- `layout` (`lib/redux/slices/layoutSlice.ts`) — layoutStyle + isInWindow; persistence: **local-only** (flagged for sync migration).
- `windowManager` (`@ai-matrx/summon`) — action-only writes (`toggleHidden`, `restoreAll`); persistence: **session**.

---

## Data model

**Database tables** (Supabase)

- `users.user_preferences` — single JSONB blob per user, owned by the userPreferences warm-cache sync policy; this feature never touches the table directly.

**RPCs** (direct from the browser — `SECURITY DEFINER`, granted to `authenticated`, identity from `auth.uid()`)

- `iam.personal_api_key_list()` / `iam.personal_api_key_create(p_name, p_organization_id)` / `iam.personal_api_key_revoke(p_id)` — **Connectors → API keys** (`tabs/ApiKeysTab.tsx`, service `personalApiKeysService.ts`): a key that IS the person, full access, no scopes; the server applies the organization's maximum age; the secret is shown once and dropped when the reveal closes. Contract: `migrations/campaign/tableapi1_a_person_can_hold_a_key_that_is_them.sql`. The organization API-keys page lists service keys only.

**Key types**

- `SettingsTabDef` (`features/settings/types.ts`) — registry entry shape.
- `SliceBinding` (`features/settings/slice-bindings.ts`) — per-slice `{ read, write, persistence }` contract.
- `SettingsTreeNode` (`components/official/settings/tree/types.ts`) — tree rendering node.

---

## Adding a tab or setting

1. Existing slice → `useSetting("slice.key")`. New preference → add to the `UserPreferences` types + defaults + reducer (the sync engine picks it up). Genuinely new slice → binding in `slice-bindings.ts`. A registry-backed value is a `platform.feature_knob` row instead (product rule 1 in the node), not a slice.
2. `tabs/MyTab.tsx` composes ONLY primitives from `@/components/official/settings`. No Redux, no shadcn, no `className` on primitives.
3. Entry in `registry.ts`: `{ id, label, icon, parentId?, component: lazyTab(...), persistence }`. Tree, breadcrumb, search and admin gating follow.
4. A tab that reads saved preferences sets `readsUserPreferences` and wraps only the reading section in `PreferencesLoadGate` (`components/read-state/PreferencesLoadGate.tsx`). `__tests__/reads-user-preferences.test.ts` derives which tabs read preferences, fails any without the gate, and fails a tab host that gates whole tabs.
5. Agent-writable settings: vocabulary in `agent-writable-settings.ts` (the one source tabs render options from), a target on `features/surfaces/manifests/settings.manifest.ts`, a handler in `route-shell/SettingsTabContentImpl.tsx` that dispatches `getSliceBinding(slice).write(...)`. Never a second write path; writes are refused while an autosave flush is in flight.

## Invariants and traps

- **Primitives have no `className` prop.** A visual variation is a new enum value on an existing prop.
- **Tabs never import Redux** (read-only derived state that is not a preference may use `useSelector`, e.g. `WindowsTab`) **and never import shadcn.** The one exception: `AiModelsTab` lazy-wraps the legacy `components/user-preferences/AiModelsPreferences.tsx` until a `SettingsModelList` primitive exists; do not delete that file.
- **`useSetting` throws at init when the slice is not bound** — fix the binding in `slice-bindings.ts`.
- **A route push inside the shell goes through `useSettingsNavigate()` / `useSettingsTabNavigate()`**, never `router.push` (it dismisses the window silently); modifier-click must keep opening a new tab. Reference consumers: `SettingsLink`, `OrganizationCard`, `UserContentTemplateManager`. Fix a stray `router.push` in a settings-mounted component in the same change.
- **`windowManager` writes through `useSetting` need an action-only key** (`toggleHidden`, `restoreAll`); `minimizeAll(payload)` needs viewport dims, so dispatch it directly (see `WindowsTab`).
- **`persistence: "local-only" | "session"` are flags, not final states**; `"server"` marks knob-backed tabs (`PersonalConfigTab`, which reads `platform.knob_index` via `lib/scoped-config/useScopedKnobs` and writes `platform.knob_override_set`, never a slice). Theme's binding is `local-only`.
- **Admin/dev overrides** (localhost-server override, `desktopTargetInstanceId`) stay in `adminPreferences`, local-only, in the admin-gated Server environment tab; the selector reads aidream `GET /desktop-instances`, `Auto` stores `null` (no `target_instance_id`).
- **A `userPreferences` shape change ships a paired backfill.** Add the normalization rule to BOTH the TS `sanitizeLoadedPreferences` (`userPreferencesSlice.ts`) and the DB `users.normalize_preferences_jsonb` (`migrations/user_preferences_legacy_drift_backfill.sql`) in the same change; the migration reruns `heal_user_preferences_drift()`; the weekly `heal-user-preferences-drift` pg_cron job and the `user-preferences-legacy-drift` check (`lib/integrity/checks.ts`) keep it at zero. Every load boundary routes through `sanitizeLoadedPreferences`, never a subset of the strips.
- **Default-model preferences are `string | null`** (null = platform default, resolved by `features/ai-models/redux/platformDefaultModel.ts`); `stripLegacyDefaultModelSentinels` folds old seeded constants at every load boundary. Never seed a concrete model id or name, never hardcode a model-name list: catalog rows (`useModelCatalog`, capabilities) decide.
- **Load status:** `userPreferences._meta.loadStatus` / `_meta.error` are set only by the sync engine's load outcomes (`lib/sync/engine/remoteFetchStatus.ts`); retry is `retryPreferencesLoad(store)` (`lib/redux/preferences/preferencesLoad.ts`); `persistWhen` on the policy blocks persistence until loaded, edits are held in `_meta.pendingEdits` and replayed (`persistAfterLoad`).
- **Knob reads** (`lib/knobs/featureKnobs.ts`) fetch one feature (`.eq("feature", …)`), page through `readAllRows` with a stable order and exact count, and throw rather than return a short list; guards `lib/knobs/featureKnobs.paging.test.ts` and `pnpm check:unbounded-reads`.
- **`platform.knob_resolve` takes an ARRAY of scopes** (`jsonb_build_array(jsonb_build_object('kind', …, 'id', …))`) and refuses anything else; guard `pnpm check:knob-resolve-callers` (`--self-test`).
- **Write door per key namespace:** `fetchKnobWriteDoor` + `writeKnobOverrideThroughDoor` in `lib/scoped-config/service.ts`; an unknown door is an error naming itself; `KnobOverrideRow` takes a `writeDoor`; `pickableRungsFor` stays pure (imported by `check:settings-ladder-ui` with no Next.js environment).
- **History:** `lib/scoped-config/KnobHistoryPopover.tsx` is mounted by `KnobOverrideRow` on every rung; `ConfigurationExport` reads `platform.knob_configuration(org, as_of)`. Live proof: `pnpm check:settings-history`; UI walk `scripts/settings-history-walk.mjs`.
- **Legacy `/settings/*` is 307-redirected** in `utils/next-config/legacySettingsRedirects.js` (never 308); retired tab ids resolve through `RETIRED_TAB_IDS` in `route-shell/routing.ts`; guard `route-shell/__tests__/legacy-settings-redirects.test.ts`. `/settings/data` redirects to `/trash` (the weekly digest email carries the URL); the lifecycle engine is `features/trash/` and never shows an `entity_token` (label precedence registry → policy → humanized token in `features/trash/labels.ts`).
- **Legacy overlay id `userPreferences`** still resolves to the shell via `SettingsShellOverlay`; remove the registry entry once every caller uses `userPreferencesWindow`.
- **Category tabs** (`id: "general"`, `"ai"`) have `component: Placeholder`: noninteractive headings on desktop, drill-in screens on mobile. A folder with its own real page (Connectors) sets `navigable: true`.
- **Mobile drawer** initializes its stack from the leaf's full ancestor path so a door opens the requested control; `SettingsShell` acknowledges the mobile drawer to the overlay watchdog as an intentional non-window surface.
- **Messaging (SMS):** assistant, task-notification-family and enrollment preferences use direct authenticated RPCs (`communication.get/configure/disconnect/enqueue_my_sms_assistant_*`, `get_my_sms_task_notification_preference`, `configure_my_sms_task_notifications`); never a Next.js API route between the tab and them. A family checkbox never writes the broad preferences row or changes consent/assistant state. `sms_phone_numbers.assistant_enabled` renders read-only. Enrollment (`/api/sms/verify`, Twilio Verify) is the one exception that uses a route.
- **Personal API keys** (`tabs/ApiKeysTab.tsx`, `personalApiKeysService.ts`): `iam.personal_api_key_list/create/revoke`; the secret is shown once and dropped when the reveal closes.
- **Start-up organization** row (`features/organizations/components/StartupOrganizationRow.tsx`) writes through `users.set_startup_organization` via `lib/organizations/accountOrganizationChoices.ts`, the only reader/writer of those columns; guard `pnpm check:no-default-organization`.
- **Server-declared tabs** (`organizations.mediaCatalog`, `features/source-library/settings/SourceLibrarySettingsTab.tsx`) render what `GET /media/settings` declares; a declared type this screen cannot draw is shown read-only with the reason.
- **Notifications tab** (`tabs/NotificationsTab.tsx`, `notification-preferences.ts`): a channel switch appears only when `communication.notification_event_type.config.templates.<channel>` has a body (Text also requires `sms_locked` false); every notice has its own label (aidream guard `test_every_notice_has_its_own_name`).
- **Sandbox defaults** (`sandboxDefaults`) are `infrastructure.sandbox.defaults.*` knobs rendered with `UniversalSettingsRows`, read by `lib/sandbox/sandbox-defaults.ts` and aidream `ensure_default_sandbox`; no env vars.

## Guards

`pnpm check:settings-orphans|unregistered|hardcoded|env-toggles|ladder-ui|history`, `check:knob-resolve-callers`, `check:no-default-organization`, `check:unbounded-reads`; tests `route-shell/__tests__/legacy-settings-redirects.test.ts`, `__tests__/reads-user-preferences.test.ts`, `slice-bindings.test.ts`, `lib/knobs/featureKnobs.paging.test.ts`. Known partial readers: `universal/disposition.ts` (render read-only).

## Related features

Depends on `features/window-panels` (`WindowPanel`, `UrlPanelManager`), `@ai-matrx/summon` (open/close), `lib/redux/preferences/userPreferencesSlice`, `lib/sync/*`, `components/official/settings/*`. Depended on by every feature that surfaces a preference, plus the shims `hooks/user-preferences/usePreferencesModal.ts` and `usePreferenceValue.ts`. Skills: `.claude/skills/settings-system/SKILL.md`, `.claude/skills/ios-mobile-first/SKILL.md`.
