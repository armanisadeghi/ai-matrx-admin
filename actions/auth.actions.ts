// File: actions/auth.actions.ts

"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signUpAction (formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  const supabase = await createClient()
  
  const origin = (await headers()).get("origin");
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";

  console.log("SignUpAction - Email:", email);
  console.log("SignUpAction - RedirectTo:", redirectTo);
  console.log("SignUpAction - Origin:", origin);

  if (!email || !password) {
    console.error("SignUpAction - Missing email or password");
    return encodedRedirect("error", "/sign-up", "Email and password are required");
  }

  // Simplify the redirectTo URL - just use the base callback URL
  const callbackUrl = `${origin}/auth/callback`;
  console.log("SignUpAction - Using callback URL:", callbackUrl);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  console.log("SignUpAction - Response data:", data);

  if (error) {
    console.error("SignUpAction - Error:", error.code, error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } 
  
  // Check if the user object exists in the response
  if (!data.user) {
    console.error("SignUpAction - No user returned");
    return encodedRedirect("error", "/sign-up", "Signup failed. Please try again.");
  }
  
  // If we get here, the signup was successful and verification email was sent
  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link."
  );
};


export async function signInAction (formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  console.log("SignInAction - RedirectTo:", redirectTo); // Debug log
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return redirect(redirectTo);
};

export async function signInWithGoogleAction (formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get("origin");
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
    return encodedRedirect("error", "/login", error.message);
  }

  if (data?.url) {
    console.log("Redirecting to OAuth URL:", data.url); // Debug log
    return redirect(data.url);
  }

  console.error("Failed to initiate Google sign-in"); // Debug log
  return encodedRedirect("error", "/login", "Failed to initiate Google sign-in");
};



export async function signInWithGithubAction (formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get("origin");
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
    return encodedRedirect("error", "/login", error.message);
  }

  if (data?.url) {
    console.log("Redirecting to OAuth URL:", data.url); // Debug log
    return redirect(data.url);
  }

  return encodedRedirect("error", "/login", "Failed to initiate GitHub sign-in");
};



export async function forgotPasswordAction (formData: FormData) {
  const email = formData.get("email")?.toString();
  const supabase = await createClient()
  const origin = (await headers()).get("origin");
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

export async function resetPasswordAction (formData: FormData) {
  const supabase = await createClient()

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

export async function signOutAction () {
  const supabase = await createClient()
  await supabase.auth.signOut();
  return redirect("/login");
};


export async function signUpWithGoogleAction (formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get("origin");
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
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (data?.url) {
    return redirect(data.url);
  }

  return encodedRedirect("error", "/sign-up", "Failed to initiate Google sign-up");
};



export const signUpWithGithubAction = async (formData: FormData) => {
  const supabase = await createClient()
  const origin = (await headers()).get("origin");
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
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (data?.url) {
    return redirect(data.url);
  }

  return encodedRedirect("error", "/sign-up", "Failed to initiate GitHub sign-up");
};
