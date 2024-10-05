// File: lib/redux/selectors/userSelectors.ts

import { RootState } from '../store';

// Basic selectors
export const selectUser = (state: RootState) => state.user;
export const selectUserId = (state: RootState) => state.user.id;
export const selectUserEmail = (state: RootState) => state.user.email;
export const selectUserPhone = (state: RootState) => state.user.phone;
export const selectUserEmailConfirmedAt = (state: RootState) => state.user.emailConfirmedAt;
export const selectUserLastSignInAt = (state: RootState) => state.user.lastSignInAt;

// App metadata selectors
export const selectUserAppMetadata = (state: RootState) => state.user.appMetadata;
export const selectUserProvider = (state: RootState) => state.user.appMetadata.provider;
export const selectUserProviders = (state: RootState) => state.user.appMetadata.providers;

// User metadata selectors
export const selectUserMetadata = (state: RootState) => state.user.userMetadata;
export const selectUserAvatarUrl = (state: RootState) => state.user.userMetadata.avatarUrl;
export const selectUserFullName = (state: RootState) => state.user.userMetadata.fullName;
export const selectUserName = (state: RootState) => state.user.userMetadata.name;
export const selectUserPreferredUsername = (state: RootState) => state.user.userMetadata.preferredUsername;
export const selectUserPicture = (state: RootState) => state.user.userMetadata.picture;

// Identities selector
export const selectUserIdentities = (state: RootState) => state.user.identities;

// Specific selectors requested
export const selectActiveUserId = selectUserId;
export const selectActiveUserName = (state: RootState) =>
    state.user.userMetadata.name ||
    state.user.userMetadata.fullName ||
    state.user.userMetadata.preferredUsername;
export const selectActiveUserAvatarUrl = (state: RootState) =>
    state.user.userMetadata.avatarUrl ||
    state.user.userMetadata.picture;

export const selectActiveUserInfo = (state: RootState) => ({
    id: selectActiveUserId(state),
    name: selectActiveUserName(state),
    avatarUrl: selectActiveUserAvatarUrl(state),
});

// Authentication-related selectors
// Note: Based on your current setup, it seems you're not storing the access token in the Redux store.
// If you need to add this later, you would need to update your userSlice and then add a selector here.
export const selectAuthToken = (state: RootState) => {
    // This is a placeholder. You might need to implement this based on where you store the auth token.
    // If it's not in the Redux store, you might need to use a different method to retrieve it.
    return null;
};

// Composite selector for all user data
export const selectFullUserData = (state: RootState) => ({
    ...state.user,
    activeUserInfo: selectActiveUserInfo(state),
    authToken: selectAuthToken(state),
});