// Guard: the record-reference host and the settings host are bound at the root, for every route.
//
// Before 2026-10-22 both hosts were bound only by a bare side-effect import inside an unrelated chat
// registration file (providers/chatUiRegistrationBase.ts): any route that reached a record reference
// or a settings row without that chain drew the package's "unconfigured" stand-in. Now
// app/Providers.tsx mounts <EntityRefHost /> and <SettingsHost /> beside <SharingHost />. This test
// fails when:
//   1. Providers.tsx stops mounting either host (or SharingHost, the model they copy);
//   2. a top-level route-group layout takes no app Providers and is not on the reviewed list below;
//   3. a route on the LIGHT public list (no Providers by design) imports the reference or settings
//      packages directly, which would draw an unbound stand-in (it must call requestFull instead).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

/** Layouts that take no app Providers on purpose, each with why no reference or settings row draws there. */
const NO_PROVIDERS_LAYOUTS: Record<string, string> = {
  "app/layout.tsx": "the root: html/body, fonts, tokens; every group below it chooses its own tree",
  "app/(popup)/layout.tsx": "the extension popup: styles only, no record references",
  "app/error/layout.tsx": "the error page: plain text, no record references",
};

/** Layout files that take the app Providers tree (directly, or through the shell/link/public roots). */
const PROVIDERS_FAMILY = /\b(Providers|PublicAppRoot|LinkProviders|AppletProviders|AppShell)\b/;

const REFERENCE_PACKAGES = [
  "@ai-matrx/records-ui/entity-ref",
  "@ai-matrx/records-ui/entity-doors",
  "@ai-matrx/design-system/settings",
  "@/features/data-tables/records-ui-host/",
  "@/features/settings/",
];

function topLevelLayouts(): string[] {
  const out: string[] = [];
  if (existsSync(join(ROOT, "app/layout.tsx"))) out.push("app/layout.tsx");
  for (const name of readdirSync(join(ROOT, "app"))) {
    const rel = `app/${name}/layout.tsx`;
    if (existsSync(join(ROOT, rel))) out.push(rel);
  }
  return out.sort();
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(rel);
  }
  return out;
}

function lightPrefixes(): string[] {
  const src = read("features/public-shell/publicTier.ts");
  const block = /const LIGHT_PREFIXES = \[([\s\S]*?)\];/.exec(src);
  if (!block) throw new Error("publicTier.ts no longer declares LIGHT_PREFIXES; update this guard");
  return [...block[1].matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);
}

describe("root hosts are bound for every route", () => {
  it("app/Providers.tsx mounts the entity-ref host, the settings host and the sharing host", () => {
    const src = read("app/Providers.tsx");
    expect(src).toMatch(/<EntityRefHost \/>/);
    expect(src).toMatch(/<SettingsHost \/>/);
    expect(src).toMatch(/<SharingHost \/>/);
    expect(src).toMatch(/from "@\/features\/data-tables\/records-ui-host\/entityRefHost"/);
    expect(src).toMatch(/from "@\/features\/settings\/doors\/settingsHost"/);
  });

  it("each host module binds at load and exports the mountable component", () => {
    const refs = read("features/data-tables/records-ui-host/entityRefHost.tsx");
    expect(refs).toMatch(/configureEntityRefs\(entityRefHostPorts\)/);
    expect(refs).toMatch(/export function EntityRefHost\(\): null/);
    const settings = read("features/settings/doors/settingsHost.tsx");
    expect(settings).toMatch(/configureSettings\(/);
    expect(settings).toMatch(/export function SettingsHost\(\): null/);
  });

  // app/Providers.tsx is a SERVER component. A local module it mounts as JSX without "use client"
  // is evaluated in the RSC graph: its module-scope binding runs on the server only (never in the
  // browser), and any client-only call it reaches throws there. 2026-10-22: settingsHost.tsx reached
  // lib/toast.ts (createMatrxToast at module scope) and every Providers route answered 500.
  it("every local component app/Providers.tsx mounts is a client module", () => {
    const src = read("app/Providers.tsx");
    const offenders: string[] = [];
    for (const m of src.matchAll(/^import\s+\{([^}]+)\}\s+from\s+"@\/([^"]+)";/gm)) {
      const names = m[1].split(",").map((n) => n.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop() ?? "");
      if (!names.some((n) => /^[A-Z]/.test(n) && new RegExp(`<${n}[\\s/>]`).test(src))) continue;
      const file = [".tsx", ".ts", "/index.tsx", "/index.ts"].map((ext) => `${m[2]}${ext}`).find((rel) => existsSync(join(ROOT, rel)));
      if (!file) continue;
      const body = read(file).replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, "");
      if (!/^["']use client["']/.test(body)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("no chat registration file is the only thing binding them", () => {
    const base = read("providers/chatUiRegistrationBase.ts");
    expect(base).not.toMatch(/^import "@\/features\/(data-tables\/records-ui-host\/entityRefHost|settings\/doors\/settingsHost)"/m);
  });

  it("every top-level route-group layout takes the app Providers, or is a reviewed exception", () => {
    const missing = topLevelLayouts().filter(
      (rel) => !PROVIDERS_FAMILY.test(read(rel)) && !(rel in NO_PROVIDERS_LAYOUTS),
    );
    expect(missing).toEqual([]);
    // A reviewed exception that now takes Providers is stale and must leave the list.
    const stale = Object.keys(NO_PROVIDERS_LAYOUTS).filter((rel) => existsSync(join(ROOT, rel)) && PROVIDERS_FAMILY.test(read(rel)));
    expect(stale).toEqual([]);
  });

  it("no light public route imports the reference or settings packages (it has no host)", () => {
    const offenders: string[] = [];
    for (const prefix of lightPrefixes()) {
      const dir = `app/(public)${prefix}`;
      if (!existsSync(join(ROOT, dir))) continue;
      for (const rel of sourceFiles(dir)) {
        const src = read(rel);
        for (const spec of REFERENCE_PACKAGES) {
          if (src.includes(`"${spec}`)) offenders.push(`${rel} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
