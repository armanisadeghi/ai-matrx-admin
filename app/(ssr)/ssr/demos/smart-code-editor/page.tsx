"use client";

/**
 * Smart Code Editor demo.
 *
 * Wires up the new agent-based code editor against the real agent UUIDs
 * that replicate the legacy prompt builtins. Variable mapping is manual
 * here because the production mapping normally comes from a Shortcut's
 * `scopeMappings`. This page is the exception that proves the rule —
 * ordinary callers should rely on shortcuts.
 *
 * Agents wired:
 *   - Code Editor                    (var: current_code)
 *   - Code Editor (Dynamic Context)  (var: dynamic_context)
 *   - Prompt App Code Editor         (var: current_code)
 *
 * The other two UUIDs the user shared (Tools Result Component Generator,
 * Prompt UI Builder) need more specialized variables (sample streams,
 * schemas, etc.) that don't fit the Smart Code Editor's shape — those are
 * better served by dedicated surfaces.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code2, Sparkles } from "lucide-react";
import { SmartCodeEditorModal } from "@/features/code-editor/agent-code-editor";

// ── Agent registry (demo-only) ──────────────────────────────────────────────
//
// These IDs are near-exact replicas of the legacy prompt builtins, ported to
// the agent system. Variable names are what the AGENT declares — the demo
// maps code/context → that name at launch time.

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  /**
   * Given the demo's `{code, context}` inputs, return the variable payload
   * the agent expects. Kept tiny here so swapping agents is trivial.
   */
  buildVariables: (inputs: { code: string; context: string }) => Record<string, unknown>;
}

const AGENTS: AgentConfig[] = [
  {
    id: "55cc4ad1-bafd-4b82-af0b-4b4f40406ca3",
    name: "Code Editor",
    description: "Default code editor agent. Receives the current code as `current_code`.",
    buildVariables: ({ code }) => ({ current_code: code }),
  },
  {
    id: "eede051c-d450-4f01-a6de-b282a7ebb581",
    name: "Code Editor (Dynamic Context)",
    description:
      "Takes a single `dynamic_context` blob. Combines code + surrounding context so the agent sees everything in one variable.",
    buildVariables: ({ code, context }) => ({
      dynamic_context: context
        ? `### Code\n\`\`\`\n${code}\n\`\`\`\n\n### Additional Context\n${context}`
        : `### Code\n\`\`\`\n${code}\n\`\`\``,
    }),
  },
  {
    id: "f6649577-aa9e-4b81-afef-47f11a6bef1b",
    name: "Prompt App Code Editor",
    description:
      "Tuned for prompt-app component source. Variable: `current_code`.",
    buildVariables: ({ code }) => ({ current_code: code }),
  },
];

const LANGUAGES = ["typescript", "javascript", "tsx", "jsx", "python", "go", "rust", "html", "css", "sql"];

// ── Starter snippets (so the demo is immediately fireable) ──────────────────

const STARTER_SNIPPETS: Record<string, string> = {
  typescript: `// Refactor this fetch wrapper to have proper error handling and types.
async function getUser(id) {
  const res = await fetch("/api/users/" + id);
  const json = await res.json();
  console.log(json);
  return json;
}

getUser("abc");
`,
  python: `def process(items):
    results = []
    for i in range(0, len(items)):
        if items[i] is not None:
            results.append(items[i].strip().lower())
    return results

data = ["Hello", None, "World ", " Foo"]
print(process(data))
`,
};

// ── Demo card ───────────────────────────────────────────────────────────────

function AgentDemoCard({
  agent,
  code,
  language,
  context,
  onCodeChange,
}: {
  agent: AgentConfig;
  code: string;
  language: string;
  context: string;
  onCodeChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const variables = agent.buildVariables({ code, context });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Code2 className="w-4 h-4 text-muted-foreground" />
          <span className="truncate">{agent.name}</span>
          <Badge variant="secondary" className="text-[9px] h-4 font-mono">
            {agent.id.slice(0, 8)}
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {agent.description}
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <div className="rounded border border-border bg-muted/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Variable Mapping
          </p>
          <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all">
            {Object.entries(variables).map(([k, v]) => {
              const preview =
                typeof v === "string"
                  ? v.length > 80
                    ? `${v.slice(0, 80)}…`
                    : v
                  : JSON.stringify(v);
              return `${k}: ${JSON.stringify(preview)}\n`;
            })}
          </pre>
        </div>
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          className="mt-auto gap-1.5"
          disabled={!code.trim()}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Run {agent.name}
        </Button>
      </CardContent>

      <SmartCodeEditorModal
        open={open}
        onOpenChange={setOpen}
        currentCode={code}
        language={language}
        agentId={agent.id}
        onCodeChange={onCodeChange}
        variables={variables}
        title={agent.name}
      />
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SmartCodeEditorDemoPage() {
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState(STARTER_SNIPPETS.typescript);
  const [context, setContext] = useState("");

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (STARTER_SNIPPETS[lang] && !code.trim()) {
      setCode(STARTER_SNIPPETS[lang]);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          Smart Code Editor — Agent System
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Demo of{" "}
          <code className="text-[11px] bg-muted px-1 rounded">
            SmartCodeEditorModal
          </code>{" "}
          wired against real agent UUIDs. Edit the code + context below, pick
          an agent, and watch the new{" "}
          <code className="text-[11px] bg-muted px-1 rounded">
            vsc_*
          </code>{" "}
          context flow + widget-tool channel in action.
        </p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          Note: variable mapping is hard-coded here because production flows
          use Shortcut <code className="font-mono">scopeMappings</code>. The
          Smart Code Editor itself is agent-agnostic.
        </p>
      </div>

      <Separator />

      {/* Editor inputs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Input</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            The code and context below are what every agent sees. The left
            column feeds <code className="font-mono">current_code</code> or{" "}
            <code className="font-mono">dynamic_context</code>; the right
            column feeds the context blob for agents that want it.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Language:</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Code</Label>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-xs h-[300px] resize-none"
                placeholder="Paste code here…"
              />
              <p className="text-[10px] text-muted-foreground">
                {code.length} chars · {code.split("\n").length} lines
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Additional Context{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="font-mono text-xs h-[300px] resize-none"
                placeholder={`Free-form notes for the agent. Only the "Dynamic Context" agent consumes this — others ignore it.\n\nExample:\n- Target runtime: Node 20+\n- Must preserve existing function signatures\n- Prefer async/await over .then`}
              />
              <p className="text-[10px] text-muted-foreground">
                {context.length} chars
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Agents */}
      <section className="space-y-4">
        <h2 className="text-sm md:text-base font-semibold">Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((agent) => (
            <AgentDemoCard
              key={agent.id}
              agent={agent}
              code={code}
              language={language}
              context={context}
              onCodeChange={setCode}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* What to watch */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What to watch in DevTools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>
            1. <strong>Network tab</strong> → first request body should include
            the variable mapping under{" "}
            <code className="font-mono bg-muted px-1 rounded">variables</code>{" "}
            and IDE context under{" "}
            <code className="font-mono bg-muted px-1 rounded">context</code>.
          </p>
          <p>
            2. <strong>Stream response</strong> → look for{" "}
            <code className="font-mono bg-muted px-1 rounded">
              {`tool_event { event: "tool_delegated", tool_name: "widget_text_patch" }`}
            </code>{" "}
            as the agent runs — these mutate the editor directly via the
            widget handle channel.
          </p>
          <p>
            3. <strong>Redux DevTools</strong> →{" "}
            <code className="font-mono bg-muted px-1 rounded">
              launchAgentExecution
            </code>{" "}
            at modal open,{" "}
            <code className="font-mono bg-muted px-1 rounded">
              destroyInstance
            </code>{" "}
            at close. Instance state cleanup should be complete.
          </p>
          <p>
            4. If the agent outputs SEARCH/REPLACE blocks in its response
            (legacy fallback), the review stage appears and you get Apply /
            Discard buttons instead of auto-apply.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
