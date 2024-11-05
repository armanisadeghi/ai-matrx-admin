// File: lib/redux/selectors/userSelectors.ts

import { RootState } from '../store';
import {createSelector} from "reselect";

// Basic selectors
export const selectUser = (state: RootState) => state.user;
export const selectUserId = (state: RootState) => state.user.id;
export const selectUserEmail = (state: RootState) => state.user.email;
export const selectUserPhone = (state: RootState) => state.user.phone;
export const selectUserEmailConfirmedAt = (state: RootState) => state.user.emailConfirmedAt;
export const selectUserLastSignInAt = (state: RootState) => state.user.lastSignInAt;

// App metadata selectors
export const selectUserAppMetadata = createSelector(
    [selectUser],
    (user) => user.appMetadata
);

export const selectUserProvider = createSelector(
    [selectUserAppMetadata],
    (appMetadata) => appMetadata.provider
);

export const selectUserProviders = createSelector(
    [selectUserAppMetadata],
    (appMetadata) => appMetadata.providers
);

// User metadata selectors
export const selectUserMetadata = createSelector(
    [selectUser],
    (user) => user.userMetadata
);

export const selectUserAvatarUrl = createSelector(
    [selectUserMetadata],
    (userMetadata) => userMetadata.avatarUrl
);

export const selectUserFullName = createSelector(
    [selectUserMetadata],
    (userMetadata) => userMetadata.fullName
);

export const selectUserName = createSelector(
    [selectUserMetadata],
    (userMetadata) => userMetadata.name
);

export const selectUserPreferredUsername = createSelector(
    [selectUserMetadata],
    (userMetadata) => userMetadata.preferredUsername
);

export const selectUserPicture = createSelector(
    [selectUserMetadata],
    (userMetadata) => userMetadata.picture
);

// Identities selector
export const selectUserIdentities = createSelector(
    [selectUser],
    (user) => user.identities
);

// Specific selectors requested
export const selectActiveUserId = selectUserId;

export const selectActiveUserName = createSelector(
    [selectUserMetadata],
    (userMetadata) =>
        userMetadata.name || userMetadata.fullName || userMetadata.preferredUsername
);

export const selectActiveUserAvatarUrl = createSelector(
    [selectUserMetadata],
    (userMetadata) =>
        userMetadata.avatarUrl || userMetadata.picture
);

export const selectActiveUserInfo = createSelector(
    [selectActiveUserId, selectActiveUserName, selectActiveUserAvatarUrl],
    (id, name, avatarUrl) => ({
        id,
        name,
        avatarUrl,
    })
);

// Authentication-related selectors
// Note: Based on your current setup, it seems you're not storing the access token in the Redux store.
// If you need to add this later, you would need to update your userSlice and then add a selector here.
export const selectAuthToken = (state: RootState) => {
    // This is a placeholder. You might need to implement this based on where you store the auth token.
    // If it's not in the Redux store, you might need to use a different method to retrieve it.
    return null;
};

// Composite selector for all user data
export const selectFullUserData = createSelector(
    [selectUser, selectActiveUserInfo, selectAuthToken],
    (user, activeUserInfo, authToken) => ({
        ...user,
        activeUserInfo,
        authToken,
    })
);
