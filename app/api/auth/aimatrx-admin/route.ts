import { NextResponse, type NextRequest } from "next/server";
import {
  generatePKCEParams,
  buildAuthorizeURL,
} from "@/lib/auth/aimatrx-oauth";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);

  // Optional: after successful admin login, redirect the user to this URL
  // instead of the default /dashboard. Used by external SPAs (e.g. aidream dashboard).
  const appRedirect = searchParams.get("app_redirect");

  const redirectUri = `${origin}/auth/callback/admin`;

  const { codeVerifier, codeChallenge, state } = await generatePKCEParams();
  const authorizeURL = buildAuthorizeURL(redirectUri, codeChallenge, state);

  const response = NextResponse.redirect(authorizeURL);

  response.cookies.set("aimatrx_admin_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  response.cookies.set("aimatrx_admin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  if (appRedirect) {
    response.cookies.set("aimatrx_admin_app_redirect", appRedirect, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
