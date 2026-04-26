import type { MonacoEnvironmentDescriptor } from "../types";

const FS_PREFIX = "fs:";

const NODE_AMBIENT = `
declare module "node:fs" {
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string | Uint8Array): void;
  export function existsSync(path: string): boolean;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
  export function extname(p: string): string;
  export const sep: string;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  argv: string[];
};

declare const __dirname: string;
declare const __filename: string;
`;

const SHOULD_INCLUDE_NODE_AMBIENT = (path: string) => {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs")
  );
};

/**
 * Sandbox filesystem environment — no DOM, no React. We add a small
 * Node-flavoured ambient surface (fs, path, process, __dirname) only
 * when the file extension warrants it, so the user editing arbitrary
 * scripts in a sandbox sees plausible completions without fabricating
 * a fake browser runtime.
 *
 * Tab id pattern: `fs:<adapterId>:<absPath>`.
 */
export const SANDBOX_FS_ENVIRONMENT: MonacoEnvironmentDescriptor = {
  id: "sandbox-fs",
  label: "Sandbox FS",
  description: "Node-flavoured ambient typings for sandbox/Mock FS files.",
  applies: (tab) =>
    tab.id.startsWith(FS_PREFIX) && SHOULD_INCLUDE_NODE_AMBIENT(tab.path),
  compilerOptions: {
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
  },
  diagnosticsOptions: {
    // Sandbox files often live inside someone else's repo where we have
    // no idea what tsconfig/typeRoots are correct; keep semantic errors
    // off by default so the editor doesn't scream.
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  },
  libs: async () => [
    {
      filePath: "file:///node_modules/@types/sandbox-fs/node/index.d.ts",
      content: NODE_AMBIENT,
    },
  ],
};
