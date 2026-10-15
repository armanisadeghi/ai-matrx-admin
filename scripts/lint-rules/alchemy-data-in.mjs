/**
 * matrx/alchemy-data-in — ALCHEMY TAKES DATA, NOT HAND-BUILT STRINGS (Arman, 2026-10-14).
 *
 * The Alchemy button derives Raw · Markdown · Formatted · For AI from the content itself. A caller
 * hands it `data={…}` (+ `dataType`); the old `human` / `json` / `agent` props were per-page summaries
 * that decided what a click copied and were usually thin. This flags every Alchemy host element that
 * still passes them without `data`. Error in the editor so the agent who touches the line converts it;
 * lint-guard holds only the lines a change touches, never a release.
 * Self-test: node --test scripts/lint-rules/alchemy-data-in.selftest.mjs
 */
export const ALCHEMY_HOSTS = new Set(["MatrxCopyMenu", "CopyButtons", "AiCopyMenu", "AlchemyMenu", "DeferredCopyButtons"]);
const HAND_BUILT = new Set(["human", "json", "agent"]);
export const DATA_IN_FIX =
  "Hand Alchemy the content itself: `data={record | rows | text}` with `dataType=\"Agent\"`. Alchemy derives Raw · Markdown · Formatted · For AI; `human` / `json` / `agent` strings are the retired hand-built path.";

function elementName(node) {
  const name = node.name;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return name.property.name;
  return "";
}

export const alchemyDataIn = {
  meta: {
    type: "suggestion",
    docs: { description: "Alchemy hosts take `data`, not hand-built human/json/agent strings." },
    schema: [],
    messages: { handBuilt: `<{{name}} {{props}}> — ${DATA_IN_FIX}` },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";
    if (/\.(test|spec)\.[jt]sx?$|__tests__/.test(filename)) return {};
    return {
      JSXOpeningElement(node) {
        const name = elementName(node);
        if (!ALCHEMY_HOSTS.has(name)) return;
        const attrs = node.attributes.filter((a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier").map((a) => a.name.name);
        if (attrs.includes("data")) return;
        const handBuilt = attrs.filter((a) => HAND_BUILT.has(a));
        if (handBuilt.length) context.report({ node, messageId: "handBuilt", data: { name, props: handBuilt.join(" / ") } });
      },
    };
  },
};
