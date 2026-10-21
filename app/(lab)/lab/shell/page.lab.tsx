// The new app frame — playground (owner model, 2026-10-17). Static samples;
// components live in features/shell/frame/ and later move to @ai-matrx/shell.
// Every link in the playground comes back here: ?product=<id>&item=<id>.
import "@/features/shell/frame/frame.css";
import { ShellPlayground } from "./ShellPlayground";

export const metadata = { title: "App frame" };

export default async function LabShellPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const product = one(params.product);
  const item = one(params.item);
  // The key remounts the playground when a sidebar link changes the query in place.
  return (
    <ShellPlayground key={`${product ?? ""}:${item ?? ""}`} initialProduct={product} initialItem={item} />
  );
}
