// File: app/auth/confirm/route.ts

import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
    console.log('Auth confirm route initiated')
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/'

    console.log(`Auth confirm params - token_hash: ${token_hash ? '[REDACTED]' : 'null'}, type: ${type}, next: ${next}`)

    if (token_hash && type) {
        const supabase = createClient()
        console.log('Verifying OTP')
        const { error, data } = await supabase.auth.verifyOtp({ type, token_hash })
        console.log('OTP verification result:', error ? 'Error' : 'Success', data)

        if (!error) {
            console.log(`OTP verification successful, redirecting to: ${next}`)
            redirect(next)
        }
    }

    console.log('Auth confirmation failed, redirecting to error page')
    redirect('/error')
}
