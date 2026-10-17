"use client";

/**
 * Add a test case by hand: a name, one box per declared input, the typed text,
 * and what a good reply does (one fact per line, decided by the fact judge).
 * Writes through `createTestCase` — the one case store. Used by the test page
 * and the Agent Studio's Cases tab.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import type { AgentContractHead } from "@/features/agents/samples/service";
import { createTestCase, factsFromLines, type TestCaseRow } from "../cases";

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
  const declarations = head?.variableDeclarations ?? [];
  const ready = label.trim() !== "" && factsFromLines(facts).length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const row = await createTestCase({
        agentId,
        label,
        variables: values,
        userInput,
        facts: factsFromLines(facts),
        head,
      });
      setLabel("");
      setValues({});
      setUserInput("");
      setFacts("");
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
          <Badge>{d.label ?? d.name}</Badge>
          <ProInput
            aria-label={d.label ?? d.name}
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
          onClick={() => void save()}
        >
          {saving ? "Adding…" : "Add test case"}
        </Button>
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
