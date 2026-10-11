import { build } from "esbuild";
const [entry] = process.argv.slice(2);
const r = await build({ entryPoints: [entry], bundle: true, write: false, metafile: true, format: "esm", platform: "browser", jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "ext", setup(b) { b.onResolve({ filter: /^[^./]/ }, (a) => ({ path: a.path, external: true })); } }] });
const ins = Object.keys(r.metafile.inputs).filter(f=>!f.includes("node_modules")).sort();
const ext = new Set(); for (const o of Object.values(r.metafile.outputs)) for (const i of o.imports) if (i.external) ext.add(i.path);
console.log("LOCAL", ins.length); for (const f of ins) console.log("  " + f);
console.log("EXTERNAL", ext.size); for (const e of [...ext].sort()) console.log("  " + e);
