import type { FilesystemAdapter } from "./FilesystemAdapter";
import type { FilesystemNode } from "../types";

/**
 * Adapter that talks to the existing /api/sandbox/[id]/exec endpoint.
 *
 * Directory listings are produced by executing `ls -lA --time-style=...` and
 * parsing the output. File reads are `cat`; writes encode the content into a
 * here-doc. All commands are funneled through the same authenticated route
 * that powers app/(authenticated)/sandbox/[id].
 */
export class SandboxFilesystemAdapter implements FilesystemAdapter {
  readonly id: string;
  readonly label: string;
  readonly rootPath = "/home/agent";
  readonly writable = true;

  constructor(
    /** sandbox_instances.id (the UUID used by the /api/sandbox/[id] route). */
    public readonly instanceId: string,
    label?: string,
  ) {
    this.id = `sandbox:${instanceId}`;
    this.label = label ?? "Sandbox";
  }

  private async exec(command: string): Promise<{
    stdout: string;
    stderr: string;
    exit_code: number;
  }> {
    const resp = await fetch(`/api/sandbox/${this.instanceId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, timeout: 30 }),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => resp.statusText);
      throw new Error(`exec failed (${resp.status}): ${errBody}`);
    }
    return resp.json();
  }

  async listChildren(path: string): Promise<FilesystemNode[]> {
    const escaped = path.replace(/'/g, "'\\''");
    const cmd = `ls -lA --time-style=long-iso '${escaped}' 2>/dev/null | tail -n +2`;
    const { stdout } = await this.exec(cmd);
    if (!stdout.trim()) return [];

    const nodes: FilesystemNode[] = [];
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      // drwxr-xr-x 2 agent agent 4096 2024-01-15 10:30 name
      const parts = line.split(/\s+/);
      if (parts.length < 8) continue;
      const perms = parts[0];
      const sizeStr = parts[4];
      const name = parts.slice(7).join(" ");
      if (!name || name === "." || name === "..") continue;

      const kind: "file" | "directory" = perms.startsWith("d")
        ? "directory"
        : "file";
      const full =
        path === "/" ? `/${name}` : `${path.replace(/\/+$/, "")}/${name}`;
      nodes.push({
        path: full,
        name,
        kind,
        size:
          kind === "file"
            ? Number.parseInt(sizeStr, 10) || undefined
            : undefined,
        modifiedAt: `${parts[5]}T${parts[6]}`,
      });
    }

    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return nodes;
  }

  async readFile(path: string): Promise<string> {
    const escaped = path.replace(/'/g, "'\\''");
    const { stdout, stderr, exit_code } = await this.exec(`cat '${escaped}'`);
    if (exit_code !== 0) {
      throw new Error(stderr || `cat exited ${exit_code}`);
    }
    return stdout;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const escapedPath = path.replace(/'/g, "'\\''");
    // Base64-encode to survive shell quoting of arbitrary binary/text.
    const encoded =
      typeof window === "undefined"
        ? Buffer.from(content, "utf8").toString("base64")
        : btoa(unescape(encodeURIComponent(content)));
    const cmd = `echo '${encoded}' | base64 -d > '${escapedPath}'`;
    const { stderr, exit_code } = await this.exec(cmd);
    if (exit_code !== 0) {
      throw new Error(stderr || `write exited ${exit_code}`);
    }
  }
}
