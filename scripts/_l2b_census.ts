import { resolve } from "node:path";
async function main() {
  const mod: any = await import(resolve(__dirname, "..", "features/surfaces/manifests/registry"));
  const out: any[] = [];
  for (const m of mod.ALL_MANIFESTS) {
    const total = (m.values ?? []).reduce((s: number, v: any) => s + (typeof v.inlineUpTo === "number" ? v.inlineUpTo : 0), 0);
    for (const v of m.values ?? []) {
      out.push({ s: m.surfaceName, n: v.name, t: v.valueType, c: v.typicalCharCount ?? null, i: v.inlineUpTo ?? null, a: v.autoContext ?? null, total, g: v.group ?? null, inh: m.inheritsFrom ?? null, appr: !!m.contextBudgetApproval });
    }
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}
main();
