# Autonomous TypeScript Error Cleanup - Agent Instructions

## NEW APPROACH: Line-Range Assignment with Full Autonomy

You are assigned a specific range of lines from `public/type_errors.json`. You will handle **ALL error types** in your range, not just one specific error code.

## Your Mission

1. **Read your assigned line range** from the error JSON file
2. **Analyze each error** in your range
3. **Decide the best fix** for each error
4. **Execute fixes safely** or use escape hatches

## Decision Tree for Each Error

### CAN FIX SAFELY? ✅
- Simple type annotations
- Import path corrections
- Type assertions for known types
- Adding missing return types
- Fixing obvious typos
- Adding optional chaining where safe

**→ FIX IT!**

### REQUIRES LOGIC CHANGE? ❌
- Changing function behavior
- Modifying conditionals
- Altering calculations
- Restructuring code
- Changes that affect runtime

**→ USE ESCAPE HATCH!**

## Escape Hatches (When You Can't Fix Safely)

### Option 1: Type Assertion with `any`
```typescript
// Before (error)
const data = someFunction();

// After (safe escape)
const data = someFunction() as any; // TODO: Fix type definition
```

### Option 2: `@ts-ignore` with Comment
```typescript
// @ts-ignore - Complex type issue, requires logic refactor
const result = complexFunction(param);
```

### Option 3: `@ts-expect-error` with Explanation
```typescript
// @ts-expect-error - Known limitation, will fix in v2
interface Foo extends Bar {}
```

## CRITICAL SAFETY RULES

### ❌ NEVER DO THESE:
1. Change function logic or behavior
2. Modify conditional statements
3. Alter calculations or algorithms
4. Change function parameters (unless adding optional with defaults)
5. Restructure data flow
6. Remove or change existing functionality

### ✅ ALWAYS ALLOWED:
1. Add type annotations
2. Fix import paths
3. Add `any` or `@ts-ignore` with comments
4. Add optional chaining (`?.`)
5. Add non-null assertions (`!`) if you're certain
6. Add return type annotations

## Your Process

1. **Read** your line range from `public/type_errors.json`
2. **Parse** each error entry
3. **For each error:**
   - Read the file
   - Locate the error
   - Decide: Can I fix safely?
   - **YES**: Apply the fix
   - **NO**: Use escape hatch (`any` or `@ts-ignore`)
4. **Track** what you did
5. **Report** back with summary

## Example Decision Making

### Example 1: Safe Fix
**Error:** `Property 'name' does not exist on type 'unknown'`
**Decision:** Safe to add type annotation
**Action:** `const user: User = data;` or `(data as User).name`

### Example 2: Use Escape Hatch
**Error:** `Type 'string' is not assignable to type 'number'`
**Context:** Function expects number but gets string from API
**Decision:** Fixing requires changing API call logic
**Action:** `const value = apiValue as any; // TODO: Fix API response type`

### Example 3: Import Fix
**Error:** `Cannot find module '@/types'`
**Decision:** Safe - just import path
**Action:** `import { Type } from '@/types/entityTypes';`

## Reporting Format

```
FILES PROCESSED: X
ERRORS ENCOUNTERED: Y
FIXES APPLIED: Z
ESCAPE HATCHES USED: N

BREAKDOWN:
- Import fixes: X
- Type annotations: Y
- Type assertions (any): Z
- @ts-ignore added: N
- Other: M

NOTES:
[Any important observations or patterns you noticed]
```

## Remember

- **Safety First** - If unsure, use `any` or `@ts-ignore`
- **Document Decisions** - Add comments explaining why
- **No Logic Changes** - Ever
- **Autonomy** - You decide the best approach for each error
- **Speed** - Don't overthink, process your range efficiently

**You have full autonomy to make decisions within these safety constraints. Trust your judgment, prioritize safety, and get it done!**
