# Component Language Fix: 'react' → 'tsx'

## Problem

The `component_language` field in the `prompt_apps` table was set to `'react'`, which is **not a valid language identifier** for syntax highlighting libraries like Prism.js.

### Symptoms
- Code blocks showing as generic "code" without syntax highlighting
- No TypeScript/JSX-specific highlighting for React components
- Prism.js not recognizing the `'react'` language

## Solution

We've implemented a **two-part fix**:

### 1. Backward Compatibility (Immediate Fix)

**File: `components/mardown-display/code/CodeBlock.tsx`**

Added a `mapLanguageForPrism()` function that maps language identifiers to Prism.js-compatible names:

```typescript
const mapLanguageForPrism = (lang: string): string => {
    const languageMap: Record<string, string> = {
        'react': 'tsx',          // React components → TypeScript JSX
        'jsx': 'jsx',            // JavaScript JSX
        'tsx': 'tsx',            // TypeScript JSX
        'typescript': 'typescript',
        'javascript': 'javascript',
        // ... more mappings
    };
    
    return languageMap[lang.toLowerCase()] || lang;
};
```

**What this does:**
- ✅ Existing records with `component_language = 'react'` will now display with proper TSX highlighting
- ✅ No database changes required for immediate fix
- ✅ All language variations are normalized (e.g., 'js' → 'javascript')

### 2. Going Forward (Proper Fix)

**Files Updated:**
- `features/prompt-apps/types/index.ts` - Expanded `ComponentLanguage` type
- `features/prompt-apps/components/CreatePromptAppForm.tsx` - New apps use `'tsx'`
- `features/prompt-apps/components/PromptAppEditor.tsx` - Fallback changed to `'tsx'`

**What this does:**
- ✅ New prompt apps will be created with `component_language = 'tsx'`
- ✅ Type system now supports: `'tsx' | 'jsx' | 'typescript' | 'javascript' | 'html' | 'react'` (legacy)
- ✅ Better type safety and clearer intent

## Database Migration (Optional)

While not strictly necessary (thanks to the backward compatibility layer), you can update existing records:

### Option A: Using the SQL Script

```bash
# From your database tool (pgAdmin, DBeaver, psql, etc.)
# Run: database/migrations/migrate_react_to_tsx.sql
```

### Option B: Manual Update

```sql
UPDATE prompt_apps
SET component_language = 'tsx'
WHERE component_language = 'react';
```

### If You Encounter Trigger Errors

If you see errors about triggers when trying to update:

```sql
-- 1. Disable triggers temporarily
ALTER TABLE prompt_apps DISABLE TRIGGER ALL;

-- 2. Run the update
UPDATE prompt_apps
SET component_language = 'tsx'
WHERE component_language = 'react';

-- 3. Re-enable triggers
ALTER TABLE prompt_apps ENABLE TRIGGER ALL;
```

To see what triggers exist:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'prompt_apps';
```

## Valid Language Identifiers

For future reference, here are the valid language identifiers:

### React/JavaScript/TypeScript
- `tsx` - **PREFERRED for React with TypeScript**
- `jsx` - React with JavaScript
- `typescript` - Pure TypeScript (no JSX)
- `javascript` - Pure JavaScript (no JSX)

### Other Common Languages
- `html` - HTML
- `css` - CSS
- `json` - JSON
- `markdown` or `md` - Markdown
- `bash` or `shell` - Shell scripts
- `sql` - SQL
- `python` or `py` - Python
- `diff` - Diff/patch files

## Testing

After applying the fix:

1. ✅ **Existing apps with 'react'**: Should display with TSX highlighting
2. ✅ **New apps**: Will be created with 'tsx'
3. ✅ **Editing existing apps**: Code editor will use proper language
4. ✅ **AI Code Editor**: Will receive correct language context

## Files Changed

1. **components/mardown-display/code/CodeBlock.tsx**
   - Added `mapLanguageForPrism()` function
   - Maps 'react' → 'tsx' automatically

2. **features/prompt-apps/types/index.ts**
   - Expanded `ComponentLanguage` type
   - Added documentation for each language option

3. **features/prompt-apps/components/CreatePromptAppForm.tsx**
   - Changed default from `'react'` to `'tsx'`

4. **features/prompt-apps/components/PromptAppEditor.tsx**
   - Updated fallback values from `|| 'jsx'` to `|| 'tsx'`

## Summary

- ✅ **Immediate**: All existing code now displays with proper syntax highlighting
- ✅ **Future**: New apps use the correct language identifier
- ✅ **Optional**: Database migration to clean up legacy data
- ✅ **Zero Breaking Changes**: Everything is backward compatible

No user-facing changes required - everything works seamlessly! 🎉

