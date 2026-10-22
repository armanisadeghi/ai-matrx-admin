"use client";

/**
 * Add a test case by hand: a name, one box per declared input, the typed text,
 * and what a good reply does (one fact per line, decided by the fact judge).
 * Writes through `createTestCase` — the one case store. Used by the test page
 * and the Agent Studio's Cases tab.
 */

import { useRef, useState } from "react";
import { Paperclip, Plus, X } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { fileRefPart, type AgentContractHead } from "@/features/agents/samples/service";
import { createTestCase, factsFromLines, type TestCaseRow } from "../cases";

/** A declared input's pretty name: its label, or its key in plain words. */
function prettyName(d: { name: string; label: string | null }): string {
  if (d.label?.trim()) return d.label;
  const words = d.name.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function TestCaseForm({
  agentId,
  head,
  onCreated,
  onCancel,
}: {
  agentId: string;
  head: AgentContractHead | null;
  onCreated: (row: TestCaseRow) => void;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [userInput, setUserInput] = useState("");
  const [facts, setFacts] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  /** Files the case runs with: durable references from the one upload door, never URLs. */
  const [files, setFiles] = useState<Array<{ fileId: string; fileName: string; mimeType: string | null }>>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const { upload, uploading } = useFileUpload();
  const attach = async (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      try {
        const uploaded = await upload({ kind: "file", file }, { folderPath: "agent-tests/cases" });
        setFiles((prev) => [
          ...prev,
          { fileId: uploaded.fileId, fileName: file.name, mimeType: uploaded.meta.mime ?? (file.type || null) },
        ]);
      } catch (err) {
        setError(err);
      }
    }
  };
  const declarations = head?.variableDeclarations ?? [];
  const ready = label.trim() !== "" && factsFromLines(facts).length > 0;
  /** Why the button waits: the first missing piece, in the field's own words. */
  const whyNot = label.trim() === "" ? "Add a name" : factsFromLines(facts).length === 0 ? "Say what a good reply does" : null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const row = await createTestCase({
        agentId,
        label,
        variables: values,
        userInput,
        ...(files.length > 0
          ? { inputContent: [...(userInput ? [{ type: "text", text: userInput }] : []), ...files.map(fileRefPart)] }
          : {}),
        facts: factsFromLines(facts),
        head,
      });
      setLabel("");
      setValues({});
      setUserInput("");
      setFacts("");
      setFiles([]);
      onCreated(row);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="test-case-form">
      <ProInput
        aria-label="Name"
        placeholder="Name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      {declarations.map((d) => (
        <label key={d.name} className="flex flex-col gap-1">
          <Badge className="self-start" title={`{{${d.name}}}`}>
            {prettyName(d)}
          </Badge>
          <ProInput
            aria-label={prettyName(d)}
            data-variable={d.name}
            value={values[d.name] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [d.name]: e.target.value }))
            }
          />
        </label>
      ))}
      <ProTextarea
        aria-label="Typed text"
        placeholder="Typed text"
        minHeight={48}
        autoGrow
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-1.5" data-testid="test-case-form-files">
        {files.map((f) => (
          <Button
            key={f.fileId}
            variant="outline"
            icon={<X />}
            title={`Remove ${f.fileName}`}
            onClick={() => setFiles((prev) => prev.filter((x) => x.fileId !== f.fileId))}
          >
            {f.fileName}
          </Button>
        ))}
        <Button variant="quiet" icon={<Paperclip />} disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? "Attaching…" : "Attach file"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            void attach(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <ProTextarea
        aria-label="A good reply"
        placeholder="A good reply… (one per line)"
        minHeight={64}
        autoGrow
        value={facts}
        onChange={(e) => setFacts(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          icon={<Plus />}
          disabled={!ready || saving}
          title={whyNot ?? undefined}
          onClick={() => void save()}
        >
          {saving ? "Adding…" : "Add test case"}
        </Button>
        {whyNot ? (
          <span className="text-xs text-muted-foreground" data-testid="test-case-form-why-not">
            {whyNot}
          </span>
        ) : null}
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? (
        <ErrorNotice
          size="inline"
          title="The test case was not added"
          error={error}
          operation="Add test case"
        />
      ) : null}
    </div>
  );
}
