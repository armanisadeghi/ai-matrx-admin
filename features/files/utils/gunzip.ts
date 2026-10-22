/**
 * A stored file's bytes as text, gunzipped in the browser when they are gzip
 * (magic `1f 8b`), else decoded as UTF-8. The one reader for stored captures
 * (web snapshots, Watch AI raw answers kept as `.raw.gz`).
 */
export async function gunzipIfNeeded(blob: Blob): Promise<string> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (head[0] === 0x1f && head[1] === 0x8b) {
    const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return blob.text();
}
