# Provider load — initial render

Focus: first client render after mount (not lazy routes). “Light” ≈ no network, no heavy sync work in the provider body.

Order follows `app/Providers.tsx` from **outside → in** (next rows to add: `ContextMenuProvider`, `ToastProvider`, …).

| Provider | Initial render | Notes |
|----------|----------------|-------|
| `providers/ReactQueryProvider.tsx` | Light | One `QueryClient` via lazy `useState`; no queries. Devtools dynamic + disabled. |
| `providers/StoreProvider.tsx` | Medium | First paint calls `makeStore(initialState)` once — **sync** cost scales with root reducer / slice graph; **no fetch here**. |
| `styles/themes/ThemeProvider.tsx` | Light | Subscribes to `state.theme`; `mounted` gate. Cookie / `matchMedia` / DOM class updates run in **`useEffect`** (after paint). |
| `providers/persistance/PersistentComponentProvider.tsx` | Light | Empty registry + empty map on first paint; no registered components until something calls `registerComponent`. |
| `lib/redux/fileSystem/Provider.tsx` | Light | One bucket selector; no fetch until `initialize()` / `setActiveBucket()`. **Import** still builds hooks/slices per bucket (heavier module load than mount). |
