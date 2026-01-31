# TypeScript Error Cleanup - Sub-Agent Instructions

## CRITICAL: Mission Statement
Your ONLY job is to fix TRIVIAL type errors without touching any logic or functionality. When in doubt, DO NOT FIX IT - add it to the review list instead.

## You CAN Fix (No Questions Asked)

1. **Type Annotations**
   - Add explicit types to variables: `const x = 5` → `const x: number = 5`
   - Add parameter types: `function foo(x)` → `function foo(x: string)`
   - Add return types: `function bar()` → `function bar(): void`

2. **Type Assertions/Casts**
   - Add type casts for known types: `data` → `data as MyType`
   - Use non-null assertions when safe: `value` → `value!`
   - Cast to specific types: `value as string`, `value as number`

3. **Import Fixes**
   - Fix import paths that are clearly typos
   - Add missing type imports
   - Fix named vs default import issues (ONLY if obvious from the file)

4. **Simple Property Access**
   - Add optional chaining: `obj.prop` → `obj?.prop` (only for obviously nullable values)
   - Fix typos in property names (ONLY if extremely obvious)

5. **Known Type Issues**
   - Add `@ts-expect-error` with clear explanation for legitimate edge cases
   - Example: `// @ts-expect-error - Legacy code, will be refactored in v2`

## You CANNOT Fix (Add to Review List)

1. **Any Logic Changes**
   - Changing conditional logic
   - Modifying calculations
   - Altering control flow
   - Changing function behavior

2. **Structural Changes**
   - Adding/removing function parameters
   - Changing data structures
   - Modifying class hierarchies
   - Altering component props

3. **Ambiguous Errors**
   - Errors where the correct fix is unclear
   - Errors that require understanding business logic
   - Errors involving complex type inference

4. **Breaking Changes**
   - Changes that affect function signatures used elsewhere
   - Changes that modify public APIs
   - Changes that alter exported types

## Special Case: Unused Files

If a file has >10 errors AND you can verify it's not imported anywhere:
1. Add `// @ts-nocheck` at the top of the file
2. Add the file path to `excluded-files.md`
3. Do NOT attempt to fix the errors

## File Limits

- Process MAXIMUM 3-5 files per run
- Stop immediately after reaching the limit
- Update progress tracking after each file

## Error Logging

When you cannot fix an error, add it to `errors-need-review.md` with this format:

```
### File: path/to/file.ts
Line: 42, Column: 15
Error Code: TS2339
Message: Property 'foo' does not exist on type 'Bar'

Reason for Review: [Brief explanation why this needs manual review]
Impact: [Estimated impact - Low/Medium/High]

---
```

## Verification Steps

After making ANY changes:
1. Ensure the file still compiles (check syntax)
2. Verify imports are valid
3. Check that you haven't changed any function signatures
4. Confirm no logic has been altered

## When to Stop

STOP IMMEDIATELY if:
- You've processed 5 files
- You encounter an error that makes you unsure
- You need to make a logic change to fix an error
- The fix would require changes in multiple files

## Remember

**Your goal is NOT to fix all errors. Your goal is to safely fix trivial errors and flag complex ones for expert review.**
