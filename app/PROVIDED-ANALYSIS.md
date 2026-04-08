# Provider load — initial render

Focus: first client render after mount (not lazy routes). Split into Import (module load) and Mount (first render).

Order follows `app/Providers.tsx` from **outside → in**.

| Provider | Import | Mount | Notes |
|----------|--------|-------|-------|
| `ReactQueryProvider` | Light | Light | Lazy `QueryClient`, devtools dynamic + disabled |
| `StoreProvider` | **Heavy** | Medium | Import pulls entire slice graph (all features, modules, 13 FS buckets). Mount runs `makeStore()` once — sync. |
| `ThemeProvider` | Light | Light | One selector read. Cookie/DOM in `useEffect`. |
| `PersistentComponentProvider` | Light | Light | Empty registry. No work until consumers register. |
| `ContextMenuProvider` | Light | Light | Pure context. Empty `{}` state, no effects, no heavy imports. |
| `ToastProvider` | Light | Light-Med | `useToast()` + wires `toast.setFunctions()` in `useEffect`. No fetch, minor side-effect. |
| `RefProvider` | Light | Light | Empty ref `{}`, stable `useMemo` manager. Zero effects. Cleanest provider. |
| `FileSystemProvider` (redux) | **Medium** | Light | Module-level: builds hooks/selectors/slices for 13 buckets. Mount: one selector read, no fetch. |
| `FilePreviewProvider` | Light | Light | Null state. `FileSystemManager` is dynamic import inside callback — no mount cost. |
| `OldFileSystemProvider` | **Medium** | **Heavy** | Import: `FileSystemManager` singleton (Supabase + sync init), `fileNodeManager`, 5 dialog components. Mount: `getInstance()` in render body creates Supabase client + fires `initializeSyncCheck()`. Worst provider. |
| `TooltipProvider` | Light | Light | Re-export of Radix Provider. Pure passthrough, zero state. |
| `AudioModalProvider` | **Medium** | Light | Import: statically imports `AudioModal` (Credenza, ScrollArea, TTS player) — non-trivial bundle. Mount: null state, registers fn in `useEffect`. Modal only renders when opened. |
| `ModuleHeaderProvider` | Light | Light | Empty `[]` state, two callbacks. No effects, no heavy imports. |
| `UniformHeightProvider` | Light | Light | Empty `{}` height map. No effects, no heavy imports. Pure context. |
| `SelectedImagesProvider` | Light | Light | Empty `[]` state + `"none"` mode. No effects, no heavy imports. |
| `TaskProvider` | Light | Light | Import: pulls `supabase/client`, task/project services. Mount: empty state, `useToastManager`, two Redux selectors. **No fetch on mount** — deferred behind `initialize()`. Good pattern. |
| `TranscriptsProvider` | Light | Light | Same pattern as TaskProvider. Empty state, no fetch until `initialize()` called. Supabase channel also deferred. |
| `AudioRecoveryProvider` | Light | Light | Empty `[]` state. IndexedDB check deferred behind `initialize()`. No heavy imports. |
| `DeferredSingletons` | **Medium** | Light | Import: 6 component imports (OverlayController, AdminFeatureProvider, etc.) + brokerSlice + PostHog. Mount: returns `null` until `useIdleReady()` fires. All work (`loadPreferences`, PostHog identify, broker registration) runs via `useIdleTask`. Well-designed deferral. |
