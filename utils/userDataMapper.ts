// File: utils/userDataMapper.ts

export function mapUserData(user: any) {
    return {
        id: user?.id || null,
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
    };
}
