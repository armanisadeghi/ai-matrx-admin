import { redirect } from "next/navigation";

/**
 * /vault/approve-browser?key=<thumbprint>&label=<browser>[&kind=mac] — the
 * link the AI Matrx extension (and the Mac app) opens to approve filling.
 * Kept working: it becomes the Vault's approve panel (`panel=approve:<key>`),
 * which reads `label` and `kind` beside it. Signed-out people are sent to
 * sign in by /vault, which keeps the whole address.
 */
export default async function ApproveBrowserRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? params[k] : null);
  const query = new URLSearchParams();
  const key = one("key");
  if (key) query.set("panel", `approve:${key}`);
  const label = one("label");
  if (label) query.set("label", label);
  const kind = one("kind");
  if (kind) query.set("kind", kind);
  redirect(`/vault${query.size ? `?${query}` : ""}`);
}
