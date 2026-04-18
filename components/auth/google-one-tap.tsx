'use client'

// Google One Tap sign-in for Supabase.
// Follows Supabase's official pattern: generate a random nonce, send the
// SHA-256 hash to Google, then pass the raw nonce to signInWithIdToken so
// Supabase can verify Google hashed it per the OpenID Connect spec.
// Docs: https://supabase.com/docs/guides/auth/social-login/auth-google#google-one-tap-for-nextjs

import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: GoogleInitConfig) => void
                    prompt: (listener?: (notification: GooglePromptNotification) => void) => void
                    cancel: () => void
                }
            }
        }
    }
}

interface GoogleCredentialResponse {
    credential: string
    select_by?: string
}

interface GoogleInitConfig {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    nonce?: string
    use_fedcm_for_prompt?: boolean
    itp_support?: boolean
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    context?: 'signin' | 'signup' | 'use'
}

interface GooglePromptNotification {
    isNotDisplayed: () => boolean
    isSkippedMoment: () => boolean
    isDismissedMoment: () => boolean
    getNotDisplayedReason: () => string
    getSkippedReason: () => string
    getDismissedReason: () => string
    getMomentType: () => string
}

interface GoogleOneTapProps {
    redirectTo?: string
    context?: 'signin' | 'signup' | 'use'
}

async function generateNonce(): Promise<[string, string]> {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
    const hashedNonce = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    return [nonce, hashedNonce]
}

export default function GoogleOneTap({ redirectTo = '/dashboard', context = 'signin' }: GoogleOneTapProps) {
    const router = useRouter()
    const initializedRef = useRef(false)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    const initializeOneTap = useCallback(async () => {
        if (initializedRef.current) return
        if (!clientId || !window.google?.accounts?.id) return

        const { data: { session } } = await supabase.auth.getSession()
        if (session) return

        const [nonce, hashedNonce] = await generateNonce()
        initializedRef.current = true

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.credential,
                    nonce,
                })
                if (error) {
                    console.error('Google One Tap sign-in failed:', error)
                    initializedRef.current = false
                    return
                }
                router.refresh()
                router.push(redirectTo)
            },
            nonce: hashedNonce,
            use_fedcm_for_prompt: true,
            itp_support: true,
            auto_select: false,
            cancel_on_tap_outside: true,
            context,
        })

        window.google.accounts.id.prompt()
    }, [clientId, context, redirectTo, router])

    if (!clientId) return null

    return (
        <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={initializeOneTap}
        />
    )
}
