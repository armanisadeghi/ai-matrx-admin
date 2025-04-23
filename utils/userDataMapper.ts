// File: utils/userDataMapper.ts
export interface AppMetadata {
    provider: string | null;
    providers: string[];
}

export interface UserMetadata {
    avatarUrl: string | null;
    fullName: string | null;
    name: string | null;
    preferredUsername: string | null;
    picture: string | null;
}

export interface IdentityData {
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

export interface UserData {
    id: string | null;
    email: string | null;
    phone: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    appMetadata: AppMetadata;
    userMetadata: UserMetadata;
    identities: IdentityData[];
    isAdmin: boolean;
    accessToken: string | null;
}

const ADMIN_USER_IDS = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
];
  
export function mapUserData(user: any, accessToken?: any): UserData {
    const userId = user?.id || null;    
    return {
        id: userId,
        email: user?.email || null,
        phone: user?.phone || null,
        emailConfirmedAt: user?.email_confirmed_at || null,
        lastSignInAt: user?.last_sign_in_at || null,
        appMetadata: {
            provider: user?.app_metadata?.provider || null,
            providers: user?.app_metadata?.providers || [],
        },
        userMetadata: {
            avatarUrl: user?.user_metadata?.avatar_url || null,
            fullName: user?.user_metadata?.full_name || null,
            name: user?.user_metadata?.name || null,
            preferredUsername: user?.user_metadata?.preferred_username || null,
            picture: user?.user_metadata?.picture || null,
        },
        identities: user?.identities?.map((identity: any) => ({
            provider: identity?.provider || null,
            id: identity?.id || null,
            user_id: identity?.user_id || null,
            avatar_url: identity?.identity_data?.avatar_url || null,
            email: identity?.identity_data?.email || null,
            email_verified: identity?.identity_data?.email_verified || null,
            full_name: identity?.identity_data?.full_name || null,
            picture: identity?.identity_data?.picture || null,
            provider_id: identity?.identity_data?.provider_id || null,
            sub: identity?.identity_data?.sub || null,
            name: identity?.identity_data?.name || null,
        })) || [],
        isAdmin: userId ? ADMIN_USER_IDS.includes(userId) : false,
        accessToken: accessToken || null,
    };
}

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