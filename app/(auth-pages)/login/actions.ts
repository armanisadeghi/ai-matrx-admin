"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "http://aimatrx.com";

export async function login(formData: FormData) {
    const supabase = await createClient();
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
    redirect("/dashboard");
}



export async function signup(formData: FormData) {
    const supabase = await createClient();
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const Props = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    console.log(Props);
    const { data, error } = await supabase.auth.signUp(Props);
    console.log(data);
    console.log(error);
    if (error) {
        redirect("/error");
    }
    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function loginWithGoogle(redirectTo: string) {
    const supabase = await createClient();

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

export async function loginWithGithub(redirectTo: string) {
    const supabase = await createClient();

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
