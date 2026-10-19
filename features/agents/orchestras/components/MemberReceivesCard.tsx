// features/agents/orchestras/components/MemberReceivesCard.tsx
//
// "Receives" — one member's connection setting (context passthrough), in the member inspector.
// The Group Chat "Sees" pattern: a mode picker, a value/group picker for the mode's list, and the
// person-and-organization switch. Saved per control through the version-checked door
// (`saveMemberContext`); a stale save reloads, never overwrites. Server rules:
// aidream services/orchestras/passthrough.py · contract: ORCHESTRA.md § Context passthrough.

"use client";

import { useEffect, useState } from "react";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import {
  Alert,
  AlertDescription,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@ai-matrx/design-system";
import { Button, Chip, ChipSet, Input, SelectTrigger, Switch } from "@ai-matrx/design-system/controls";
import {
  selectAgentAutoContextDisabled,
  selectAgentContextPolicies,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { InfoHint } from "@/components/official/InfoHint";
import { toast } from "@/lib/toast-service";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchFullAgent } from "@/features/agents/redux/fetch-full-agent.thunk";
import { saveMemberContext } from "@/features/agents/redux/orchestras/thunks";
import {
  MEMBER_CONTEXT_MODES,
  MEMBER_CONTEXT_MODE_HINT,
  MEMBER_CONTEXT_MODE_LABEL,
  VALUE_HEADINGS,
  VALUE_REF_PATTERN,
  withMode,
  type MemberContext,
  type MemberContextMode,
} from "../memberContext";
import type { OrchestraMember } from "../types";

/** On-screen names for the headings a value is grouped under (the chat's context levels). */
const HEADING_NAME: Record<string, string> = { page: "Page", attached: "Attached", ai_matrx: "AI Matrx" };

interface PickOption {
  key: string;
  name: string;
  section: string;
}

function policyKeys(policies: ReadonlyArray<{ key: string; label?: string | null }> | undefined) {
  return (policies ?? []).map((p) => ({ key: p.key, name: p.label?.trim() || humanizeIdentifier(p.key) }));
}

export function MemberReceivesCard({
  conductorId,
  member,
}: {
  conductorId: string;
  member: OrchestraMember;
}) {
  const dispatch = useAppDispatch();
  const memberPolicies = useAppSelector((s) => selectAgentContextPolicies(s, member.agentId));
  const onlyDeclared = useAppSelector((s) => selectAgentAutoContextDisabled(s, member.agentId));
  const conductorPolicies = useAppSelector((s) => selectAgentContextPolicies(s, conductorId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const [saving, setSaving] = useState(false);

  // The Conductor's declared values are the first offer in the picker; its full definition is
  // not on the list row. (The member's own is loaded by the I/O block below this card.)
  useEffect(() => {
    if (conductorPolicies === undefined) void dispatch(fetchFullAgent(conductorId));
  }, [conductorPolicies, conductorId, dispatch]);

  const ctx = member.context;
  const declared = policyKeys(memberPolicies);
  const listField: "alwaysSend" | "allExcept" | null =
    ctx.mode === "handed_over" ? "alwaysSend" : ctx.mode === "mirror" ? "allExcept" : null;
  const listed = listField ? ctx[listField] : [];

  const options: PickOption[] = [];
  const seen = new Set<string>();
  const offer = (key: string, name: string, section: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ key, name, section });
  };
  for (const p of policyKeys(conductorPolicies)) offer(p.key, p.name, "Conductor");
  for (const p of declared) offer(p.key, p.name, "This agent");
  for (const h of VALUE_HEADINGS) offer(h, HEADING_NAME[h] ?? humanizeIdentifier(h), "Groups");
  for (const k of listed) offer(k, humanizeIdentifier(k), "Added");
  const nameOf = (key: string) => options.find((o) => o.key === key)?.name ?? humanizeIdentifier(key);

  const save = async (next: MemberContext) => {
    setSaving(true);
    const res = await dispatch(saveMemberContext({ conductorId, agentId: member.agentId, context: next }));
    setSaving(false);
    if (!res.ok) toast.error(res.stale ? "Changed elsewhere — reloaded" : `Not saved. ${res.error ?? ""}`.trim());
  };

  const setList = (keys: string[]) => {
    if (!listField) return;
    void save({ ...ctx, [listField]: keys });
  };

  const addKey = () => {
    const key = adding.trim();
    if (!VALUE_REF_PATTERN.test(key) || listed.includes(key)) return;
    setAdding("");
    setList([...listed, key]);
  };

  // Only once the member's definition is loaded: an unread list is not "declares nothing".
  const policiesLoaded = memberPolicies !== undefined;
  const refusedByClosed = ctx.mode === "closed" && policiesLoaded ? declared : [];
  const sections = [...new Set(options.map((o) => o.section))];

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-3" data-testid="member-receives">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-foreground">Receives</span>
          <InfoHint text={MEMBER_CONTEXT_MODE_HINT[ctx.mode]} label="About Receives" />
        </div>
        <Select
          value={ctx.mode}
          disabled={saving}
          onValueChange={(v) => void save(withMode(ctx, v as MemberContextMode))}
        >
          <SelectTrigger width="xs" aria-label="Receives" className="shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_CONTEXT_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {MEMBER_CONTEXT_MODE_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {member.contextError ? (
        <Alert variant="destructive">
          <AlertDescription>{member.contextError}</AlertDescription>
        </Alert>
      ) : null}

      {listField ? (
        <div className="flex items-center justify-between gap-2">
          <span className="type-meta text-muted-foreground">
            {listField === "alwaysSend" ? "Always send" : "All except"}
          </span>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-0" disabled={saving}>
                <span className="truncate">{listed.length ? listed.map(nameOf).join(", ") : "None"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" width="xs" padding="xs">
              {sections.map((section) => (
                <div key={section} className="pb-1">
                  <div className="px-1.5 pt-1 type-meta font-semibold text-muted-foreground">{section}</div>
                  {options
                    .filter((o) => o.section === section)
                    .map((o) => (
                      <label
                        key={o.key}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
                        data-clickable
                      >
                        <Checkbox
                          checked={listed.includes(o.key)}
                          onCheckedChange={(on) =>
                            setList(on === true ? [...listed, o.key] : listed.filter((k) => k !== o.key))
                          }
                        />
                        <span className="truncate">{o.name}</span>
                      </label>
                    ))}
                </div>
              ))}
              <div className="flex items-center gap-1 px-1.5 pt-1">
                <Input
                  value={adding}
                  onChange={(e) => setAdding(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addKey();
                  }}
                  placeholder="Value name"
                  aria-label="Add a value name"
                />
                <Button variant="outline" onClick={addKey} disabled={!VALUE_REF_PATTERN.test(adding.trim())}>
                  Add
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <label htmlFor={`receives-person-${member.agentId}`} className="type-meta text-muted-foreground">
            Person &amp; org
          </label>
          <InfoHint
            text="Who it works for, the time, and the organization and scopes — rebuilt for it, on even when Closed."
            label="About Person & org"
          />
        </div>
        <Switch
          id={`receives-person-${member.agentId}`}
          checked={ctx.personAndOrg}
          disabled={saving}
          onCheckedChange={(on) => void save({ ...ctx, personAndOrg: on })}
        />
      </div>

      {refusedByClosed.length ? (
        <Alert variant="warning">
          <AlertDescription className="truncate">
            {`Closed refuses ${refusedByClosed.map((d) => d.name).join(", ")}`}
          </AlertDescription>
        </Alert>
      ) : null}

      {onlyDeclared && policiesLoaded ? (
        <div className="space-y-1">
          <span className="type-meta text-muted-foreground">Accepts only</span>
          {declared.length ? (
            <ChipSet>
              {declared.map((d) => (
                <Chip key={d.key} label={d.name} />
              ))}
            </ChipSet>
          ) : (
            <div className="type-meta text-muted-foreground">Nothing</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
