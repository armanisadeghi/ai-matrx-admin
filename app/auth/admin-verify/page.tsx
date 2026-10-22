// app/auth/admin-verify/page.tsx — WHERE AN ADMINISTRATOR VERIFIES (READY-04).
//
// With the platform.auth / admin_mfa_required knob on, an administrator whose
// session is aal1 is sent here by the admin layout (manage.aimatrx.com) or the
// admin dashboard SPA (admin.aimatrx.com / admin.app.matrxserver.com). It is
// the existing account-settings authenticator flow in challenge mode: verify a
// code (or a saved recovery code), or add an authenticator when there is none
// — then back to where they were going. Lives under /auth so every host
// (main, manage, demos) serves it (lib/deployment/surfaces.ts, /auth prefix).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthPageContainer from "@/components/auth/auth-page-container";
import { loginHref } from "@/utils/auth/auth-destination";
import { ADMIN_VERIFY_PATH, adminVerifyDestination } from "@/utils/auth/adminMfa";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { AdminVerifyPanel } from "./AdminVerifyPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify it's you · AI Matrx",
  robots: { index: false, follow: false },
};

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;
  const raw = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo;
  const destination = adminVerifyDestination(raw);
  const verdict = await getSessionVerdict();
  if (verdict.state !== "signed_in") {
    redirect(loginHref(`${ADMIN_VERIFY_PATH}?redirectTo=${encodeURIComponent(destination)}`));
  }
  return (
    <AuthPageContainer title="Verify it's you" subtitle="Administration needs your authenticator.">
      <AdminVerifyPanel destination={destination} />
    </AuthPageContainer>
  );
}
