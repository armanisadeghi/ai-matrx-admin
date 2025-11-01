// File: lib/hooks/useUser.ts

import { useAppSelector } from '@/lib/redux/hooks';
import * as userSelectors from '@/lib/redux/selectors/userSelectors';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';

/**
 * useUser Hook
 * 
 * Provides easy access to user data from Redux store.
 * 
 * Important:
 * - isAdmin is set during app initialization in layouts
 * - For client-side UI decisions only
 * - Never rely on isAdmin for security-critical operations
 * - Always verify admin status server-side for protected actions
 */
export function useUser() {
    const user = useAppSelector(userSelectors.selectUser);
    const userId = useAppSelector(userSelectors.selectUserId);
    const userEmail = useAppSelector(userSelectors.selectUserEmail);
    const userPhone = useAppSelector(userSelectors.selectUserPhone);
    const userEmailConfirmedAt = useAppSelector(userSelectors.selectUserEmailConfirmedAt);
    const userLastSignInAt = useAppSelector(userSelectors.selectUserLastSignInAt);
    const userAppMetadata = useAppSelector(userSelectors.selectUserAppMetadata);
    const userMetadata = useAppSelector(userSelectors.selectUserMetadata);
    const userIdentities = useAppSelector(userSelectors.selectUserIdentities);

    const activeUserId = useAppSelector(userSelectors.selectActiveUserId);
    const activeUserName = useAppSelector(userSelectors.selectActiveUserName);
    const activeUserAvatarUrl = useAppSelector(userSelectors.selectActiveUserAvatarUrl);
    const activeUserInfo = useAppSelector(userSelectors.selectActiveUserInfo);

    const fullUserData = useAppSelector(userSelectors.selectFullUserData);
    
    // Admin status from Redux (set during app initialization)
    const isAdmin = useAppSelector(selectIsAdmin);

    // Helper function to check if the user is authenticated
    const isAuthenticated = !!userId;

    return {
        user,
        userId,
        userEmail,
        userPhone,
        userEmailConfirmedAt,
        userLastSignInAt,
        userAppMetadata,
        userMetadata,
        userIdentities,
        activeUserId,
        activeUserName,
        activeUserAvatarUrl,
        activeUserInfo,
        fullUserData,
        isAuthenticated,
        isAdmin, // ✅ Admin status available here
    };
}