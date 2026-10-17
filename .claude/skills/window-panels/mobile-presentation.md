# Window Panels: phone presentation

Companion to the `window-panels` skill. Read when choosing or debugging how a window renders on a phone. The surfaces are the package's (`src/window/mobile/`: `MobileDrawerSurface`, `MobileCardSurface`, fullscreen); the choice is the definition's `window.mobile` in `features/overlays/definitions/<id>.overlay.ts(x)` (mirrored in `definitions/overlay-meta-index.ts`).

| `window.mobile` | Rendered as | Use for |
|---|---|---|
| `"fullscreen"` | Full-viewport takeover, one window at a time | Content-dominant windows (Notes, AgentRun, News). |
| `"drawer"` | Bottom sheet; a sidebar collapses into a nested drawer (`window.mobileSidebarAs`) | Forms, settings, sidebar-heavy windows. |
| `"card"` | Floating bottom-right card, non-modal | Small utility and debug surfaces. |
| `"hidden"` | Nothing | Windows that must not exist on a phone. |

Decision: has a sidebar, drawer; content-dominant, fullscreen; small utility, card; never on a phone, hidden. Phone rules: `h-dvh`, `pb-safe`, `--header-height` (the `WindowsProvider` `mobileTopOffset`), input `font-size >= 16px` (see the `ios-mobile-first` skill). The secondary panel has no phone route; the window handles it. A window that swaps `WindowPanel` for its own phone surface calls `useOverlaySurfaceRenderAck` (from `@ai-matrx/summon/window`) so the render watchdog counts that mount as proof of visibility.
