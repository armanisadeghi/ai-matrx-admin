# Residential egress — the web app's half

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/web/residential-egress/FEATURE.md — read it before touching this feature in ANY repo. This file keeps only what lives in this folder's code.

## The pieces

| File | What it is |
|---|---|
| [`types.ts`](./types.ts) | Every shape, hand-typed from the contract, plus `homeConnectionStatus()` — the DERIVED badge (Connected / Offline / Paused / Not set up). |
| [`service.ts`](./service.ts) | Direct Supabase reads/writes for `platform.egress_device`, and the four Python `/egress/*` calls. |
| [`hooks/useHomeConnections.ts`](./hooks/useHomeConnections.ts) | The live list: `postgres_changes` on `platform.egress_device` + the announced one-minute polling fallback. |
| [`hooks/useHomeConnectionFocus.ts`](./hooks/useHomeConnectionFocus.ts) | `?computer=<id>` on the devices list: scrolls that computer into view and rings it once. |
| [`components/HomeConnectionRow.tsx`](./components/HomeConnectionRow.tsx) | One computer's row: badge, switch, last used, pages, bytes, rename, Remove. |
| [`components/ConnectComputerPage.tsx`](./components/ConnectComputerPage.tsx) | `/connect-computer` — approval card with `?code=`, downloads without. |
| [`app/(core)/connect-computer/page.tsx`](<../../app/(core)/connect-computer/page.tsx>) | The route. Signed-in; a signed-out visitor comes back **with the code intact**. |

Hosts outside this folder:
[`features/files/devices/DevicesSyncTab.tsx`](../files/devices/DevicesSyncTab.tsx)
(the Settings → Devices & sync list and the **Other computers** section) ·
[`features/files/devices/components/DeviceCard.tsx`](../files/devices/components/DeviceCard.tsx)
(the row under each device) ·
[`features/cloud-browser/components/TelemetrySurface.tsx`](../cloud-browser/components/TelemetrySurface.tsx)
("Browsing through <name>" and the "Set up a home connection" door).

## Code rules

- **Copy:** the contract's words only ("Home connection"); `residential_egress` is an identifier in code, knob keys and table names, never on screen. The refusal sentence lives in one constant that `components/__tests__/download-availability.test.ts` asserts against; the knob resolver returns a BOOLEAN, never the key.
- **Badge and writes:** `homeConnectionStatus()` in `types.ts` derives the badge. The hand-typed `EgressDatabase` in `types.ts` allows only `enabled` and `display_name` in an `.update()`; a third column is a type error. Removal goes through the Python `DELETE /egress/devices/{id}`.
- **Read errors:** `HomeConnectionRow` renders the read error in place, never "Not set up".
- **Download availability:** blank `helper_download_base_url` hides the buttons (guard: `components/__tests__/download-availability.test.ts`).
- **`?computer=<id>`** (`HOME_CONNECTION_FOCUS_PARAM`, `HOME_CONNECTIONS_HREF` in `types.ts`; durable URL `/user-settings/files/devices`): `hooks/useHomeConnectionFocus.ts` waits until BOTH reads on the devices page finish, scrolls instantly (a deep link is a destination, not a tour), rings the row for 2.6 s, runs once per id so a realtime heartbeat cannot yank the page, and says so in a line when the computer is not on the list. Never link to `/settings?tab=devices` (it drops the query; `tab=devices` is the camera-and-microphone tab).
- **Typed access:** `service.ts` reads `platform.egress_device` through the generated `Database` type (`egressDb()`) and calls `/egress/*` through `lib/api/typed-client.ts`; the four Python 200 responses are still asserted against the hand-typed shapes in `types.ts` because the contract generates them as untyped dicts.
- **Cloud-browser render** (`features/cloud-browser/components/TelemetrySurface.tsx`) is guarded on presence of the server field.
