// app/(link)/v/[slug]/page.tsx — A PUBLISHED VIEW, OPENED BY SOMEBODY WHO IS NOT SIGNED IN.
//
// `custom.publish_bind(kind => 'view')` gives a saved view a public address; this is the page that
// address opens (`/p/<slug>` is the Applet redirect, so a view's address is `/v/<slug>`). It lives in
// `(link)` because it is a link somebody SENT — the owner's client opens it to look at the board — not a
// page of our website: no marketing header or footer, no shell.
//
// WHAT IT SHOWS is exactly what `custom.published_view_read` returns: the view's own layout (grid, board
// or calendar), its filter already applied, only the fields the view shows. Server-rendered, no client
// code, no session. One 404 answers a revoked address, a taken-down view and an address nobody made: they
// are one answer on purpose, so an address cannot be used to learn that something used to be there.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicLinkNotice } from "@/components/public-link/PublicLinkNotice";
import { PublicViewBody } from "@/features/sharing/public-view/PublicViewBody";
import { PublicViewLocked } from "@/features/sharing/public-view/PublicViewLocked";
import { publishedView, SHARE_TOKEN_SHAPE } from "@/features/sharing/public-view/service";
import { readUnlockCookieValue, unlockCookieName } from "@/features/sharing/public-view/unlock";

// Somebody's board, opened now: never cached across people, and the rows move.
export const dynamic = "force-dynamic";

// A protected link the visitor already unlocked carries a signed cookie; the store compares its fingerprint on every read.
async function unlockOf(slug: string): Promise<string | undefined> {
  if (!SHARE_TOKEN_SHAPE.test(slug)) return undefined;
  return readUnlockCookieValue(slug, (await cookies()).get(unlockCookieName(slug))?.value);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const view = await publishedView(slug, undefined, await unlockOf(slug)).catch(() => null);
  return {
    title: !view ? "Not found · AI Matrx" : view.state === "locked" ? "Password needed · AI Matrx" : `${view.title} · AI Matrx`,
    // A published view is meant for the people it was sent to; we do not index it.
    robots: { index: false, follow: false },
  };
}

export default async function PublishedViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wrong?: string }>;
}) {
  const { slug } = await params;
  const { wrong } = await searchParams;
  const view = await publishedView(slug, undefined, await unlockOf(slug));
  // A real 404, not a 200 that says "nothing here": a revoked link, a taken-down view and a link nobody made are one answer.
  if (!view) notFound();
  if (view.state === "locked") return <PublicViewLocked token={slug} wrong={wrong === "1"} />;
  if (view.state === "archived") {
    return <PublicLinkNotice title={view.title} message="The owner has archived this, so it is no longer shown." />;
  }
  return (
    <main className="matrx-touch-targets mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 pb-safe pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-xl font-medium">{view.title}</h1>
        {view.table ? <p className="text-xs text-muted-foreground">{view.table}</p> : null}
      </header>
      <PublicViewBody view={view} />
      {view.truncated ? <p className="text-xs text-muted-foreground">Showing the first {view.count} items.</p> : null}
      <footer className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        {view.notice || "Nothing was scanned before this was listed."}
      </footer>
    </main>
  );
}
