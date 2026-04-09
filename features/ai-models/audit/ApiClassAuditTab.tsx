"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, CheckCircle2, Cpu, SaveAll } from "lucide-react";
import { aiModelService } from "../service";
import type { AiModel } from "../types";
import type { ModelAuditResult } from "./auditTypes";
import {
  AuditTableShell,
  Th,
  StatusBadge,
  IssueList,
  ProviderBadge,
  ModelNameCell,
} from "./AuditTableShell";
import ModelDetailSheet, { OpenDetailButton } from "./ModelDetailSheet";

interface ApiClassAuditTabProps {
  results: ModelAuditResult[];
  allModels: AiModel[];
  onModelUpdated: (id: string, patch: Partial<AiModel>) => void;
}

export default function ApiClassAuditTab({
  results,
  allModels,
  onModelUpdated,
}: ApiClassAuditTabProps) {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassingModels, setShowPassingModels] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [detailModelId, setDetailModelId] = useState<string | null>(null);

  const apiClassResults = results.map((r) => ({
    ...r,
    issues: r.issues.filter((i) => i.category === "api_class"),
    pass: r.categoryPass.api_class,
  }));

  const failingResults = apiClassResults.filter((r) => !r.pass);
  const passingResults = apiClassResults.filter((r) => r.pass);
  const displayResults = showPassingModels ? apiClassResults : failingResults;

  // Only use values that actually exist in the data — no guesses
  const existingClasses = [
    ...new Set(
      results.map((r) => r.model.api_class).filter(Boolean) as string[],
    ),
  ].sort();

  const dirtyIds = Object.keys(editValues);

  const getEditValue = (model: AiModel) =>
    editValues[model.id] !== undefined
      ? editValues[model.id]
      : (model.api_class ?? "");

  const saveSingle = async (model: AiModel) => {
    const value = getEditValue(model).trim();
    setSavingIds((prev) => new Set([...prev, model.id]));
    setErrors((prev) => ({ ...prev, [model.id]: "" }));
    try {
      await aiModelService.patchField(model.id, "api_class", value || null);
      onModelUpdated(model.id, { api_class: value || null });
      setSavedIds((prev) => new Set([...prev, model.id]));
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [model.id]: err instanceof Error ? err.message : "Save failed",
      }));
    } finally {
      setSavingIds((prev) => {
        const s = new Set(prev);
        s.delete(model.id);
        return s;
      });
    }
  };

  const handleSaveAll = async () => {
    if (dirtyIds.length === 0) return;
    setSavingAll(true);
    await Promise.all(
      dirtyIds.map((id) => {
        const model = results.find((r) => r.model.id === id)?.model;
        return model ? saveSingle(model) : Promise.resolve();
      }),
    );
    setSavingAll(false);
  };

  const handleBulkGuess = () => {
    const updates: Record<string, string> = {};
    failingResults.forEach(({ model }) => {
      const provider = (model.provider ?? "").toLowerCase();
      const match = existingClasses.find((c) => {
        const base = c.split("_")[0];
        return provider.includes(base) || base.includes(provider.split(" ")[0]);
      });
      if (match) updates[model.id] = match;
    });
    setEditValues((prev) => ({ ...prev, ...updates }));
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 px-3 py-2 border-b shrink-0 bg-muted/20">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-destructive">
              {failingResults.length} failing
            </span>
            {" · "}
            <span className="font-medium text-green-600">
              {passingResults.length} passing
            </span>
          </span>
          <div className="flex-1" />
          {failingResults.length > 0 && existingClasses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={handleBulkGuess}
            >
              Auto-suggest
            </Button>
          )}
          {dirtyIds.length > 1 && (
            <Button
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={handleSaveAll}
              disabled={savingAll}
            >
              {savingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SaveAll className="h-3 w-3" />
              )}
              Save All ({dirtyIds.length})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setShowPassingModels((v) => !v)}
          >
            {showPassingModels ? "Hide passing" : "Show all"}
          </Button>
        </div>

        <AuditTableShell
          isEmpty={displayResults.length === 0}
          empty={
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-60" />
              <p className="text-sm">All models have an api_class set</p>
            </div>
          }
          headers={
            <>
              <Th className="w-6" />
              <Th>Model</Th>
              <Th className="w-28">Provider</Th>
              <Th className="w-16">Status</Th>
              <Th>Set API Class</Th>
              <Th className="w-40">Issues</Th>
              <Th className="w-16 text-right">Save</Th>
            </>
          }
        >
          {displayResults.map((r, idx) => {
            const { model } = r;
            const editVal = getEditValue(model);
            const isSaving = savingIds.has(model.id);
            const wasSaved = savedIds.has(model.id);
            const isDirty = editValues[model.id] !== undefined;

            return (
              <tr
                key={model.id}
                className={`h-10 border-b border-border ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
              >
                <td className="px-1.5 py-1.5">
                  <OpenDetailButton
                    onClick={() => setDetailModelId(model.id)}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <ModelNameCell
                    name={model.name}
                    commonName={model.common_name}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <ProviderBadge provider={model.provider} />
                </td>
                <td className="px-3 py-1.5">
                  {wasSaved ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  ) : (
                    <StatusBadge pass={r.pass} />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {existingClasses.length > 0 && (
                      <Select
                        value={editVal || "__none__"}
                        onValueChange={(v) => {
                          if (v !== "__none__") {
                            setEditValues((prev) => ({
                              ...prev,
                              [model.id]: v,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-52 font-mono">
                          <SelectValue placeholder="Pick existing…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Pick existing…
                          </SelectItem>
                          {existingClasses.map((c) => (
                            <SelectItem key={c} value={c} className="font-mono">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={editVal}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [model.id]: e.target.value,
                        }))
                      }
                      placeholder="or type new value…"
                      className="h-7 text-xs w-44 font-mono"
                    />
                  </div>
                  {errors[model.id] && (
                    <span className="text-destructive text-[10px]">
                      {errors[model.id]}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <IssueList issues={r.issues} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    disabled={isSaving || !isDirty}
                    onClick={() => saveSingle(model)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save
                  </Button>
                </td>
              </tr>
            );
          })}
        </AuditTableShell>
      </div>

      <ModelDetailSheet
        modelId={detailModelId}
        allModels={allModels}
        onClose={() => setDetailModelId(null)}
        onSaved={(saved) => {
          onModelUpdated(saved.id, saved);
          setDetailModelId(null);
        }}
      />
    </>
  );
}
