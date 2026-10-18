"use client";

/**
 * SkillSetMembersEditor — the ordered member list of a skill SET.
 *
 * A set (`skill_type = "set"`) attaches to an agent as one unit; the server
 * resolves it to these members at run time, so editing this list reaches every
 * agent that attaches the set. Members are stored in `config.set_members`
 * through `withSetMembers` (features/skills/skill-sets.ts).
 */

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { Input } from "@ai-matrx/design-system/controls";
import { filterAndSortBySearch } from "@ai-matrx/kit/search-scoring";

import { useSkills } from "../hooks/useSkills";
import { isSkillSet } from "../skill-sets";
import type { SkillRow } from "../types";

const MAX_SUGGESTIONS = 8;

interface SkillSetMembersEditorProps {
  memberIds: string[];
  onChange: (next: string[]) => void;
  /** The catalogue to pick from (the set itself is excluded). */
  skills: SkillRow[];
  /** Id of the set being edited — never offered as its own member. */
  setId?: string;
  disabled?: boolean;
}

export function SkillSetMembersEditor({
  memberIds,
  onChange,
  skills,
  setId,
  disabled = false,
}: SkillSetMembersEditorProps) {
  const [query, setQuery] = React.useState("");
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const memberSet = new Set(memberIds);

  const candidates = skills.filter((s) => s.id !== setId && !memberSet.has(s.id));
  const suggestions = query.trim()
    ? filterAndSortBySearch(candidates, query, [
        { get: (s) => s.label, weight: "title" },
        { get: (s) => s.skillId, weight: "subtitle" },
        { get: (s) => s.description, weight: "body" },
      ]).slice(0, MAX_SUGGESTIONS)
    : [];

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= memberIds.length) return;
    const next = [...memberIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2" data-testid="skill-set-members">
      {memberIds.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          No members yet.
        </p>
      ) : (
        <ol className="space-y-1">
          {memberIds.map((id, index) => {
            const member = skillById.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
              >
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <EntityRef
                  token="skill"
                  id={id}
                  name={member?.label ?? null}
                  showIcon={false}
                  fill
                  className="min-w-0 flex-1 text-sm"
                />
                {member && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isSkillSet(member) ? "set" : member.skillType}
                  </span>
                )}
                <Button
                  type="button"
                  variant="quiet"
                  icon={<ArrowUp />}
                  aria-label="Move up"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                />
                <Button
                  type="button"
                  variant="quiet"
                  icon={<ArrowDown />}
                  aria-label="Move down"
                  disabled={disabled || index === memberIds.length - 1}
                  onClick={() => move(index, 1)}
                />
                <Button
                  type="button"
                  variant="quiet"
                  icon={<X />}
                  aria-label={`Remove ${member?.label ?? id} from the set`}
                  disabled={disabled}
                  onClick={() => onChange(memberIds.filter((m) => m !== id))}
                />
              </li>
            );
          })}
        </ol>
      )}

      {!disabled && (
        <div className="space-y-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              adornment="both"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add a skill to this set…"
              aria-label="Search skills to add"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange([...memberIds, s.id]);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {s.skillId}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The editor wired to the visible skills catalogue (for forms that do not hold it). */
export function SkillSetMembersField(
  props: Omit<SkillSetMembersEditorProps, "skills">,
) {
  const { skills } = useSkills();
  return <SkillSetMembersEditor {...props} skills={skills} />;
}
