// app/auth/support-session/ended/page.tsx — where a support window lands when its session is over
// or its one-time link could not start one. The window is already signed out by then.

import Link from "next/link";
import AuthPageContainer from "@/components/auth/auth-page-container";

const COPY: Record<string, { title: string; line: string }> = {
  ended: { title: "Support session ended", line: "This window is signed out." },
  expired: { title: "Support session ran out of time", line: "This window is signed out." },
  used: { title: "Link already used or expired", line: "Start a new support session from the admin users page." },
  invalid: { title: "Not a support link", line: "Copy the whole link from the admin users page." },
  failed: { title: "Support session could not start", line: "The sign-in was refused. Start a new one." },
};

export default async function SupportSessionEndedPage({
  searchParams,
}: {
  searchParams: Promise<{ why?: string }>;
}) {
  const { why } = await searchParams;
  const copy = COPY[why ?? "ended"] ?? COPY.ended;
  return (
    <AuthPageContainer title={copy.title} subtitle={copy.line}>
      <Link className="text-sm font-medium text-primary hover:underline" href="/login">
        Go to sign in
      </Link>
    </AuthPageContainer>
  );
}
