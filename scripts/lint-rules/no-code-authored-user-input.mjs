/**
 * matrx/no-code-authored-user-input — THE PERSON'S MESSAGE IS THE PERSON'S WORDS (Arman, 2026-10-17).
 *
 * `user_input` (and every other door into the user's turn) carries only what a human typed,
 * dictated or said — verbatim. Code never writes text into it: no "Suggest at most 3 search
 * keywords.", no appended rules, no wrapping the person's words in instructions. How an agent
 * behaves belongs to the agent, its mandate and its binding; values reach it as named variables
 * or context. The incident: commit 2edb1c8aa65 appended a hardcoded keyword-cap sentence to the
 * research suggester's user message, overriding the agent behind everyone's back.
 *
 * The rule follows a value into a sink back through local `const`/`let` initializers and
 * reassignments (same file), `+`, template literals, ternaries, `||`/`??`, arrays and method
 * chains (`[a, b].join("\n")`), and fails on ANY string literal or template text that contains a
 * letter. Separators without letters ("\n\n", ", ") and empty strings are fine.
 *
 * Sinks: object keys / assignments named user_input, userInput, userInputText, userContent,
 * user_content; calls to setUserInputText / setUserInput / sendUserMessage;
 * `{ role: "user", content: … }`. (`userMessage` is this codebase's name for error text shown TO
 * the person, so it is not a sink.)
 *
 * Never an eslint-disable: if a door really is not the person's turn, rename it to what it is.
 * Self-test: node --test scripts/lint-rules/no-code-authored-user-input.selftest.mjs
 * Law: common-docs/systems/agents/agent-variable-binding/FEATURE.md § The user-input law.
 */

export const USER_INPUT_KEYS = new Set([
  "user_input",
  "userInput",
  "userInputText",
  "userContent",
  "user_content",
]);
export const USER_INPUT_SETTERS = new Set(["setUserInputText", "setUserInput", "sendUserMessage"]);

export const FIX =
  "The person's turn carries only their own words, verbatim. Remove the code-written text. Agent behavior belongs to the agent / mandate / binding; values go as named `variables` or context — never prose in the user message. Law: common-docs/systems/agents/agent-variable-binding/FEATURE.md § The user-input law.";

const LETTER = /\p{L}/u;

function keyName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return null;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return null;
}

/** Return-statement arguments of a function body, not descending into nested functions. */
function returnsOf(block) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "ReturnStatement") { if (n.argument) out.push(n.argument); return; }
    if (/Function/.test(n.type)) return;
    for (const k of Object.keys(n)) {
      if (k === "parent") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v.type === "string") walk(v);
    }
  };
  block.body.forEach(walk);
  return out;
}

/** Returns the first code-authored literal node (with a letter) that flows into `node`, or null. */
function findAuthoredText(node, scopeManager, scope, seen) {
  if (!node || seen.has(node)) return null;
  seen.add(node);
  const recur = (n) => findAuthoredText(n, scopeManager, scope, seen);
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" && LETTER.test(node.value) ? node : null;
    case "TemplateLiteral":
      for (const q of node.quasis) if (LETTER.test(q.value.cooked ?? q.value.raw)) return node;
      for (const e of node.expressions) {
        const hit = recur(e);
        if (hit) return hit;
      }
      return null;
    case "BinaryExpression":
      return node.operator === "+" ? recur(node.left) || recur(node.right) : null;
    case "LogicalExpression":
      return recur(node.left) || recur(node.right);
    case "ConditionalExpression":
      return recur(node.consequent) || recur(node.alternate);
    case "ArrayExpression":
      for (const el of node.elements) {
        const hit = el && recur(el.type === "SpreadElement" ? el.argument : el);
        if (hit) return hit;
      }
      return null;
    case "TSAsExpression":
    case "TSNonNullExpression":
    case "TSSatisfiesExpression":
    case "ParenthesizedExpression":
      return recur(node.expression);
    case "AwaitExpression":
      return recur(node.argument);
    case "CallExpression": {
      // A same-file helper that builds the text: follow its return values.
      if (node.callee.type === "Identifier") {
        const fn = findVariable(scope, node.callee.name)?.defs.find(
          (d) => d.type === "FunctionName" || (d.type === "Variable" && /FunctionExpression$/.test(d.node.init?.type ?? "")),
        );
        const body = fn && (fn.type === "FunctionName" ? fn.node : fn.node.init);
        if (body) {
          const fnScope = scopeManager.acquire(body) ?? scope;
          if (body.body.type !== "BlockStatement") return findAuthoredText(body.body, scopeManager, fnScope, seen);
          for (const ret of returnsOf(body.body)) {
            const hit = findAuthoredText(ret, scopeManager, fnScope, seen);
            if (hit) return hit;
          }
        }
        return null;
      }
      // Method chains on a value: `[a, rule].filter(Boolean).join("\n")`, `x.trim()`, `a.concat(b)`.
      if (node.callee.type === "MemberExpression") {
        const hit = recur(node.callee.object);
        if (hit) return hit;
        for (const a of node.arguments) {
          if (a.type === "Literal" || a.type === "TemplateLiteral" || a.type === "Identifier") {
            const h = recur(a);
            if (h) return h;
          }
        }
      }
      return null;
    }
    case "Identifier": {
      const variable = findVariable(scope, node.name);
      if (!variable) return null;
      for (const def of variable.defs) {
        if (def.type === "Variable" && def.node.init) {
          const hit = findAuthoredText(def.node.init, scopeManager, scopeManager.acquire(def.node, true) ?? scope, seen);
          if (hit) return hit;
        }
      }
      for (const ref of variable.references) {
        if (ref.writeExpr && ref.isWrite()) {
          const hit = recur(ref.writeExpr);
          if (hit) return hit;
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export const noCodeAuthoredUserInput = {
  meta: {
    type: "problem",
    docs: { description: "The user's message carries only the person's own words — never code-written text." },
    schema: [],
    messages: {
      authored: `Code-written text {{text}} flows into {{sink}}. ${FIX}`,
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";
    if (/\.(test|spec|selftest)\.[mc]?[jt]sx?$|__tests__|\/app\/\(dev\)\/|\/fixtures\//.test(filename)) return {};
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const scopeManager = sourceCode.scopeManager;

    const check = (valueNode, sink, at) => {
      const scope = sourceCode.getScope ? sourceCode.getScope(at) : context.getScope();
      const hit = findAuthoredText(valueNode, scopeManager, scope, new Set());
      if (!hit) return;
      const raw = sourceCode.getText(hit);
      const text = raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
      context.report({ node: hit === valueNode ? valueNode : at, messageId: "authored", data: { text, sink } });
    };

    return {
      Property(node) {
        const k = keyName(node.key);
        if (k && USER_INPUT_KEYS.has(k) && node.value && node.parent?.type === "ObjectExpression") {
          check(node.value, k, node);
        }
        // { role: "user", content: … }
        if (k === "content" && node.parent?.type === "ObjectExpression") {
          const isUser = node.parent.properties.some(
            (p) => p.type === "Property" && keyName(p.key) === "role" && p.value.type === "Literal" && p.value.value === "user",
          );
          if (isUser) check(node.value, 'a { role: "user" } message', node);
        }
      },
      AssignmentExpression(node) {
        const t = node.left;
        const k = t.type === "MemberExpression" ? keyName(t.computed ? t.property : t.property) : t.type === "Identifier" ? null : null;
        if (k && USER_INPUT_KEYS.has(k)) check(node.right, k, node);
      },
      CallExpression(node) {
        const c = node.callee;
        const name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" ? keyName(c.property) : null;
        if (name && USER_INPUT_SETTERS.has(name) && node.arguments[0]) check(node.arguments[0], `${name}()`, node);
      },
    };
  },
};
