# Batch 036: Final Agent 4/5 - COMPLETE COVERAGE

**Line Range:** 829-1104  
**Approach:** Full autonomy with safety constraints  
**Date:** 2026-01-31

## Your Assignment

Process **lines 829-1104** of `public/type_errors.json` and fix ALL errors you can safely fix.

## Instructions

1. Read lines 829-1104 from `/home/arman/projects/ai-matrx-admin/public/type_errors.json`
2. For EACH error in your range:
   - Analyze the error
   - Read the affected file
   - Decide: Can I fix this safely?
   - **IF YES:** Fix it (imports, types, props, etc.)
   - **IF NO:** Use `any` or `@ts-ignore` with detailed comment explaining why it's complex
3. Track your work

## Key Rules

- **NO logic changes** unless it's a clear bug
- Use `any` or `@ts-ignore` for complex issues that need manual review
- **MARK COMPLEX ISSUES** clearly in escape hatch comments
- Full autonomy within safety constraints
- Process ALL errors in your range

**This is the FINAL PUSH! Leave complex ones for manual review, fix what you can!**

Read the full instructions at: `.cursor/type-checking/AUTONOMOUS-INSTRUCTIONS.md`
