/**
 * surfaces — central registry that lets shared action components route
 * outcomes (fork / delete / retry navigation) correctly per consumer kind.
 *
 * Public API:
 *   - `registerSurface` / `unregisterSurface` — consumer lifecycle.
 *   - `selectPendingNavigation(surfaceKey)` — page consumers subscribe to
 *     this and react to navigation intents in a small effect.
 *   - `clearPendingNavigation` — page consumers call this once they've
 *     handled the intent.
 *   - `requestSurfaceNavigation` — shared components dispatch this to
 *     ask "navigate to this conversation on the registered surface".
 */

export {
  surfacesReducer,
  registerSurface,
  unregisterSurface,
  setPendingNavigation,
  clearPendingNavigation,
  selectSurfaceRegistration,
  selectPendingNavigation,
  type SurfaceKind,
  type SurfaceRegistration,
  type PendingNavigation,
  type SurfaceNavigationReason,
  type SurfacesState,
} from "./surfaces.slice";
export { requestSurfaceNavigation } from "./request-surface-navigation.thunk";
