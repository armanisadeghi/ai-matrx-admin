// File: lib/redux/slices/userSlice.ts
import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";

interface Identity {
  provider: string | null;
  id: string | null;
  user_id: string | null;
  avatar_url: string | null;
  email: string | null;
  email_verified: boolean | null;
  full_name: string | null;
  picture: string | null;
  provider_id: string | null;
  sub: string | null;
  name: string | null;
}

interface UserState {
  id: string | null;
  email: string | null;
  phone: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  appMetadata: {
    provider: string | null;
    providers: string[];
  };
  userMetadata: {
    avatarUrl: string | null;
    fullName: string | null;
    name: string | null;
    preferredUsername: string | null;
    picture: string | null;
  };
  identities: Identity[];
  isAdmin: boolean;
  accessToken: string | null;
  tokenExpiresAt: number | null; // Unix timestamp (seconds) when the token expires
  // Guest identity - used when user is not authenticated
  fingerprintId: string | null;
  // Tracks if auth initialization is complete (either got user or fingerprint)
  authReady: boolean;
  // Tracks if shell data (user + preferences) has fully loaded — gates components
  // that must not render stale defaults (e.g. AnnouncementProvider).
  shellDataLoaded: boolean;
}

const initialState: UserState = {
  id: null,
  email: null,
  phone: null,
  emailConfirmedAt: null,
  lastSignInAt: null,
  appMetadata: {
    provider: null,
    providers: [],
  },
  userMetadata: {
    avatarUrl: null,
    fullName: null,
    name: null,
    preferredUsername: null,
    picture: null,
  },
  identities: [],
  isAdmin: false,
  accessToken: null,
  tokenExpiresAt: null,
  fingerprintId: null,
  authReady: false,
  shellDataLoaded: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<UserState>>) => {
      return { ...state, ...action.payload, authReady: true };
    },
    setAccessToken: (state, action: PayloadAction<string | null>) => {
      state.accessToken = action.payload;
    },
    setTokenExpiry: (state, action: PayloadAction<number | null>) => {
      state.tokenExpiresAt = action.payload;
    },
    setFingerprintId: (state, action: PayloadAction<string>) => {
      state.fingerprintId = action.payload;
      state.authReady = true;
    },
    setAuthReady: (state, action: PayloadAction<boolean>) => {
      state.authReady = action.payload;
    },
    setShellDataLoaded: (state, action: PayloadAction<boolean>) => {
      state.shellDataLoaded = action.payload;
    },
    clearUser: () => initialState,
  },
});

export const {
  setUser,
  setAccessToken,
  setTokenExpiry,
  setFingerprintId,
  setAuthReady,
  setShellDataLoaded,
  clearUser,
} = userSlice.actions;
export default userSlice.reducer;

// ── Primitive selectors — all return stable scalars, safe for useAppSelector ──

export const selectUser = (state: any) => state.user;
export const selectUserId = (state: any): string | null => state.user.id;
export const selectIsAdmin = (state: any): boolean => state.user.isAdmin;
export const selectAccessToken = (state: any): string | null =>
  state.user.accessToken;
export const selectFingerprintId = (state: any): string | null =>
  state.user.fingerprintId;
export const selectAuthReady = (state: any): boolean => state.user.authReady;
export const selectShellDataLoaded = (state: any): boolean =>
  state.user.shellDataLoaded;
export const selectIsAuthenticated = (state: any): boolean => !!state.user.id;

// ── Derived selectors — memoized with createSelector ─────────────────────────

export const selectDisplayName = createSelector(
  (state: any) => state.user.userMetadata.name,
  (state: any) => state.user.userMetadata.fullName,
  (state: any) => state.user.email,
  (name, fullName, email): string =>
    name || fullName || (email ? email.split("@")[0] : null) || "User",
);

export const selectProfilePhoto = (state: any): string | null =>
  state.user.userMetadata.picture ?? null;

/**
 * Returns a memoized context object. Only use when you genuinely need all
 * three fields together — prefer individual primitive selectors otherwise.
 */
export const selectUserContext = createSelector(
  selectIsAuthenticated,
  selectIsAdmin,
  (state: any) => state.user as ReturnType<typeof selectUser>,
  (isAuthenticated, isAdmin, user) => ({ user, isAuthenticated, isAdmin }),
);
