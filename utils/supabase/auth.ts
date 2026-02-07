import { supabase } from "@/utils/supabase/client";
import { createClient } from "@/utils/supabase/server";

export type Provider = 'github' | 'google' | 'apple';

export const signInWithOAuth = async (provider: Provider) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
        });

        if (error) {
            throw error;
        }
        console.log('data:', data);
    } catch (error: any) {
        console.error('Error in signInWithOAuth:', error);
        return null;
    }
}


export const getSession = async () => {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
        console.log('data:', data);
    } catch (error: any) {
        console.error('Error in getSession:', error);
        return null;
    }
}

export async function getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        return null;
    }
    return data.user;
}


export const updateUser = async (email: string, data: any) => {
    try {
        const { data, error } = await supabase.auth.updateUser({
            // ...data,
            email: email
        });
        if (error) {
            throw error;
        }
        console.log('data:', data);
    } catch (error: any) {
        console.error('Error in updateUser:', error);
        return null;
    }
}

export const linkIdentity = async (provider: Provider, token: string) => {
    try {
        const { data, error } = await supabase.auth.linkIdentity({
            provider: provider
        });
        if (error) {
            throw error;
        }
        console.log('data:', data);
    } catch (error: any) {
        console.error('Error in linkIdentity:', error);
        return null;
    }
}


const sampleSignInWithIdTokenResponse = {
    "data": {
        "user": {
            "id": "11111111-1111-1111-1111-111111111111",
            "aud": "authenticated",
            "role": "authenticated",
            "last_sign_in_at": "2024-01-01T00:00:00Z",
            "app_metadata": {
                // ...
            },
            "user_metadata": {
                // ...
            },
            "identities": [
                {
                    "identity_id": "22222222-2222-2222-2222-222222222222",
                    "provider": "google",
                }
            ],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        },
        "session": {
            "access_token": "<ACCESS_TOKEN>",
            "token_type": "bearer",
            "expires_in": 3600,
            "expires_at": 1700000000,
            "refresh_token": "<REFRESH_TOKEN>",
            "user": {
                "id": "11111111-1111-1111-1111-111111111111",
                "aud": "authenticated",
                "role": "authenticated",
                "last_sign_in_at": "2024-01-01T00:00:00Z",
                "app_metadata": {
                    // ...
                },
                "user_metadata": {
                    // ...
                },
                "identities": [
                    {
                        "identity_id": "22222222-2222-2222-2222-222222222222",
                        "provider": "google",
                    }
                ],
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }
        }
    },
    "error": null
}


const sampleSignInWithPasswordResponse = {
    "data": {
        "user": {
            "id": "11111111-1111-1111-1111-111111111111",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "example@email.com",
            "email_confirmed_at": "2024-01-01T00:00:00Z",
            "phone": "",
            "last_sign_in_at": "2024-01-01T00:00:00Z",
            "app_metadata": {
                "provider": "email",
                "providers": [
                    "email"
                ]
            },
            "user_metadata": {},
            "identities": [
                {
                    "identity_id": "22222222-2222-2222-2222-222222222222",
                    "id": "11111111-1111-1111-1111-111111111111",
                    "user_id": "11111111-1111-1111-1111-111111111111",
                    "identity_data": {
                        "email": "example@email.com",
                        "email_verified": false,
                        "phone_verified": false,
                        "sub": "11111111-1111-1111-1111-111111111111"
                    },
                    "provider": "email",
                    "last_sign_in_at": "2024-01-01T00:00:00Z",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z",
                    "email": "example@email.com"
                }
            ],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        "session": {
            "access_token": "<ACCESS_TOKEN>",
            "token_type": "bearer",
            "expires_in": 3600,
            "expires_at": 1700000000,
            "refresh_token": "<REFRESH_TOKEN>",
            "user": {
                "id": "11111111-1111-1111-1111-111111111111",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "example@email.com",
                "email_confirmed_at": "2024-01-01T00:00:00Z",
                "phone": "",
                "last_sign_in_at": "2024-01-01T00:00:00Z",
                "app_metadata": {
                    "provider": "email",
                    "providers": [
                        "email"
                    ]
                },
                "user_metadata": {},
                "identities": [
                    {
                        "identity_id": "22222222-2222-2222-2222-222222222222",
                        "id": "11111111-1111-1111-1111-111111111111",
                        "user_id": "11111111-1111-1111-1111-111111111111",
                        "identity_data": {
                            "email": "example@email.com",
                            "email_verified": false,
                            "phone_verified": false,
                            "sub": "11111111-1111-1111-1111-111111111111"
                        },
                        "provider": "email",
                        "last_sign_in_at": "2024-01-01T00:00:00Z",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                        "email": "example@email.com"
                    }
                ],
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }
    },
    "error": null
}
