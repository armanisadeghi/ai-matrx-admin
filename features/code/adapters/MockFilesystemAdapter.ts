import type { FilesystemAdapter } from "./FilesystemAdapter";
import type { FilesystemNode } from "../types";

interface MockNode {
  kind: "file" | "directory";
  content?: string;
}

/** A realistic-ish Next.js-style project tree used by the default route. */
const MOCK_PROJECT: Record<string, MockNode> = {
  "/": { kind: "directory" },
  "/README.md": {
    kind: "file",
    content: `# matrx-code demo project\n\nThis is a **mock** project loaded by the MockFilesystemAdapter. Swap the\nworkspace's adapter to a SandboxFilesystemAdapter (via the Sandboxes view)\nto edit real files in a live container.\n`,
  },
  "/package.json": {
    kind: "file",
    content: JSON.stringify(
      {
        name: "matrx-code-demo",
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: {
          next: "latest",
          react: "latest",
          "react-dom": "latest",
        },
      },
      null,
      2,
    ),
  },
  "/tsconfig.json": {
    kind: "file",
    content: JSON.stringify(
      { compilerOptions: { target: "ES2020", strict: true, jsx: "preserve" } },
      null,
      2,
    ),
  },
  "/.gitignore": {
    kind: "file",
    content: "node_modules\n.next\n.env*.local\ndist\n",
  },
  "/src": { kind: "directory" },
  "/src/index.ts": {
    kind: "file",
    content: `export function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("world"));\n`,
  },
  "/src/App.tsx": {
    kind: "file",
    content: `import React from "react";\n\nexport function App() {\n  return (\n    <div className="p-6">\n      <h1 className="text-2xl font-semibold">Hello from Matrx Code</h1>\n      <p className="text-sm text-muted-foreground">\n        Edit me in the editor \u2014 this is a mock adapter.\n      </p>\n    </div>\n  );\n}\n`,
  },
  "/src/styles.css": {
    kind: "file",
    content: `:root {\n  --accent: #3b82f6;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n}\n`,
  },
  "/src/lib": { kind: "directory" },
  "/src/lib/utils.ts": {
    kind: "file",
    content: `export function cn(...parts: Array<string | undefined | null | false>): string {\n  return parts.filter(Boolean).join(" ");\n}\n`,
  },
  "/src/components": { kind: "directory" },
  "/src/components/Button.tsx": {
    kind: "file",
    content: `import React from "react";\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: "primary" | "ghost";\n}\n\nexport function Button({ variant = "primary", className, ...rest }: ButtonProps) {\n  return <button className={className} {...rest} />;\n}\n`,
  },
  "/public": { kind: "directory" },
  "/public/robots.txt": {
    kind: "file",
    content: "User-agent: *\nAllow: /\n",
  },
};

function basename(path: string): string {
  if (path === "/") return "/";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function parentOf(path: string): string {
  if (path === "/") return "/";
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return "/";
  return trimmed.slice(0, idx);
}

export class MockFilesystemAdapter implements FilesystemAdapter {
  readonly id = "mock";
  readonly label = "Mock Project";
  readonly rootPath = "/";
  readonly writable = true;

  private readonly data: Record<string, MockNode>;

  constructor(overrides?: Record<string, MockNode>) {
    this.data = { ...MOCK_PROJECT, ...(overrides ?? {}) };
  }

  async listChildren(path: string): Promise<FilesystemNode[]> {
    const normalized = path === "" ? "/" : path;
    const nodes: FilesystemNode[] = [];
    for (const [p, node] of Object.entries(this.data)) {
      if (p === normalized) continue;
      if (parentOf(p) !== normalized) continue;
      nodes.push({
        path: p,
        name: basename(p),
        kind: node.kind,
        size: node.content ? node.content.length : undefined,
      });
    }
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return nodes;
  }

  async readFile(path: string): Promise<string> {
    const node = this.data[path];
    if (!node) throw new Error(`File not found: ${path}`);
    if (node.kind !== "file") throw new Error(`Not a file: ${path}`);
    return node.content ?? "";
  }

  async writeFile(path: string, content: string): Promise<void> {
    const node = this.data[path];
    if (node && node.kind === "directory") {
      throw new Error(`Cannot write to a directory: ${path}`);
    }
    this.data[path] = { kind: "file", content };
  }
}
