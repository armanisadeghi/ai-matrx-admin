# Window Panels: drag, resize, minimize, maximize, pop-out

Companion to the `window-panels` skill. Read when the task is a window's frame behavior. The behavior is the package's (`../aidream/apps/shared/summon/src/window/`: `WindowPanel.tsx`, `useWindowPanel.ts`, `popout/`, `chrome/SnapButton.tsx`); fix it there, never in this repo. Every `<WindowPanel>` gets all of it with no opt-in.

- **Header drag** moves; **8 edge/corner handles** resize; min/max respect `minWidth` / `minHeight`.
- **Traffic lights** (top-left): red = close, yellow = minimize/restore, green hover-dropdown = snap (left/right/top/bottom/centre), Arrange All, full screen, Pop out.
- **Minimize, maximize, pop-out and dock never remount the body.** State, refs and effects survive. Minimize keeps the body mounted offscreen whatever `keepAlive` says, and still captures the tray thumbnail.
- **Pop-out** uses a real browser window (Document Picture-in-Picture where available, popup fallback). Trigger: green dropdown, or drag the header 80 px past the viewport edge and hold 250 ms (`popout/popoutDragDetector.ts`). Hard-disabled on phones. `usePopoutControl` (also from `@ai-matrx/summon/window`) controls a live window from anywhere. The body renders through one portal into one stable container; each presentation only decides where it attaches, so never render the body at a presentation-dependent position.
- **Off-screen rescue:** returning to `windowed` clamps a stranded rect into the viewport.
- **Escape** closes the topmost window unless a visible element matching `[data-organization-gate], [data-overlay-escape-yield]` owns it (set by `AppSummonProvider`). Mark your own always-on-top layer with `data-overlay-escape-yield`.
- **Right-click on a window body** is wrapped by the app's `AppWindowSelectionSurface` (the `selectionSurface` option of `WindowsProvider`).
- **Unverified in a real browser (package FEATURE "Known open items"):** real IndexedDB and Document Picture-in-Picture. If one misbehaves, fix it in the package and say so.
