/**
 * Skill sets — a named group of skills attached to an agent as ONE unit.
 *
 * A set is an ordinary `skill.definition` row with `skill_type = "set"`; its
 * ordered members live in `config.set_members` (skill UUIDs). The server
 * (matrx_ai.skills.resolver.expand_skill_sets) replaces a set id in any
 * `skill_config` tier with its members at run time, so adding a skill to a set
 * reaches every agent that attaches it. This file is the ONE client reader and
 * writer of that shape.
 */

import type { SkillRow } from "./types";

export const SKILL_SET_TYPE = "set";
export const SET_MEMBERS_KEY = "set_members";

export function isSkillSet(skill: Pick<SkillRow, "skillType"> | null | undefined): boolean {
  return skill?.skillType === SKILL_SET_TYPE;
}

/** A set's ordered, de-duplicated member ids (empty for a non-set or bad data). */
export function setMemberIds(config: Record<string, unknown> | null | undefined): string[] {
  const raw = config?.[SET_MEMBERS_KEY];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item && !out.includes(item)) out.push(item);
  }
  return out;
}

/** The config with its member list replaced (every other key kept). */
export function withSetMembers(
  config: Record<string, unknown>,
  memberIds: string[],
): Record<string, unknown> {
  return { ...config, [SET_MEMBERS_KEY]: Array.from(new Set(memberIds)) };
}

/** Members of a set resolved against the loaded catalogue, in order (unknown ids kept as null). */
export function resolveSetMembers(
  skill: Pick<SkillRow, "config">,
  skillById: Map<string, SkillRow>,
): Array<{ id: string; skill: SkillRow | null }> {
  return setMemberIds(skill.config).map((id) => ({ id, skill: skillById.get(id) ?? null }));
}
