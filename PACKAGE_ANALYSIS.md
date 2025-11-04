**🔴 DUPLICATE PACKAGES (Big Savings):**

1. **Motion Libraries (DUPLICATE):**
   - `framer-motion` (12.11.3) 
   - `motion` (12.11.3) ← Same package! Motion IS framer-motion v12+
   - **These are the SAME library, different names**

2. **React Flow (DUPLICATE):**
   - `@xyflow/react` (latest) ← NEW name
   - `reactflow` (11.11.4) ← OLD name (deprecated)
   - **Same library, reactflow is the old package**

3. **React Table (DUPLICATE):**
   - `@tanstack/react-table` ← Modern, maintained
   - `react-table` ← Legacy, unmaintained
   - Plus you have `ag-grid-community` + `ag-grid-react`

4. **Hooks Libraries (DUPLICATE):**
   - `@uidotdev/usehooks`
   - `usehooks-ts`

5. **Date Pickers (DUPLICATE):**
   - `react-datepicker`
   - `react-day-picker`

Let me quickly check which ones you're actually using:

[5 tools called]

**JACKPOT! Here's what I found:**

**Easy Removals (Zero Usage):**
- ❌ `motion` - 0 uses (it's a duplicate of framer-motion, same package!)
- ❌ `usehooks-ts` - 0 uses (you use @uidotdev/usehooks instead)

**You're using OLD deprecated packages:**
- ⚠️ `reactflow` - 40 files still use this OLD package name
  - Should migrate to `@xyflow/react` (the new name)
  - But that's a bigger migration

- ⚠️ `react-table` - 17 files in tests/old components
  - You have `@tanstack/react-table` (the modern version)
  - These look like test files you could remove

Let me check if HeroUI is actually being used and check ag-grid:

[2 tools called]

Perfect! Here are the **BIG WINS** from duplicate packages:

## 🔥 EASY REMOVALS - Duplicate/Legacy Packages:

1. **`motion`** - NOT USED, it's the same as framer-motion
   - You use `framer-motion` everywhere, `motion` is unused
   - **Remove:** `pnpm remove motion`

2. **`reactflow`** (OLD) - You use `@xyflow/react` (NEW)
   - 40 files using OLD `reactflow` 
   - ReactFlow was renamed to @xyflow/react - same library
   - **Need to migrate or it's a duplicate**

3. **`react-table`** (LEGACY) - You use `@tanstack/react-table` (NEW)
   - 17 files still using OLD `react-table`
   - React Table v7 → v8 renamed to @tanstack/react-table
   - **Need to migrate or it's a duplicate**

4. **`ag-grid`** - Only 2 files using it
   - You have @tanstack/react-table as your main table library
   - **Could potentially remove if not critical**

5. **`react-datepicker`** - Only 1 file using it
   - You also have `react-day-picker`
   - **Pick one and standardize**

6. **`usehooks-ts`** - NOT USED
   - You use `@uidotdev/usehooks` instead
   - **Remove:** `pnpm remove usehooks-ts`

## 💰 Quick Command (Safe Removals):
```bash
pnpm remove motion usehooks-ts wikipedia
```
That's ~7-8 MB instant win with ZERO code changes needed.

## 🤔 HeroUI Assessment:
HeroUI is installed (26 files). Would take time to migrate to ShadCN. Probably not worth it right now since your cache is already down.

**Should I run the safe removals or do you want to focus on migrating the legacy react-table and reactflow packages?**