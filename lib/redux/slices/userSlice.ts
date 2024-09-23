import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
    user: any | null;
    preferences: any | null;
}

const initialState: UserState = {
    user: null,
    preferences: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<any>) => {
            state.user = action.payload;
        },
        setPreferences: (state, action: PayloadAction<any>) => {
            state.preferences = action.payload;
        },
        clearUser: (state) => {
            state.user = null;
            state.preferences = null;
        },
    },
});

export const { setUser, setPreferences, clearUser } = userSlice.actions;
export default userSlice.reducer;
