"use client";
import { VoiceTransferHistory } from "./VoiceTransferHistory";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@ai-matrx/design-system";
import { InfoHint } from "@/components/official/InfoHint";
import { readVoiceTransferTarget } from "@/lib/communications/voice/transfer-target";
import {
  loadVoiceDestinations,
  saveVoiceTransferTarget,
  type VoiceDestination,
} from "./voice-transfer-service";
function DestinationEditor({
  row,
  onSaved,
}: {
  row: VoiceDestination;
  onSaved: (row: VoiceDestination) => void;
}) {
  const [draft, setDraft] = useState(
    readVoiceTransferTarget(row.metadata) ?? "",
  );
  const [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(value: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveVoiceTransferTarget(row, value);
      onSaved(saved);
      setDraft(readVoiceTransferTarget(saved.metadata) ?? "");
      setMessage("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      aria-label={row.friendly_name ?? row.phone_number}
      className="rounded-lg border p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{row.friendly_name ?? row.phone_number}</h2>
        <span className="text-sm text-muted-foreground">
          {row.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{row.phone_number}</p>
      <div className="flex items-center gap-1">
        <Label htmlFor={`transfer-${row.id}`}>Transfer number</Label>
        <InfoHint text="The person callers reach when they ask for a human or press zero." />
      </div>
      <Input
        id={`transfer-${row.id}`}
        type="tel"
        autoComplete="tel"
        placeholder="US phone number"
        value={draft}
        disabled={saving}
        onChange={(e) => {
          setDraft(e.target.value);
          setMessage("");
        }}
      />
      <div className="flex items-center gap-2">
        <Button disabled={saving} onClick={() => void save(draft)}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="outline"
          disabled={saving || !readVoiceTransferTarget(row.metadata)}
          onClick={() => void save("")}
        >
          Clear
        </Button>
        <span role="status" className="text-sm">
          {message}
        </span>
      </div>
      {error && <ErrorNotice message={error} size="compact" />}
    </section>
  );
}
export function VoiceTransferSettings() {
  const [rows, setRows] = useState<VoiceDestination[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setRows(await loadVoiceDestinations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load voice lines.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let current = true;
    void loadVoiceDestinations()
      .then((data) => {
        if (current) setRows(data);
      })
      .catch((e) => {
        if (current)
          setError(
            e instanceof Error ? e.message : "Unable to load voice lines.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Voice transfers</h1>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void reload()}
        >
          Reload
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading voice lines…</p>
      ) : error ? (
        <ErrorNotice message={error} size="compact" />
      ) : rows.length === 0 ? (
        <p>No voice lines configured.</p>
      ) : (
        rows.map((row) => (
          <DestinationEditor
            key={row.id}
            row={row}
            onSaved={(saved) =>
              setRows((previous) =>
                previous.map((item) => (item.id === saved.id ? saved : item)),
              )
            }
          />
        ))
      )}
      <VoiceTransferHistory />
    </main>
  );
}
