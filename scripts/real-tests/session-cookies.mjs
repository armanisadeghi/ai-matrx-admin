// The ONE sign-in for real-test browsers (pw.mjs locally, pw-cloud.mjs in a cloud machine).
// The password goes to the Supabase auth API from this Mac and nowhere else, never into a page; the
// session comes back as the app's own cookies (@supabase/ssr, name/domain from utils/supabase/authCookie.ts),
// ready for Playwright's addCookies. Nothing is printed but errors naming the email.
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);

export function frontendEnv() {
  const text = ["../../.env", "../../.env.local"].map((f) => { try { return fs.readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return ""; } }).join("\n");
  const env = {};
  for (const line of text.split("\n")) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
  return env;
}

/** Signs `want` (default admin@admin.com) in over the auth API; returns { email, userId, cookies } or exits with a reason. */
export async function mintSessionCookies(want) {
  const env = frontendEnv();
  const email = (want || env.AI_ADMIN_USERNAME || "admin@admin.com").toLowerCase();
  const pairs = [["AI_ADMIN_USERNAME", "AI_ADMIN_PASSWORD"], ["AI_MEMBER_USERNAME", "AI_MEMBER_PASSWORD"]];
  const hit = pairs.find(([u, p]) => env[u]?.toLowerCase() === email && env[p]);
  if (!hit) { console.error(`signin: no credentials for ${email} in the matrx-frontend .env files`); process.exit(1); }
  const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) { console.error("signin: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing from .env.local"); process.exit(1); }
  const { createServerClient } = require("@supabase/ssr");
  const jar = new Map();
  const sb = createServerClient(url, key, {
    cookieOptions: { name: "sb-matrx-auth-v2", domain: ".aimatrx.com", secure: true },
    cookies: { getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })), setAll: (cs) => cs.forEach((c) => jar.set(c.name, c)) },
  });
  const { data, error } = await sb.auth.signInWithPassword({ email: env[hit[0]], password: env[hit[1]] });
  if (error) { console.error(`signin: Supabase refused the sign-in for ${email} (${error.status ?? ""} ${error.code ?? error.name})`); process.exit(1); }
  const now = Math.floor(Date.now() / 1000);
  const cookies = [...jar.values()].filter((c) => c.value && !(c.options?.maxAge === 0)).map((c) => ({
    name: c.name, value: c.value, domain: ".aimatrx.com", path: "/", secure: true, httpOnly: false, sameSite: "Lax", expires: now + (c.options?.maxAge ?? 34560000),
  }));
  // accessToken: the same session for a harness's own API reads/writes as this person (never printed).
  return { email, userId: data.user.id, cookies, accessToken: data.session?.access_token ?? null };
}
