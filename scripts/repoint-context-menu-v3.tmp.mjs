// One-off codemod: @/features/context-menu-v3/* → @ai-matrx/context-menu/{react,engine,model,menu-content}.
// Deleted after the cutover lands.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REACT = new Set(["NonEditableContextMenu", "EditableContextMenu", "ContextMenuV3", "PageSurfaceMenu", "menu-presence",
  "regroup/RegroupContext", "item/ItemMenuHostBinding", "item/ItemContextMenuV3", "components/OpenSurfaceMenuButton"]);
const MODEL = new Set(["model/menu-model", "alchemy-provider", "value-resolution", "utils/editor-text-agent",
  "utils/selection-write-back", "utils/insert-into-editor", "hooks/useContextMenuActions", "hooks/useUnifiedAgentContextMenu"]);
const MENU_CONTENT = new Set(["components/AlchemyMenuContent", "components/ShortcutKeyRunner"]);

function target(sub) {
  sub = sub.replace(/\.(tsx?|jsx?)$/, "").replace(/\/index$/, "");
  if (sub === "" ) return "@ai-matrx/context-menu/react";
  if (REACT.has(sub)) return "@ai-matrx/context-menu/react";
  if (MODEL.has(sub)) return "@ai-matrx/context-menu/model";
  if (MENU_CONTENT.has(sub)) return "@ai-matrx/context-menu/menu-content";
  return "@ai-matrx/context-menu/engine";
}

const files = execFileSync("git", ["grep", "-l", "@/features/context-menu-v3", "--", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs",
  ":!features/context-menu-v3/**"], { encoding: "utf8" }).split("\n").filter(Boolean)
  .filter((f) => !f.startsWith("scripts/repoint-context-menu-v3"));
const changed = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const out = src.replace(/(["'])@\/features\/context-menu-v3(?:\/([^"'\n]*))?\1/g, (_m, q, sub) => `${q}${target(sub ?? "")}${q}`);
  if (out !== src) { writeFileSync(f, out); changed.push(f); }
}
writeFileSync(process.argv[2] ?? "/dev/stdout", changed.join("\n") + "\n");
console.error(`repointed ${changed.length} files`);
