// File: app/actions.ts

"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = createClient();
  const origin = headers().get("origin");
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
        "success",
        "/sign-up",
        "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  console.log("SignInAction - RedirectTo:", redirectTo); // Debug log
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(redirectTo);
};

export const signInWithGoogleAction = async (formData: FormData) => {
  const supabase = createClient();
  const origin = headers().get("origin");
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  console.log("SignInWithGoogleAction - RedirectTo:", redirectTo); // Debug log

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("\n Sign In Action: redirectTo", encodeURIComponent(redirectTo));

  console.log("Callback URL:", callbackUrl.toString()); // Debug log

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    console.error("Error in signInWithGoogleAction:", error); // Debug log
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (data?.url) {
    console.log("Redirecting to OAuth URL:", data.url); // Debug log
    return redirect(data.url);
  }

  console.error("Failed to initiate Google sign-in"); // Debug log
  return encodedRedirect("error", "/sign-in", "Failed to initiate Google sign-in");
};



export const signInWithGithubAction = async (formData: FormData) => {
  const supabase = createClient();
  const origin = headers().get("origin");
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  console.log("SignInWithGithubAction - RedirectTo:", redirectTo); // Debug log

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
    console.log("Redirecting to OAuth URL:", data.url); // Debug log
    return redirect(data.url);
  }

  return encodedRedirect("error", "/sign-in", "Failed to initiate GitHub sign-in");
};



export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
        "error",
        "/forgot-password",
        "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
      "success",
      "/forgot-password",
      "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
        "error",
        "/reset-password",
        "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
        "error",
        "/reset-password",
        "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
        "error",
        "/reset-password",
        "Password update failed",
    );
  }

  encodedRedirect("success", "/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
