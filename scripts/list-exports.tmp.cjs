const ts = require("typescript");
const path = require("path");
const mods = process.argv.slice(2);
const host = ts.createCompilerHost({});
const tmp = path.join(process.cwd(), "scripts/__exports_probe.tmp.ts");
require("fs").writeFileSync(tmp, mods.map((m, i) => `import * as m${i} from "${m}";`).join("\n") + "\nexport {};\n");
const prog = ts.createProgram([tmp], { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, skipLibCheck: true, noEmit: true, strict: true });
const checker = prog.getTypeChecker();
const sf = prog.getSourceFile(tmp);
const out = {};
sf.statements.forEach((st, i) => {
  if (!ts.isImportDeclaration(st)) return;
  const sym = checker.getSymbolAtLocation(st.moduleSpecifier);
  if (!sym) { out[mods[i]] = null; return; }
  const values = [], types = [];
  for (const e of checker.getExportsOfModule(sym)) {
    const t = e.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(e) : e;
    if (t.flags & ts.SymbolFlags.Value) values.push(e.name); else types.push(e.name);
  }
  out[mods[i]] = { values: values.sort(), types: types.sort() };
});
require("fs").rmSync(tmp);
console.log(JSON.stringify(out, null, 1));
