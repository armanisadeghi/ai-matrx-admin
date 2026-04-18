/**
 * lucide-react namespaced exports: icons are ForwardRef/Memo objects in current builds,
 * not plain functions. Only createLucideIcon and default are non-icon exports we skip.
 */
const LUCIDE_NAMESPACE_DENYLIST = new Set(["default", "createLucideIcon"]);

/**
 * True if `exported` is the value of a Lucide icon entry for `name` in `import * as Lucide`.
 * Does not mean the icon exists in our static IconResolver map — only that the lucide-react
 * module exposes this name as a renderable component type.
 */
export function isLucideModuleIconExport(
  name: string,
  exported: unknown,
): boolean {
  if (!name || LUCIDE_NAMESPACE_DENYLIST.has(name)) return false;
  if (exported == null) return false;
  if (typeof exported === "function") return true;
  if (typeof exported === "object" && "$$typeof" in (exported as object)) {
    return true;
  }
  return false;
}
