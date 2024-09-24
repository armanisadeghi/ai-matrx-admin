// app/login/actions.ts

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = createClient()
    const loginMethod = formData.get('loginMethod') as string

    let error

    switch (loginMethod) {
        case 'email':
            const email = formData.get('email') as string
            const password = formData.get('password') as string
            const { error: emailError } = await supabase.auth.signInWithPassword({ email, password })
            error = emailError
            break

        case 'google':
        case 'github':
            const { error: oauthError, data } = await supabase.auth.signInWithOAuth({
                provider: loginMethod,
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}`
                }
            })
            error = oauthError
            if (!error && data?.url) {
                // Redirect to the OAuth provider
                redirect(data.url)
            }
            break

        default:
            error = new Error('Invalid login method')
    }

    if (error) {
        console.error('Login error:', error)
        redirect('/error')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
        console.error('Signup error:', error)
        redirect('/error')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
