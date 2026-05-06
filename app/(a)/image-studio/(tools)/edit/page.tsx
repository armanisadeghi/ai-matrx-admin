import EditShellClient from "./EditShellClient";

/**
 * /image-studio/edit
 *
 * Full-page Filerobot editor. Source is provided via query params:
 *   ?url=<absolute>    → load from URL
 *   ?cloudFileId=<id>  → load from cloud_files (resolved client-side)
 *
 * The shell is dynamically imported with ssr:false because Filerobot reaches
 * for `window`, `document`, and the canvas API on first paint.
 *
 * Header + outer chrome are owned by `(tools)/layout.tsx`.
 */

interface PageProps {
  searchParams: Promise<{
    url?: string;
    cloudFileId?: string;
    folder?: string;
  }>;
}

export default async function EditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <EditShellClient
      urlParam={params.url ?? null}
      cloudFileId={params.cloudFileId ?? null}
      folder={params.folder}
    />
  );
}
