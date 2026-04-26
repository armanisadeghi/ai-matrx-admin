// File: lib/redux/selectors/userSelectors.ts
//
// Phase 4: canonical home for user-related selectors. Consolidates the
// previous split between `lib/redux/slices/userSlice.ts` (deleted in same
// PR) and this file. Names preserved across both legacy locations so
// consumers continue to work.
//
// Reads from the post-split `state.userAuth` and `state.userProfile`
// slices. The composite `selectUser` reconstructs the legacy `UserState`
// shape via `createSelector` for whole-slice consumers — memoized, so
// referential identity is stable across unchanged inputs.

"use client";

import type { RootState } from "@/lib/redux/store.types";
import { createSelector } from "reselect";
import type { UserAuthState } from "@/lib/redux/slices/userAuthSlice";
import type { UserProfileState } from "@/lib/redux/slices/userProfileSlice";

// ── Slice selectors ──────────────────────────────────────────────────────

const selectUserAuth = (state: RootState): UserAuthState => state.userAuth;
const selectUserProfile = (state: RootState): UserProfileState =>
  state.userProfile;

// ── Composite (legacy shape) ─────────────────────────────────────────────

/**
 * Reconstructed legacy `UserState` shape. Memoized — two calls with
 * unchanged `state.userAuth` + `state.userProfile` return the same object
 * reference, so `useAppSelector(selectUser)` doesn't trigger spurious
 * re-renders.
 */
export const selectUser = createSelector(
  [selectUserAuth, selectUserProfile],
  (auth, profile) => ({
    ...auth,
    userMetadata: profile.userMetadata,
    fingerprintId: profile.fingerprintId,
    shellDataLoaded: profile.shellDataLoaded,
  }),
);

// ── Auth-domain primitives ───────────────────────────────────────────────

export const selectUserId = (state: RootState): string | null =>
  state.userAuth.id;
export const selectUserEmail = (state: RootState): string | null =>
  state.userAuth.email;
export const selectUserPhone = (state: RootState): string | null =>
  state.userAuth.phone;
export const selectUserEmailConfirmedAt = (state: RootState): string | null =>
  state.userAuth.emailConfirmedAt;
export const selectUserLastSignInAt = (state: RootState): string | null =>
  state.userAuth.lastSignInAt;

export const selectIsAdmin = (state: RootState): boolean =>
  state.userAuth.isAdmin;
export const selectAccessToken = (state: RootState): string | null =>
  state.userAuth.accessToken;
export const selectAuthReady = (state: RootState): boolean =>
  state.userAuth.authReady;
export const selectIsAuthenticated = (state: RootState): boolean =>
  !!state.userAuth.id;

export const selectUserAppMetadata = createSelector(
  [selectUserAuth],
  (auth) => auth.appMetadata,
);
export const selectUserProvider = createSelector(
  [selectUserAppMetadata],
  (appMetadata) => appMetadata.provider,
);
export const selectUserProviders = createSelector(
  [selectUserAppMetadata],
  (appMetadata) => appMetadata.providers,
);
export const selectUserIdentities = createSelector(
  [selectUserAuth],
  (auth) => auth.identities,
);

// ── Profile-domain primitives ────────────────────────────────────────────

export const selectFingerprintId = (state: RootState): string | null =>
  state.userProfile.fingerprintId;
export const selectShellDataLoaded = (state: RootState): boolean =>
  state.userProfile.shellDataLoaded;

export const selectUserMetadata = createSelector(
  [selectUserProfile],
  (profile) => profile.userMetadata,
);
export const selectUserAvatarUrl = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.avatarUrl,
);
export const selectUserFullName = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.fullName,
);
export const selectUserName = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.name,
);
export const selectUserPreferredUsername = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.preferredUsername,
);
export const selectUserPicture = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.picture,
);

// ── Derived display-friendly names ───────────────────────────────────────

export const selectActiveUserId = selectUserId;

export const selectActiveUserName = createSelector(
  [selectUserMetadata],
  (userMetadata) =>
    userMetadata.name ||
    userMetadata.fullName ||
    userMetadata.preferredUsername,
);

export const selectActiveUserAvatarUrl = createSelector(
  [selectUserMetadata],
  (userMetadata) => userMetadata.avatarUrl || userMetadata.picture,
);

export const selectActiveUserInfo = createSelector(
  [selectActiveUserId, selectActiveUserName, selectActiveUserAvatarUrl],
  (id, name, avatarUrl) => ({
    id,
    name,
    avatarUrl,
  }),
);

export const selectDisplayName = createSelector(
  [selectUserMetadata, selectUserEmail],
  (meta, email): string =>
    meta.name ||
    meta.fullName ||
    (email ? email.split("@")[0] : null) ||
    "User",
);

export const selectProfilePhoto = (state: RootState): string | null =>
  state.userProfile.userMetadata.picture ?? null;

// ── Composite legacy `selectUserContext` ─────────────────────────────────

/**
 * Returns a memoized context object with `user` (legacy shape),
 * `isAuthenticated`, and `isAdmin`. Only use when you genuinely need all
 * three together — prefer individual primitive selectors otherwise.
 */
export const selectUserContext = createSelector(
  [selectUser, selectIsAuthenticated, selectIsAdmin],
  (user, isAuthenticated, isAdmin) => ({ user, isAuthenticated, isAdmin }),
);

// ── Auth token (kept for back-compat with the legacy file's placeholder) ─

/**
 * @deprecated The legacy implementation returned `null` (placeholder).
 * Use `selectAccessToken` for the real value.
 */
export const selectAuthToken = selectAccessToken;

// ── Composite full-data selector ─────────────────────────────────────────

export const selectFullUserData = createSelector(
  [selectUser, selectActiveUserInfo, selectAccessToken],
  (user, activeUserInfo, authToken) => ({
    ...user,
    activeUserInfo,
    authToken,
  }),
);
