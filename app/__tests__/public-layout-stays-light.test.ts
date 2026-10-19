// PUBLIC-LAYOUT-PERF (2026-10-19): every marketing page's first load is the (public) layout's static
// client graph. It used to render the whole app Providers tree, the canvas column, the Redux header
// islands and a statically wired Google One Tap: ~3.6 MB compressed of scripts on /privacy-policy.
// Those now load through ONE dynamic edge (features/public-shell/PublicAppRoot.tsx →
// PublicFullProvidersImpl) or after idle (One Tap). This fails if any of them comes back as a static
// import on the light path.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");

/** Specifiers of static `import … from "x"` / `import "x"` statements (type-only imports are erased and allowed). */
function staticImports(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)) if (!m[1]) out.push(m[2]!);
  for (const m of source.matchAll(/^import\s+["']([^"']+)["']/gm)) out.push(m[1]!);
  return out;
}

const APP_TREE = /(app\/Providers|providers\/StoreProvider|ShellCanvasColumn|CanvasHostProvider|@ai-matrx\/canvas\/react|PublicHeaderAuth|PublicHeaderFeedback|PublicHeaderThemeToggle|PublicFullProvidersImpl|PublicHeaderFullIslands|react-redux|lib\/redux\/)/;
const ONE_TAP_MACHINERY = /(clientClaimsCache|fingerprint-service|lib\/toast|googleIdentityId|one-tap\/actions|\.\/actions|landAfterSignIn|oneTapPrompt)$/;

const RULES: Array<{ file: string; banned: RegExp }> = [
  { file: "app/(public)/layout.tsx", banned: APP_TREE },
  { file: "components/matrx/PublicHeader.tsx", banned: APP_TREE },
  { file: "features/public-shell/PublicAppRoot.tsx", banned: APP_TREE },
  { file: "features/public-shell/PublicHeaderIslands.tsx", banned: APP_TREE },
  { file: "features/public-shell/publicTier.ts", banned: APP_TREE },
  { file: "features/auth/one-tap/GoogleOneTap.tsx", banned: ONE_TAP_MACHINERY },
];

describe("the (public) layout's first load stays light", () => {
  it.each(RULES)("$file has no static import of the app tree", ({ file, banned }) => {
    const hits = staticImports(readFileSync(join(ROOT, file), "utf8")).filter((s) => banned.test(s));
    expect(hits).toEqual([]);
  });

  it("the full tree is reached through exactly one dynamic edge", () => {
    const root = readFileSync(join(ROOT, "features/public-shell/PublicAppRoot.tsx"), "utf8");
    expect(root.match(/import\(["']\.\/PublicFullProvidersImpl["']\)/g)).toHaveLength(1);
  });

  it("the check sees a planted static edge", () => {
    expect(staticImports(`import { Providers } from "@/app/Providers";`).filter((s) => APP_TREE.test(s))).toHaveLength(1);
    expect(staticImports(`import { CanvasToggle } from "@ai-matrx/canvas/react";`).filter((s) => APP_TREE.test(s))).toHaveLength(1);
    expect(staticImports(`import { toast } from "@/lib/toast";`).filter((s) => ONE_TAP_MACHINERY.test(s))).toHaveLength(1);
    expect(staticImports(`import type { Policy } from "@/lib/redux/store";`)).toHaveLength(0);
  });
});
