"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "http://aimatrx.com";

export async function login(redirectToArg: string, formData: FormData) {
    const supabase = await createClient();
    
    // Get redirectTo from either the function arg or the form data
    // This provides a fallback in case the function binding doesn't work
    let redirectTo = redirectToArg;
    const formRedirectTo = formData.get("redirectTo");
    if (!redirectTo && formRedirectTo && typeof formRedirectTo === 'string') {
        redirectTo = formRedirectTo;
    }
    
    console.log("Login action - incoming redirectTo:", redirectToArg);
    console.log("Login action - form redirectTo:", formRedirectTo);
    console.log("Login action - final redirectTo:", redirectTo);
    
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
        redirect("/error");
    }
    revalidatePath("/", "layout");
    
    // Ensure redirectTo has a default value
    const finalRedirect = redirectTo || "/dashboard";
    console.log("Login action - redirecting to:", finalRedirect);
    
    // Redirect to the original URL if available, otherwise to dashboard
    redirect(finalRedirect);
}

export async function signup(redirectToArg: string, formData: FormData) {
    const supabase = await createClient();
    
    // Get redirectTo from either the function arg or the form data
    let redirectTo = redirectToArg;
    const formRedirectTo = formData.get("redirectTo");
    if (!redirectTo && formRedirectTo && typeof formRedirectTo === 'string') {
        redirectTo = formRedirectTo;
    }
    
    console.log("Signup action - redirectTo:", redirectTo);
    
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const Props = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    
    const { data, error } = await supabase.auth.signUp(Props);
    console.log(data);
    console.log(error);
    if (error) {
        redirect("/error");
    }
    revalidatePath("/", "layout");
    
    // Ensure redirectTo has a default value
    const finalRedirect = redirectTo || "/dashboard";
    
    // Redirect to the original URL if available, otherwise to dashboard
    redirect(finalRedirect);
}

export async function loginWithGoogle(redirectToArg: string, formData?: FormData) {
    const supabase = await createClient();
    
    // Get redirectTo from either the function arg or the form data
    let redirectTo = redirectToArg;
    if (formData) {
        const formRedirectTo = formData.get("redirectTo");
        if (!redirectTo && formRedirectTo && typeof formRedirectTo === 'string') {
            redirectTo = formRedirectTo;
        }
    }
    
    console.log("Google login - redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${baseUrl}/auth/callback${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
        },
    });

    if (data.url) {
        redirect(data.url);
    }

    if (error) {
        redirect(`/error${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`);
    }
}

export async function loginWithGithub(redirectToArg: string, formData?: FormData) {
    const supabase = await createClient();
    
    // Get redirectTo from either the function arg or the form data
    let redirectTo = redirectToArg;
    if (formData) {
        const formRedirectTo = formData.get("redirectTo");
        if (!redirectTo && formRedirectTo && typeof formRedirectTo === 'string') {
            redirectTo = formRedirectTo;
        }
    }
    
    console.log("Github login - redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
            redirectTo: `${baseUrl}/auth/callback${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
        },
    });

    if (data.url) {
        redirect(data.url);
    }

    if (error) {
        redirect(`/error${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`);
    }
}
