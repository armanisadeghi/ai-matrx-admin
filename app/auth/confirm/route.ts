// File: app/auth/confirm/route.ts

import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/'

    if (token_hash && type) {
        const cookieStore = cookies()
        const supabase = createClient(cookieStore)

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        if (!error) {
            return redirect(next)
        }
    }

    return redirect('/error')
}
