/**
 * The ONE permission-level ladder.
 *
 * Every rank map, label map, ordered array and level union in the app derives
 * from `PERMISSION_LEVELS` below. Before this module existed the ladder was
 * hard-coded in eight places as `viewer | editor | admin`, so a fourth level
 * would have been missing from most of them — and missing SILENTLY: a rank
 * lookup returned `undefined`, `undefined >= 2` is `false`, and the holder of
 * the new level was refused with no message anywhere (law 4, nothing fails
 * silently). `getPermissionLevelLabel` was worse: it returned `undefined` and
 * the screen rendered a blank string where the level should be.
 *
 * ## Code ladder vs database enum — deliberately different widths
 *
 * `PERMISSION_LEVELS` (the CODE ladder) is the superset and includes
 * `commenter`. `DB_PERMISSION_LEVELS` (the DATABASE enum, read at runtime from
 * the generated `Constants`, never hand-typed) is what `public.permission_level`
 * actually holds today: `viewer, editor, admin`. `commenter` is NOT there yet.
 *
 * That gap is the whole point and it is safe in one direction only:
 *
 * - READING / COMPARING / LABELLING a level: always use the code ladder. It
 *   tolerates `commenter` the moment the database gains it, with no code change
 *   and no silent refusal in between. Nothing breaks while the value never
 *   arrives — the extra rank and label simply go unused.
 * - WRITING a level to the database, or OFFERING it in a picker: narrow through
 *   `toDbPermissionLevel` / `DB_PERMISSION_LEVELS` first. Sending `commenter`
 *   to Postgres today fails with `invalid input value for enum
 *   public.permission_level`, so the ladder refuses it HERE, by name, with the
 *   remedy — rather than letting a picker offer a value the save will reject.
 *
 * When `ALTER TYPE public.permission_level ADD VALUE 'commenter' BEFORE 'editor'`
 * is applied and `pnpm db-types` regenerated, `DB_PERMISSION_LEVELS` widens on
 * its own and every picker driven by it gains the option with no further edit.
 *
 * Doctrine: the access levels are `viewer` · `commenter` · `editor` · `admin`
 * (AI Matrx Data Doctrine R18, 2026-09-10;
 * common-docs/systems/platform/access/DECISIONS.md).
 * Guard: `utils/permissions/__tests__/permission-levels.test.ts` fails if any
 * rank map, label map or ordered array omits a level.
 */

import { Constants } from "@/types/database.types";
import type { DbPermissionLevel } from "@ai-matrx/chat/ui/permission-levels";
import { PERMISSION_LEVEL_RANK as PACKAGE_RANK } from "@ai-matrx/chat/ui/permission-levels";

export * from "@ai-matrx/chat/ui/permission-levels";

// ONE-LADDER (Arman 2026-10-10): the public ladder is View · Comment · Edit · Full access.
// `edit_content` is retired: the DB enum value stays, but no UI offers, labels or ranks it apart
// from `editor` — a stray stored row reads as Edit. These local declarations override the
// package's five-level exports (explicit exports win over `export *`).
export const PERMISSION_LEVELS = ["viewer", "commenter", "editor", "admin"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/** Rank of every public level; the retired `edit_content` ranks as `editor` so old data never crashes. */
export const PERMISSION_LEVEL_RANK: Record<PermissionLevel, number> & { edit_content: number } = {
  viewer: PACKAGE_RANK.viewer,
  commenter: PACKAGE_RANK.commenter,
  editor: PACKAGE_RANK.editor - 1,
  admin: PACKAGE_RANK.admin - 1,
  edit_content: PACKAGE_RANK.editor - 1,
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  viewer: "View",
  commenter: "Comment",
  editor: "Edit",
  admin: "Full access",
};
export const PERMISSION_LEVEL_SHORT_LABELS: Record<PermissionLevel, string> = { ...PERMISSION_LEVEL_LABELS };
export const PERMISSION_LEVEL_HINTS: Record<PermissionLevel, string> = {
  viewer: "Read only",
  commenter: "Read and comment",
  editor: "Change values and content",
  admin: "Edit plus structure and sharing",
};

/** Maps a stored/retired level onto the public ladder (`edit_content` becomes `editor`). */
export function normalizePermissionLevel(raw: unknown): PermissionLevel | null {
  if (raw === "edit_content") return "editor";
  return isPermissionLevel(raw) ? raw : null;
}

export function isPermissionLevel(raw: unknown): raw is PermissionLevel {
  return typeof raw === "string" && (PERMISSION_LEVELS as readonly string[]).includes(raw);
}

export function parsePermissionLevel(raw: unknown, context: string): PermissionLevel | null {
  const level = normalizePermissionLevel(raw);
  if (level) return level;
  if (raw === null || raw === undefined) return null;
  console.error(
    `[permissions] ${context}: unrecognised permission level ${JSON.stringify(raw)}. Known levels are ${PERMISSION_LEVELS.join(", ")}. Add it to PERMISSION_LEVELS in utils/permissions/levels.ts if the database gained a new value.`,
  );
  return null;
}

export function permissionLevelRank(level: PermissionLevel): number {
  const rank = (PERMISSION_LEVEL_RANK as Record<string, number>)[level];
  if (rank === undefined) {
    console.error(
      `[permissions] no rank for permission level ${JSON.stringify(level)}. Add it to PERMISSION_LEVELS in utils/permissions/levels.ts.`,
    );
    return Number.NaN;
  }
  return rank;
}

export function isDbPermissionLevel(level: PermissionLevel): level is PermissionLevel & DbPermissionLevel {
  return (DB_PERMISSION_LEVELS as readonly string[]).includes(level);
}

export function toDbPermissionLevel(level: PermissionLevel): DbPermissionLevel {
  if (isDbPermissionLevel(level)) return level;
  throw new Error(
    `Permission level "${level}" is not in the database enum public.permission_level (it holds ${DB_PERMISSION_LEVELS.join(", ")}). Apply ALTER TYPE public.permission_level ADD VALUE '${level}' and regenerate types with \`pnpm db-types\` before granting this level.`,
  );
}

/**
 * The values `public.permission_level` holds RIGHT NOW, read from the generated
 * constants rather than re-typed here, so it widens by regeneration alone.
 */
export const DB_PERMISSION_LEVELS: readonly DbPermissionLevel[] =
  Constants.public.Enums.permission_level;

/** The levels a picker may offer: what the database stores, minus the retired `edit_content`. */
export const OFFERED_DB_PERMISSION_LEVELS: readonly DbPermissionLevel[] =
  DB_PERMISSION_LEVELS.filter((level) => level !== "edit_content");

