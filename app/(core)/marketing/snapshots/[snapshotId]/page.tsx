// record-view: none — an immutable page capture (a ledger record) that takes no custom fields
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { webDb } from "@/utils/supabase/webDb";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { RecordId } from "@ai-matrx/design-system";
import { displayId } from "@ai-matrx/design-system/record-id-format";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * A page capture by its id alone: /marketing/snapshots/[snapshotId].
 *
 * When the caller can read the capture's site AND brand, this forwards to the full snapshot screen under its
 * website (`…/websites/<site>/pages/<page>/snapshots/<id>`) — the same lanes as /marketing/pages/[pageId].
 * The minimal view below stays only for a capture-only grantee, who must never be sent to a site they lack.
 */

export default async function MarketingSnapshotPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;
  if (!isUuidShape(snapshotId)) notFound();

  const supabase = await createClient();
  const db = webDb(supabase);
  const response = await db
    .from("snapshot")
    .select(
      "id, page_id, site_id, captured_at, final_url, http_status, word_count, content_hash, body_file_id, markdown_file_id",
    )
    .eq("id", snapshotId)
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return (
      <AccessGate
        token="web_snapshot"
        id={snapshotId}
        error={response.error}
        fallbackHref="/marketing"
        fallbackLabel="Marketing"
      />
    );
  }

  const snapshot = response.data;

  // Probe the parents under the caller's JWT; nothing from them renders in the fallback lane.
  const siteResponse = await db
    .from("site")
    .select("id, slug, brand_id")
    .eq("id", snapshot.site_id)
    .maybeSingle();
  const site = siteResponse.error ? null : siteResponse.data;
  if (site?.brand_id) {
    const brandResponse = await db
      .from("brand")
      .select("id, slug")
      .eq("id", site.brand_id)
      .maybeSingle();
    if (!brandResponse.error && brandResponse.data) {
      redirect(
        `${marketingRoutes.sitePage(marketingSeg(brandResponse.data), marketingSeg(site), snapshot.page_id)}/snapshots/${snapshot.id}`,
      );
    }
  }

  const screenshots = await db
    .from("screenshot")
    .select("id, kind, file_id, captured_at, width, height")
    .eq("snapshot_id", snapshotId)
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });
  if (screenshots.error) throw screenshots.error;

  return (
    <main className="h-full overflow-y-auto bg-textured p-4 sm:p-6">
      <div className="mx-auto grid max-w-4xl gap-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Immutable page capture
              </p>
              <h1 className="truncate text-xl font-semibold">
                {snapshot.final_url || snapshot.id}
              </h1>
              <RecordId value={snapshot.id} label="Page capture" show="full" className="mt-1" />
            </div>
            <ShareButton
              resourceType="web_snapshot"
              resourceId={snapshot.id}
              resourceName={snapshot.final_url || `Page capture ${displayId(snapshot.id)}`}
            />
          </header>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Captured</dt><dd>{new Date(snapshot.captured_at).toLocaleString()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">HTTP</dt><dd>{snapshot.http_status ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Words</dt><dd>{snapshot.word_count?.toLocaleString() ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Hash</dt><dd className="font-mono text-xs">{snapshot.content_hash?.slice(0, 16) ?? "—"}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/files/f/${snapshot.body_file_id}`}>Open stored body</Link></Button>
            {snapshot.markdown_file_id ? (
              <Button asChild variant="outline"><Link href={`/files/f/${snapshot.markdown_file_id}`}>Open Markdown</Link></Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Contained screenshots</h2>
          {screenshots.data?.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {screenshots.data.map((screenshot) => (
                <Link
                  key={screenshot.id}
                  href={`/marketing/screenshots/${screenshot.id}`}
                  className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">{screenshot.kind.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {screenshot.width && screenshot.height
                      ? `${screenshot.width} × ${screenshot.height} · `
                      : ""}
                    {new Date(screenshot.captured_at).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No screenshots belong to this page capture.</p>
          )}
        </section>
      </div>
    </main>
  );
}
