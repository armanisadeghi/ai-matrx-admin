// app/login/actions.ts

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import {headers} from "next/headers";
import {encodedRedirect} from "@/utils/utils";

export async function login(formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/error')
    }

    revalidatePath('/', 'layout')
    redirect('/admin')
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/error')
    }

    revalidatePath('/', 'layout')
    redirect('/admin')
}


export async function loginWithGoogle(formData: FormData) {
    const supabase = createClient()


    const origin = headers().get("origin");
    const redirectTo = formData.get("redirectTo") as string || "/dashboard";

    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("\n Sign In Action: redirectTo", encodeURIComponent(redirectTo));


    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: callbackUrl.toString(),
        },
    });

    if (error) {
        return encodedRedirect("error", "/sign-in", error.message);
    }

    if (data?.url) {
        console.log("Redirecting to OAuth URL:", data.url);
        return redirect(data.url);
    }

    return encodedRedirect("error", "/sign-in", "Failed to initiate Google sign-in");
};


export async function loginWithGithub(formData: FormData) {
    const supabase = createClient()

    const origin = headers().get("origin");
    const redirectTo = formData.get("redirectTo") as string || "/dashboard";

    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("redirectTo", encodeURIComponent(redirectTo));

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: callbackUrl.toString(),
        },
    });

    if (error) {
        return encodedRedirect("error", "/sign-in", error.message);
    }

    if (data?.url) {
        console.log("Redirecting to OAuth URL:", data.url);
        return redirect(data.url);
    }

    return encodedRedirect("error", "/sign-in", "Failed to initiate GitHub sign-in");
};
