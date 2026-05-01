/**
 * Remark plugin: recognizes `{{variable_name}}` tokens inside markdown text
 * and emits inline `matrx-variable` custom elements so `react-markdown` can
 * render them via the `components` map.
 *
 * Design rules:
 *  - Runs at render time on the mdast AST — the source `content` string is
 *    never modified. Redis/Redux/DB copies of the message are untouched.
 *  - Only transforms `text` nodes. `inlineCode`, `code` blocks, `link`, etc.
 *    are left alone, so `` `{{literal}}` `` and ```` ```js\n{{foo}}\n``` ````
 *    stay as plain text. Inside links/headings/emphasis the pattern still
 *    applies because those wrap `text` children.
 *  - Pattern requires a closed `}}`. Partial tokens during streaming (e.g.
 *    `{{user_na`) stay plain text until the closing braces arrive.
 *  - Emits a custom element `matrx-variable` with `data-name="..."` so the
 *    renderer can look up the raw snake_case key.
 *
 * Pattern: `{{identifier}}` where identifier starts with a letter or underscore,
 *          followed by letters, digits, underscores, or dots.
 */

const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build the replacement nodes for a text node whose `value` contains one or
 * more variable tokens. Returns the original node wrapped in an array if no
 * match was found — caller can detect "no-op" via `parts.length === 1`.
 */
function expandTextNode(value: string): MdastNode[] {
  VARIABLE_PATTERN.lastIndex = 0;
  const parts: MdastNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let matched = false;

  while ((match = VARIABLE_PATTERN.exec(value)) !== null) {
    matched = true;
    const start = match.index;
    const end = start + match[0].length;
    const name = match[1];

    if (start > lastIdx) {
      parts.push({ type: "text", value: value.slice(lastIdx, start) });
    }

    parts.push({
      type: "matrxVariable",
      data: {
        hName: "matrx-variable",
        hProperties: { "data-name": name },
      },
    });

    lastIdx = end;
  }

  if (!matched) {
    return [{ type: "text", value }];
  }

  if (lastIdx < value.length) {
    parts.push({ type: "text", value: value.slice(lastIdx) });
  }

  return parts;
}

/**
 * Walk the tree and rewrite `text` nodes in place. We avoid `unist-util-visit`
 * to keep the dep surface minimal — this plugin is small and the traversal is
 * straightforward.
 *
 * Skipped node types: `code`, `inlineCode`, `html`, `yaml`, `toml`, `math`,
 * `inlineMath` — their text content is not meant to be interpreted.
 */
const SKIP_TYPES = new Set([
  "code",
  "inlineCode",
  "html",
  "yaml",
  "toml",
  "math",
  "inlineMath",
]);

function walk(node: MdastNode): void {
  if (!node || SKIP_TYPES.has(node.type)) return;
  const children = node.children;
  if (!Array.isArray(children) || children.length === 0) return;

  const next: MdastNode[] = [];
  let mutated = false;

  for (const child of children) {
    if (
      child?.type === "text" &&
      typeof child.value === "string" &&
      child.value.includes("{{")
    ) {
      const expanded = expandTextNode(child.value);
      if (expanded.length !== 1 || expanded[0].type !== "text") {
        mutated = true;
      }
      next.push(...expanded);
    } else {
      next.push(child);
      walk(child);
    }
  }

  if (mutated) {
    node.children = next;
  }
}

export default function remarkMatrxVariable() {
  return (tree: MdastNode) => {
    walk(tree);
  };
}
