// File: lib/redux/slices/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
};

const userSlice = createSlice({
    name: 'user',
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
        clearUser: () => initialState,
    },
});

export const { setUser, setAccessToken, setTokenExpiry, setFingerprintId, setAuthReady, clearUser } = userSlice.actions;
export default userSlice.reducer;

// Selectors
export const selectUser = (state: any) => state.user;

export const selectDisplayName = (state: any) => {
  const user = state.user;
  return user.userMetadata.name || 
         user.userMetadata.fullName || 
         (user.email ? user.email.split('@')[0] : null) || 
         "User";
};

export const selectProfilePhoto = (state: any) => {
  const user = state.user;
  return user.userMetadata.picture || null;
};

export const selectIsAdmin = (state: any) => {
  const user = state.user;
  return user.isAdmin || false;
};

export const selectAccessToken = (state: any) => {
  return state.user.accessToken || null;
};

export const selectFingerprintId = (state: any) => {
  return state.user.fingerprintId || null;
};

export const selectAuthReady = (state: any) => {
  return state.user.authReady || false;
};

export const selectIsAuthenticated = (state: any) => {
  return !!state.user.id;
};
