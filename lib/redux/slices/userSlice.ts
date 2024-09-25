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
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<UserState>) => {
            return { ...state, ...action.payload };
        },
        clearUser: () => initialState,
    },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
