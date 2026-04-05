---
name: type-fixing-agent
description: Rules and workflow for fixing TypeScript type errors across the codebase. Database-generated types are the source of truth — local types and code must conform to them. Use when fixing type errors, resolving tsc failures, aligning local types with database types, or when asked to fix types in specific files. Also use when triaging type-errors.txt or running a type-fix pass.
---

# Type-Fixing Agent

## Source of Truth

Auto-generated TypeScript types from the database (`types/database.types.ts`) are **always correct**. If local types, interfaces, or code logic disagree with database types, the local code is wrong.

For Supabase-specific casting patterns (`DbRpcRow`, `JsonToUnknown`, DB shape guards), see the **supabase-type-safety** skill.

---

## Rules

### 1. Fix Root Causes — No Shortcuts

Understand *why* each type mismatch exists before changing anything. Fix the actual cause, not the symptom.

### 2. Database Types Are Canonical

- If local types conflict with database types → local types are wrong.
- If code logic conflicts with database types → code logic is wrong.
- Delete local types that duplicate database types; import the database type directly.

### 3. Never Hide Errors

Forbidden escape hatches:

| Forbidden | Why |
|-----------|-----|
| `as unknown` (to force-cast) | Hides structural mismatch |
| `as any` | Disables all checking |
| `// @ts-ignore` | Suppresses without fixing |
| `// @ts-expect-error` | Same — suppresses without fixing |
| Widening to `Record<string, any>` | Loses type safety |

**Exception:** `as unknown as T` is permitted **only** when a compile-time DB shape guard (`satisfies` check) validates the cast. See the supabase-type-safety skill for this pattern.

If an error cannot be fixed properly, **leave it in place** and report it.

### 4. Know Your Limits — Escalate

Stop, report, and move to the next file when:

- The correct type is ambiguous or unclear.
- Fixing requires changing code logic (not just types).
- Fixing one error would cascade into architectural changes.

### 5. No Project-Wide Type Checks

**Never** run `tsc`, `npx tsc --noEmit`, or any full project type check. The project has thousands of existing errors; a full check is slow and unhelpful. Only work on files explicitly provided.

### 6. Scoped Work Only

Only fix files explicitly provided. Do not go searching for additional errors.

---

## Workflow Per File

1. **Read** the file and identify all type errors.
2. **For each error**, determine the database type (source of truth):
   - Local type wrong → replace with correct database type import.
   - Code wrong → fix code to match database type.
   - Unsure or requires logic changes → **leave the error, report it.**
3. **After fixing**, report:
   - What was fixed and why.
   - What was left unfixed and why.

---

## Common Fix Patterns

### Replace local type with database import

```ts
// Before — local type duplicates database type
interface AgentRow {
  id: string;
  name: string;
  // ...drifted from actual schema
}

// After — import directly
import type { Database } from "@/types/database.types";
type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
```

### Fix property access after schema change

```ts
// DB renamed `config` to `settings`
// Before (error: Property 'config' does not exist)
const val = row.config;

// After
const val = row.settings;
```

### Fix function signature to match DB return type

```ts
// DB RPC returns { id: string; name: string }[]
// Before — function claims it returns { id: number; name: string }[]
async function getItems(): Promise<{ id: number; name: string }[]> { ... }

// After — align with DB
async function getItems(): Promise<{ id: string; name: string }[]> { ... }
```

### Narrow `unknown` from JSON columns safely

```ts
// DB column is JSONB → typed as `unknown` after patch
// Use runtime validation or the supabase-type-safety guard pattern
function parseSettings(raw: unknown): MySettings {
  if (!raw || typeof raw !== "object") throw new Error("Invalid settings");
  return raw as MySettings;
}
```

---

## Key Files

| File | Role |
|------|------|
| `types/database.types.ts` | Auto-generated DB types — source of truth |
| `types/supabase-rpc.ts` | `DbRpcRow<F>`, `JsonToUnknown<T>` utilities |
| `type-errors.txt` | Current list of known type errors |

---

## Reporting Template

After fixing a file, report using this structure:

```
### filename.ts

**Fixed:**
- [error description] → [what was changed and why]

**Skipped (needs manual review):**
- [error description] → [why it was skipped]
```
