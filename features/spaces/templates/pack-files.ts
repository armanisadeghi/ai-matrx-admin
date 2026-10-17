// features/spaces/templates/pack-files.ts — reading pack files from disk (Node only: the check and publish
// commands). Packs live in features/spaces/templates/packs/<slug>.pack.json, one template per file.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import type { AgentSnapshotRow } from "@ai-matrx/records/templates";

export const PACKS_DIR = resolve(process.cwd(), "features/spaces/templates/packs");

/** Every `*.pack.json` under the given files and directories (default: the packs folder). */
export function packFilesIn(args: string[]): string[] {
  const roots = args.length ? args.map((a) => resolve(process.cwd(), a)) : [PACKS_DIR];
  const out: string[] = [];
  const walk = (p: string) => {
    if (!existsSync(p)) throw new Error(`${relative(process.cwd(), p) || p}: no such file or folder.`);
    if (statSync(p).isDirectory()) for (const name of readdirSync(p).sort()) walk(join(p, name));
    else if (p.endsWith(".pack.json")) out.push(p);
  };
  for (const r of roots) {
    if (!statSync(r).isDirectory() && !r.endsWith(".pack.json")) throw new Error(`${relative(process.cwd(), r)}: a pack file is named <slug>.pack.json.`);
    walk(r);
  }
  return out;
}

export function readPack(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${relative(process.cwd(), file)} is not valid JSON: ${(error as Error).message}`);
  }
}

/** The platform agents a spec may copy: aidream's snapshot when the sibling checkout is here, else the one every template uses. */
export function agentSnapshot(): AgentSnapshotRow[] {
  const file = resolve(process.cwd(), "../aidream/apps/shared/records/templates/AGENTS.snapshot.json");
  if (existsSync(file)) return (JSON.parse(readFileSync(file, "utf8")) as { agents: AgentSnapshotRow[] }).agents;
  return [{ id: "4cd676c6-f55d-4426-b7eb-a9d0273566ec", name: "Answers From Your Tables", variables: ["primary_table", "related_tables"] }];
}
