// File: app/auth/confirm/route.ts

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    // Use redirectTo instead of next, default to '/dashboard' to match other routes
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });
        if (!error) {
            // redirect user to specified redirect URL
            redirect(redirectTo);
        }
    }

    // redirect to error page, preserving redirectTo if different from default
    const errorUrl = `/error${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
    redirect(errorUrl);
}
