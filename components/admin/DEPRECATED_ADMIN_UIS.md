# Deprecated Admin UIs

The following admin components were built for the **OLD** `system_prompts` + `system_prompt_functionality_configs` schema and are now **DEPRECATED** after the schema consolidation.

## Files to be Replaced

1. **ConvertToSystemPromptModal.tsx** - Uses old `useFunctionalityConfigs` hook
2. **FunctionalityConfigsManager.tsx** - Manages deprecated `system_prompt_functionality_configs` table
3. **GeneratePromptForSystemModal.tsx** - References old schema fields
4. **SystemPromptsManager.tsx** - Uses old schema extensively

## New Schema Structure

The new consolidated schema uses:
- `system_prompts_new` table with:
  - `prompt_id` (instead of `system_prompt_id`)
  - `label` (instead of `name`)
  - `category_id` (FK to categories, replaces `functionality_id`)
  - `icon_name`, `prompt_snapshot`, etc.
  
- `system_prompt_categories_new` table with:
  - `category_id` (human-readable ID)
  - `placement_type` (determines where prompts appear)
  - `parent_category_id` (for hierarchy)
  - `label`, `icon_name`, `color`, etc.

## Required New Admin UIs

1. **New System Prompts Manager**
   - Manage `system_prompts_new` entries
   - CRUD for prompts
   - Connect prompts to categories
   - View hierarchical category structure
   
2. **Category Manager** (already exists: `SystemPromptCategoriesManager.tsx`)
   - ✅ Already updated for new schema
   
3. **Convert to System Prompt Modal** (needs rewrite)
   - Select category (not functionality)
   - Generate `prompt_id` from label
   - Create in `system_prompts_new` table

## Migration Status

- ✅ Database migration created (`consolidate_system_prompts_schema.sql`)
- ✅ New `_new` tables created and populated
- ✅ Frontend hooks updated (`useSystemPrompts`, `useSystemPromptCategories`)
- ✅ Service layer updated (`system-prompts-service.ts`)
- ✅ `UnifiedContextMenu` updated for new schema
- ❌ Admin UIs need complete rewrite (marked as TODO #5)

## Action Items

Until new admin UIs are built, these files will have linter errors. Options:
1. **Recommended**: Create new admin UIs for new schema (TODO #5)
2. **Temporary**: Comment out deprecated files to clear linter errors
3. **Keep**: Leave as-is until new UIs are ready (linter errors present)

## Related Tasks

- TODO #5: Create new SystemPromptsAdminManager using new schema
- TODO #8: Uncomment table swap in migration (rename _new tables)
- TODO #9: Delete deprecated files and components

