"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartCodeEditorModal } from "@/features/code-editor/agent-code-editor";
import { TYPESCRIPT_SNIPPET, ADDITIONAL_CONTEXT_SNIPPET } from "./snippets";

// ── Agents ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  id: string;
  name: string;
  buildVariables: (inputs: {
    code: string;
    context: string;
  }) => Record<string, unknown>;
}

const AGENTS: AgentConfig[] = [
  {
    id: "55cc4ad1-bafd-4b82-af0b-4b4f40406ca3",
    name: "Code Editor",
    buildVariables: ({ code }) => ({ current_code: code }),
  },
  {
    id: "eede051c-d450-4f01-a6de-b282a7ebb581",
    name: "Code Editor (Dynamic Context)",
    // Per spec: dynamic_context is the code, just under a different variable name.
    // No prompt-engineering, no wrapping. Raw.
    buildVariables: ({ code }) => ({ dynamic_context: code }),
  },
  {
    id: "f6649577-aa9e-4b81-afef-47f11a6bef1b",
    name: "Prompt App Code Editor",
    buildVariables: ({ code }) => ({ current_code: code }),
  },
];

const LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "python",
  "go",
  "rust",
  "html",
  "css",
  "sql",
];

// ── Mock defaults (so the model has something realistic to see) ──────────────

const DEFAULT_FILE_PATH =
  "/Users/armanisadeghi/code/matrx-admin/features/agents/components/builder/AgentBuilderRightPanel.tsx";
const DEFAULT_WORKSPACE_NAME = "matrx-admin";
const DEFAULT_WORKSPACE_FOLDERS = [
  "/Users/armanisadeghi/code/matrx-admin",
  "/Users/armanisadeghi/code/matrx-admin/features/agents",
  "/Users/armanisadeghi/code/matrx-admin/features/code-editor",
].join("\n");
const DEFAULT_GIT_BRANCH = "main";
const DEFAULT_GIT_STATUS = "On branch main\nnothing to commit, working tree clean";
const DEFAULT_DIAGNOSTICS = "No errors or warnings";
const DEFAULT_SELECTION = "";
const DEFAULT_AGENT_SKILLS =
  "file_read, file_write, shell_exec, code_search, web_search";

// ── Demo card (one per agent) ────────────────────────────────────────────────

interface SharedContext {
  code: string;
  language: string;
  filePath: string;
  selection: string;
  diagnostics: string;
  workspaceName: string;
  workspaceFolders: string;
  gitBranch: string;
  gitStatus: string;
  agentSkills: string;
}

function AgentDemoCard({
  agent,
  context,
  onCodeChange,
}: {
  agent: AgentConfig;
  context: SharedContext;
  onCodeChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const variables = agent.buildVariables({
    code: context.code,
    context: "", // not used — dynamic_context = code-only per spec
  });

  const varPreview = Object.entries(variables).map(([k, v]) => {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return `${k}: ${s.length > 60 ? s.slice(0, 60) + "…" : s}`;
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="truncate">{agent.name}</span>
          <Badge variant="secondary" className="text-[9px] h-4 font-mono">
            {agent.id.slice(0, 8)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded p-1.5 leading-tight">
          {varPreview.join("\n")}
        </pre>
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          className="mt-auto"
          disabled={!context.code.trim()}
        >
          Run
        </Button>
      </CardContent>

      <SmartCodeEditorModal
        open={open}
        onOpenChange={setOpen}
        currentCode={context.code}
        language={context.language}
        agentId={agent.id}
        onCodeChange={onCodeChange}
        variables={variables}
        filePath={context.filePath || undefined}
        selection={context.selection || undefined}
        diagnostics={context.diagnostics || undefined}
        workspaceName={context.workspaceName || undefined}
        workspaceFolders={context.workspaceFolders || undefined}
        gitBranch={context.gitBranch || undefined}
        gitStatus={context.gitStatus || undefined}
        agentSkills={context.agentSkills || undefined}
        title={agent.name}
      />
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SmartCodeEditorDemoPage() {
  const [code, setCode] = useState(TYPESCRIPT_SNIPPET);
  const [language, setLanguage] = useState("typescript");
  const [filePath, setFilePath] = useState(DEFAULT_FILE_PATH);
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [diagnostics, setDiagnostics] = useState(DEFAULT_DIAGNOSTICS);
  const [workspaceName, setWorkspaceName] = useState(DEFAULT_WORKSPACE_NAME);
  const [workspaceFolders, setWorkspaceFolders] = useState(
    DEFAULT_WORKSPACE_FOLDERS,
  );
  const [gitBranch, setGitBranch] = useState(DEFAULT_GIT_BRANCH);
  const [gitStatus, setGitStatus] = useState(DEFAULT_GIT_STATUS);
  const [agentSkills, setAgentSkills] = useState(DEFAULT_AGENT_SKILLS);
  // Unused here but kept in state so users can wire later. Seeded from snippets.
  const [additionalContext, setAdditionalContext] = useState(
    ADDITIONAL_CONTEXT_SNIPPET,
  );

  const sharedContext: SharedContext = {
    code,
    language,
    filePath,
    selection,
    diagnostics,
    workspaceName,
    workspaceFolders,
    gitBranch,
    gitStatus,
    agentSkills,
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      {/* Row 1: language + code + agents */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Code</span>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs h-[320px] resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {code.length} chars · {code.split("\n").length} lines
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {AGENTS.map((agent) => (
            <AgentDemoCard
              key={agent.id}
              agent={agent}
              context={sharedContext}
              onCodeChange={setCode}
            />
          ))}
        </div>
      </div>

      {/* Row 2: all context slot overrides */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Context slots</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SlotInput
            label="vsc_active_file_path"
            value={filePath}
            onChange={setFilePath}
          />
          <SlotInput
            label="vsc_workspace_name"
            value={workspaceName}
            onChange={setWorkspaceName}
          />
          <SlotInput
            label="vsc_git_branch"
            value={gitBranch}
            onChange={setGitBranch}
          />
          <SlotInput
            label="vsc_active_file_language"
            value={language}
            onChange={setLanguage}
            helper="(mirrors the Language picker above)"
          />

          <SlotTextarea
            label="vsc_selected_text"
            value={selection}
            onChange={setSelection}
            rows={3}
          />
          <SlotTextarea
            label="vsc_diagnostics"
            value={diagnostics}
            onChange={setDiagnostics}
            rows={3}
          />
          <SlotTextarea
            label="vsc_workspace_folders"
            value={workspaceFolders}
            onChange={setWorkspaceFolders}
            rows={3}
            helper="(one path per line)"
          />
          <SlotTextarea
            label="vsc_git_status"
            value={gitStatus}
            onChange={setGitStatus}
            rows={3}
          />
          <SlotTextarea
            label="agent_skills"
            value={agentSkills}
            onChange={setAgentSkills}
            rows={3}
            helper="(manual for now)"
          />
          <SlotTextarea
            label="additional_context (unused — staged for later)"
            value={additionalContext}
            onChange={setAdditionalContext}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Small input helpers ──────────────────────────────────────────────────────

function SlotInput({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono text-muted-foreground">
        {label} {helper && <span className="font-sans">{helper}</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs font-mono"
      />
    </div>
  );
}

function SlotTextarea({
  label,
  value,
  onChange,
  rows,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  helper?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono text-muted-foreground">
        {label} {helper && <span className="font-sans">{helper}</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 2}
        className="text-xs font-mono resize-none"
      />
    </div>
  );
}
