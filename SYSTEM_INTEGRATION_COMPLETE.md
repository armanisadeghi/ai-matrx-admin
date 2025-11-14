# AI Matrx System Integration Documentation

## Complete Database-Driven AI Tools System

This document outlines the complete, integrated system for managing AI tools, including the three admin interfaces, the unified context menu, and how everything connects in the Notes feature.

---

## System Architecture

### Database Tables

#### 1. `system_prompt_categories`
Organizes functionalities into visual categories (e.g., "Text Operations", "Code Operations").

**Columns:**
- `id` (uuid, PK)
- `category_id` (text, unique identifier)
- `label` (text) - Display name
- `description` (text, nullable)
- `icon_name` (text) - Lucide icon name
- `color` (text) - Color for UI display
- `sort_order` (integer)
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamps)

**Example:**
```json
{
  "category_id": "text-operations",
  "label": "Text Operations",
  "icon_name": "FileText",
  "color": "blue",
  "sort_order": 1
}
```

---

#### 2. `system_prompt_functionality_configs`
Defines individual functionalities with their display properties and variable requirements.

**Columns:**
- `id` (uuid, PK)
- `functionality_id` (text, unique) - e.g., "explain-text", "fix-code"
- `category_id` (uuid, FK → `system_prompt_categories`)
- `label` (text) - Display name
- `description` (text, nullable)
- `icon_name` (text) - Lucide icon name
- `sort_order` (integer)
- `is_active` (boolean)
- `required_variables` (text[]) - **CRITICAL**: Variables that MUST be in the prompt
- `optional_variables` (text[]) - Variables that MAY be in the prompt
- `placement_types` (text[]) - Where this can appear: `context-menu`, `card`, `button`, etc.
- `examples` (text[], nullable)
- `created_at`, `updated_at` (timestamps)

**Example:**
```json
{
  "functionality_id": "explain-text",
  "category_id": "uuid-of-text-operations",
  "label": "Explain Text",
  "icon_name": "MessageCircleQuestion",
  "required_variables": ["content_to_explain"],
  "optional_variables": ["context", "audience_level"],
  "placement_types": ["context-menu", "card"]
}
```

---

#### 3. `system_prompts`
Connects functionality configs to actual AI prompts, creating executable system prompts.

**Key Columns:**
- `id` (uuid, PK)
- `system_prompt_id` (text, unique) - e.g., "explain-text-basic"
- `name` (text) - Display name
- `description` (text, nullable)
- `functionality_id` (text) - References `system_prompt_functionality_configs.functionality_id`
- `source_prompt_id` (uuid, nullable, FK → `prompts`) - The actual AI prompt
- `prompt_snapshot` (jsonb) - Snapshot of the prompt for execution
- `placement_type` (text) - `context-menu`, `card`, `button`, etc.
- `placement_settings` (jsonb) - Settings like `allowChat`, `allowInitialMessage`
- `category` (text, nullable)
- `subcategory` (text, nullable)
- `is_active` (boolean)
- `status` (text) - `draft`, `published`, etc.
- `created_at`, `updated_at` (timestamps)

**Example:**
```json
{
  "system_prompt_id": "explain-text-basic",
  "name": "Explain Text",
  "functionality_id": "explain-text",
  "source_prompt_id": "uuid-of-ai-prompt",
  "placement_type": "context-menu",
  "placement_settings": {
    "allowChat": true,
    "allowInitialMessage": false
  },
  "is_active": true
}
```

---

## Data Flow

### 1. Category Creation
**Admin UI:** `SystemPromptCategoriesManager` (`components/admin/SystemPromptCategoriesManager.tsx`)
- Creates/edits categories in `system_prompt_categories`
- Defines display properties: label, icon, color, sort order
- Hook: `useSystemPromptCategories` (`hooks/useSystemPromptCategories.ts`)

### 2. Functionality Configuration
**Admin UI:** `FunctionalityConfigsManager` (`components/admin/FunctionalityConfigsManager.tsx`)
- Creates/edits functionality definitions in `system_prompt_functionality_configs`
- Assigns functionality to a category
- Defines required/optional variables (CRITICAL for validation)
- Defines placement types (where it can appear)
- Hook: `useFunctionalityConfigs` (`hooks/useFunctionalityConfigs.ts`)

### 3. System Prompt Creation
**Admin UI:** `SystemPromptsManager` (`components/admin/SystemPromptsManager.tsx`)
- Links a functionality config to an AI prompt
- Creates entries in `system_prompts`
- Validates that the AI prompt has all required variables
- Hook: `useSystemPrompts` / `useAllSystemPrompts` (`hooks/useSystemPrompts.ts`)

**Two Creation Paths:**
1. **From AI Prompt → System Prompt:**
   - User has an existing AI prompt
   - Opens `ConvertToSystemPromptModal` (from prompts grid)
   - Selects functionality, placement type, category
   - Validates variables match
   - Creates system prompt

2. **From System Prompt → AI Prompt:**
   - Admin creates a placeholder system prompt
   - Uses `SelectPromptModal` to choose an AI prompt
   - System validates compatibility
   - Links the prompt

### 4. Frontend Display
**Component:** `UnifiedContextMenu` (`components/unified/UnifiedContextMenu.tsx`)

**Hooks Used:**
- `useContentBlocks()` - Fetches content block templates
- `useContextMenuPrompts()` - Fetches system prompts for `placement_type: 'context-menu'`
- `useFunctionalityConfigsByCategory()` - Fetches functionality configs grouped by category

**Display Logic:**
```typescript
// 1. Fetch functionality configs grouped by category
const { configsByCategory } = useFunctionalityConfigsByCategory({ activeOnly: true });

// 2. Fetch system prompts for context menu
const { systemPrompts } = useContextMenuPrompts();

// 3. Match system prompts to their functionality configs
const aiToolsWithConfigs = Object.entries(configsByCategory).map(([categoryName, { category, configs }]) => {
  const categoryPrompts = configs.map(config => {
    const matchingPrompt = systemPrompts.find(
      p => p.functionality_id === config.functionality_id
    );
    return { config, systemPrompt: matchingPrompt };
  }).filter(item => item.systemPrompt);
  
  return { category, configs: categoryPrompts };
});

// 4. Render hierarchically
// Category (e.g., "Text Operations")
//   └─ Functionality (e.g., "Explain Text")
//        └─ Executes system prompt
```

---

## Integration in Notes Feature

**Component:** `NoteEditor` (`features/notes/components/NoteEditor.tsx`)

### Dynamic Import (Performance)
```typescript
const UnifiedContextMenu = dynamic(
  () => import('@/components/unified').then(mod => ({ default: mod.UnifiedContextMenu })),
  { ssr: false }
);
```

### Integration for Plain Text Editor
```tsx
<UnifiedContextMenu
  getTextarea={() => textareaRef.current}
  uiContext={{
    context: localContent,
    editorContent: localContent,
    fullContent: localContent,
  }}
  isEditable={true}
  onTextReplace={(newText) => {
    // Replace selected text
  }}
  onTextInsertBefore={(text) => {
    // Insert before selection
  }}
  onTextInsertAfter={(text) => {
    // Insert after selection
  }}
  onContentInserted={() => {
    // Content block was inserted
  }}
>
  <Textarea ref={textareaRef} ... />
</UnifiedContextMenu>
```

### Variable Resolution
When user right-clicks and selects an AI tool:
1. `UnifiedContextMenu` captures selected text and context
2. Creates `UIContext` object:
   ```typescript
   {
     selection: selectedText,
     text: selectedText,
     content: selectedText,
     selected_text: selectedText,
     content_to_explain: selectedText, // Maps to required_variables
     current_code: selectedText,
     context: fullContent,
     editorContent: fullContent
   }
   ```
3. `PromptContextResolver.resolve()` maps UI context to prompt variables
4. Validates that all `required_variables` are resolvable
5. Executes prompt with resolved variables

---

## Admin Workflows

### Complete Workflow: Create a New AI Tool

#### Step 1: Create Category (if needed)
**Page:** `/administration/system-prompt-categories`
1. Click "Add Category"
2. Fill in:
   - Name: "Educational Tools"
   - Description: "AI tools for learning and teaching"
   - Icon: "Lightbulb"
   - Color: "indigo"
   - Sort Order: 6
3. Save

#### Step 2: Create Functionality Config
**Page:** `/administration/functionality-configs`
1. Click "Add Config"
2. Fill in:
   - Functionality ID: `explain-concept`
   - Category: Select "Educational Tools"
   - Display Label: "Explain Concept"
   - Description: "Explain a concept in simple terms"
   - Icon: "Lightbulb"
   - Sort Order: 1
   - Active: ✓
3. **Important:** This step creates the "slot" but doesn't define variables yet
4. Save

#### Step 3: Define Variables (via migration or API)
**Note:** Currently, `required_variables` and `optional_variables` must be set via SQL:
```sql
UPDATE system_prompt_functionality_configs
SET 
  required_variables = ARRAY['concept_name', 'context'],
  optional_variables = ARRAY['audience_level', 'detail_level'],
  placement_types = ARRAY['context-menu', 'card']
WHERE functionality_id = 'explain-concept';
```

**TODO:** Add these fields to the `FunctionalityConfigsManager` UI

#### Step 4: Create AI Prompt
**Page:** `/ai/prompts`
1. Create a new prompt with variables `{{concept_name}}`, `{{context}}`
2. Add optional variables: `{{audience_level}}`, `{{detail_level}}`
3. Save prompt

#### Step 5: Convert to System Prompt
**Page:** `/ai/prompts` (from grid card)
1. Click "Convert to System Prompt" on the prompt card
2. Wizard Step 1: Select functionality (`explain-concept`)
3. Wizard Step 2: Select placement type (`context-menu`)
4. Wizard Step 3: Review and confirm
5. System validates variables match
6. Creates system prompt in `system_prompts` table

#### Step 6: Verify in Context Menu
1. Go to Notes
2. Type some text
3. Right-click
4. Navigate: AI Tools → Educational Tools → Explain Concept
5. Tool executes!

---

## Key Files Reference

### Admin Interfaces
- `components/admin/SystemPromptCategoriesManager.tsx` - Manage categories
- `components/admin/FunctionalityConfigsManager.tsx` - Manage functionality configs
- `components/admin/SystemPromptsManager.tsx` - Manage system prompts (connections)
- `components/admin/ConvertToSystemPromptModal.tsx` - Convert AI prompt → system prompt
- `components/admin/SelectPromptModal.tsx` - Link AI prompt to placeholder system prompt

### Hooks
- `hooks/useSystemPromptCategories.ts` - Fetch categories
- `hooks/useFunctionalityConfigs.ts` - Fetch functionality configs
  - `useFunctionalityConfigsByCategory()` - Grouped by category
- `hooks/useSystemPrompts.ts` - Fetch system prompts
  - `useContextMenuPrompts()` - For context menus
  - `useCardPrompts()` - For cards
  - `useButtonPrompts()` - For buttons
  - `useAllSystemPrompts()` - For admin (includes inactive)

### Context Menu & Integration
- `components/unified/UnifiedContextMenu.tsx` - Main context menu combining Content Blocks, AI Tools, Quick Actions
- `features/notes/components/NoteEditor.tsx` - Notes integration example

### Services & Helpers
- `lib/services/functionality-helpers.ts` - Database-driven helper functions
  - `getFunctionalityById()` - Fetch single config
  - `getAllFunctionalities()` - Fetch all configs
  - `validatePromptForFunctionality()` - Check variable compatibility
- `lib/services/prompt-context-resolver.ts` - Resolves UI context → prompt variables

### API Routes
- `app/api/prompts/[id]/convert-to-system-prompt/route.ts` - Convert prompt to system prompt
- `app/api/system-prompts/[id]/link-prompt/route.ts` - Link prompt to placeholder

---

## Database Schema Migrations

### Applied Migrations
1. `migrations/00XX_system_prompts_database_v2.sql` - Creates base tables
2. `migrations/fix_functionality_configs_table.sql` - Renames table, fixes column names
3. `migrations/complete_functionality_configs.sql` - Adds `required_variables`, `optional_variables`, `placement_types`, `examples`

### Seed Data
- `scripts/seed-system-prompts-v2-FIXED.sql` - Populates initial categories and functionality configs

---

## Validation Logic

### Variable Validation (Critical!)
When linking an AI prompt to a system prompt:

1. **Extract variables from AI prompt:**
   ```typescript
   const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
   const variables = extractVariablesFromPrompt(promptSnapshot);
   ```

2. **Fetch functionality config:**
   ```typescript
   const functionality = await getFunctionalityById(functionalityId);
   ```

3. **Validate required variables:**
   ```typescript
   const missing = functionality.required_variables.filter(v => !variables.includes(v));
   if (missing.length > 0) {
     throw new Error(`Missing required variables: ${missing.join(', ')}`);
   }
   ```

4. **Allow extra variables:**
   - Extra variables are OK (they may have defaults in the prompt)
   - Only `required_variables` must be present

---

## UI Context Mapping

The `PromptContextResolver` maps UI context to prompt variables:

### Standard Mappings
| UI Context Key | Common Prompt Variables |
|----------------|-------------------------|
| `selection`, `text`, `content`, `selected_text` | `text`, `content_to_explain`, `current_code` |
| `context`, `editorContent`, `fullContent` | `context`, `full_content` |
| Custom keys | Direct mapping |

### Example Resolution
```typescript
// UI provides:
uiContext = {
  selection: "Hello world",
  context: "Full note content..."
}

// Functionality requires:
required_variables = ["content_to_explain", "context"]

// Resolver maps:
{
  content_to_explain: "Hello world", // from selection/text/content
  context: "Full note content..."     // direct match
}
```

---

## No Hardcoded Definitions!

### Verification
```bash
# Search for hardcoded definitions - NONE found in source code!
grep -r "SYSTEM_FUNCTIONALITIES" --include="*.ts" --include="*.tsx" --exclude-dir="migrations" .
# Result: No matches (only in migrations and docs)

grep -r "from.*system-prompt-functionalities" .
# Result: No matches
```

All functionality definitions are now in the database. The system is fully dynamic!

---

## Future Enhancements

### Short Term
1. Add `required_variables`/`optional_variables` fields to `FunctionalityConfigsManager` UI
2. Add variable validation preview in admin UI
3. Add bulk import/export for functionality configs

### Medium Term
1. Add versioning for functionality configs
2. Add A/B testing for system prompts
3. Add usage analytics per functionality

### Long Term
1. AI-assisted functionality creation
2. Auto-generate required variables from prompt analysis
3. Smart variable mapping suggestions

---

## Troubleshooting

### Common Issues

#### 1. "Cannot execute: Missing variables"
**Cause:** AI prompt doesn't have all required variables for the functionality.
**Fix:** 
- Check `system_prompt_functionality_configs.required_variables` for the functionality
- Verify AI prompt has `{{variable_name}}` for each required variable
- Update prompt or change functionality assignment

#### 2. Context menu item doesn't appear
**Cause:** System prompt might be inactive or placeholder.
**Fix:**
- Check `system_prompts.is_active = true`
- Check `system_prompts.prompt_snapshot.placeholder = false`
- Verify `system_prompts.placement_type = 'context-menu'`

#### 3. Functionality config not showing in admin
**Cause:** Category might be inactive.
**Fix:**
- Check `system_prompt_categories.is_active = true`
- Verify join to `system_prompt_functionality_configs.category_id`

#### 4. Variables not resolving correctly
**Cause:** UI context keys don't match expected names.
**Fix:**
- Check `PromptContextResolver.resolve()` mapping logic
- Add custom key mappings if needed
- Verify `uiContext` being passed to `UnifiedContextMenu`

---

## Summary

This system provides a complete, database-driven solution for managing AI tools throughout the application. The three admin interfaces work together seamlessly:

1. **Categories** organize functionalities visually
2. **Functionality Configs** define what tools exist and their requirements
3. **System Prompts** connect functionalities to actual AI prompts

The `UnifiedContextMenu` brings it all together, providing a consistent interface across the application. The Notes feature demonstrates full integration with text manipulation, content blocks, and AI tools all working in harmony.

**Key Achievement:** Zero hardcoded definitions! Everything is dynamic, manageable, and scalable.

---

**Last Updated:** 2025-11-14
**Version:** 1.0 (Complete Integration)

