# Clean System Prompts Schema

## Overview

This document describes the **consolidated, hierarchical schema** for System Prompts - a clean structure that eliminates confusion and duplication from the previous two-table design.

---

## Why the Change?

### Previous Problems:
- ❌ **Two confusing tables** (`system_prompts` + `system_prompt_functionality_configs`)
- ❌ **No clear FK relationship** between them
- ❌ **Duplicate data** (name vs label, category in both places)
- ❌ **Placement type confusion** (singular vs plural, stored in wrong place)
- ❌ **Unnecessary complexity** (functionality_id mapping, orphaned records)

### New Solution:
- ✅ **Single source of truth** for each entity
- ✅ **Clear hierarchy**: placement_type → category → subcategory → prompt
- ✅ **Proper FK relationships** with CASCADE
- ✅ **Based on proven `content_blocks` pattern**
- ✅ **Placement type in category** (where it belongs)

---

## Database Schema

### Table 1: `system_prompt_categories`

**Purpose:** Hierarchical organization of prompts. Placement type determines where they appear in UI.

```sql
CREATE TABLE system_prompt_categories (
  id UUID PRIMARY KEY,
  category_id TEXT NOT NULL,              -- Human-readable ID (e.g., "text-operations")
  placement_type TEXT NOT NULL,           -- context-menu, card, button, etc.
  parent_category_id UUID NULL,           -- Self-referencing FK for subcategories
  label TEXT NOT NULL,                    -- Display name (e.g., "Text Operations")
  description TEXT NULL,
  icon_name TEXT NOT NULL,
  color TEXT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (placement_type, category_id),  -- Same name OK in different placements
  FOREIGN KEY (parent_category_id) REFERENCES system_prompt_categories(id)
);
```

**Key Features:**
- **Self-referencing FK** enables subcategories (parent_category_id → id)
- **Placement type stored here** (not in prompts!)
- **Same category_id can exist under different placements** (e.g., "text-operations" as context-menu AND button)
- **Top-level categories** have `parent_category_id = NULL`

**Example Data:**

| id | category_id | placement_type | parent_category_id | label | icon_name |
|----|-------------|----------------|-------------------|-------|-----------|
| uuid-1 | text-operations | context-menu | NULL | Text Operations | FileText |
| uuid-2 | code-operations | context-menu | NULL | Code Operations | Code |
| uuid-3 | debug-tools | context-menu | uuid-2 | Debug Tools | Bug |

---

### Table 2: `system_prompts`

**Purpose:** Individual AI tools with complete execution configuration.

```sql
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY,
  prompt_id TEXT NOT NULL UNIQUE,         -- Human-readable ID (e.g., "debug-and-fix")
  category_id UUID NOT NULL,              -- FK to system_prompt_categories
  label TEXT NOT NULL,                    -- Display name (e.g., "Debug & Fix")
  description TEXT NULL,
  icon_name TEXT NOT NULL,
  
  -- Execution data
  prompt_snapshot JSONB NOT NULL,         -- Complete config: {messages, settings, variables, defaults}
  source_prompt_id UUID NULL,             -- FK to prompts (for "refresh" feature)
  version INTEGER DEFAULT 1,
  
  -- Organization
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Publishing
  status TEXT DEFAULT 'published',
  published_by UUID NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Tracking
  last_updated_by UUID NULL,
  last_updated_at TIMESTAMPTZ NULL,
  update_notes TEXT NULL,
  
  -- Flexible
  tags TEXT[] DEFAULT '{}'::text[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (category_id) REFERENCES system_prompt_categories(id) CASCADE,
  FOREIGN KEY (source_prompt_id) REFERENCES prompts(id) SET NULL
);
```

**Key Features:**
- **Single human-readable ID** (`prompt_id` - no more UUID + TEXT confusion)
- **Placement type via category** (inherited from parent category)
- **Complete execution config in `prompt_snapshot`**
- **Optional source_prompt_id** for "refresh to latest" capability
- **Version auto-increments** when prompt_snapshot changes

**Example Data:**

| id | prompt_id | category_id | label | prompt_snapshot | source_prompt_id |
|----|-----------|-------------|-------|-----------------|------------------|
| uuid-a | debug-and-fix | uuid-3 | Debug & Fix | {messages: [...], settings: {...}} | uuid-prompt-1 |
| uuid-b | explain-text | uuid-1 | Explain Text | {messages: [...], settings: {...}} | uuid-prompt-2 |

---

## Hierarchy Structure

### For Context Menus (User-Visible):
```
Context Menu (right-click)
├─ Text Operations (category)
│  ├─ Explain Text (prompt)
│  ├─ Summarize (prompt)
│  └─ Translate (prompt)
└─ Code Operations (category)
   ├─ Debug Tools (subcategory)
   │  ├─ Debug & Fix (prompt)
   │  └─ Analyze Code (prompt)
   └─ Refactor Tools (subcategory)
      └─ Clean Code (prompt)
```

### For Buttons/Cards (Organization Only):
```
Buttons Section
├─ Quick Actions (category - not visible to user)
│  ├─ Quick Summarize (button)
│  └─ Quick Translate (button)
└─ Text Tools (category - not visible to user)
   └─ Improve Writing (button)
```

**Key Difference:**
- **Context menus**: Categories are **visible sections** in the menu
- **Buttons/Cards**: Categories are for **admin organization** only

---

## Data Relationships

### Placement Type → Category → Subcategory → Prompt

```
placement_type (stored in category)
    ↓
category (top-level, parent_category_id = NULL)
    ↓
subcategory (optional, parent_category_id = parent.id)
    ↓
system_prompt (category_id = category or subcategory)
```

### Foreign Keys:

1. **`system_prompt_categories.parent_category_id`** → `system_prompt_categories.id`
   - Creates hierarchy (subcategories)
   - CASCADE delete (if parent deleted, subcategories deleted)

2. **`system_prompts.category_id`** → `system_prompt_categories.id`
   - Assigns prompt to category/subcategory
   - CASCADE delete (if category deleted, prompts deleted)

3. **`system_prompts.source_prompt_id`** → `prompts.id`
   - Links to AI prompt for refresh capability
   - SET NULL (if prompt deleted, just remove link)

---

## The `prompt_snapshot` JSONB

**Contains everything needed to execute the prompt:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that explains text clearly."
    },
    {
      "role": "user",
      "content": "Explain this: {{content_to_explain}}"
    }
  ],
  "settings": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 500
  },
  "variables": ["content_to_explain", "context"],
  "variableDefaults": {
    "context": ""
  },
  "required_variables": ["content_to_explain"],
  "optional_variables": ["context"],
  "placeholder": false
}
```

**Why JSONB?**
- ✅ **Complete snapshot** of prompt at time of assignment
- ✅ **Doesn't break** if source prompt is deleted
- ✅ **Version control** built-in (version increments on change)
- ✅ **Can refresh** from source_prompt_id if needed

---

## How to Use

### 1. Create a Category

```sql
INSERT INTO system_prompt_categories (
  category_id,
  placement_type,
  label,
  description,
  icon_name,
  color,
  sort_order
) VALUES (
  'text-operations',
  'context-menu',
  'Text Operations',
  'AI tools for manipulating text',
  'FileText',
  'blue',
  1
);
```

### 2. Create a Subcategory (Optional)

```sql
INSERT INTO system_prompt_categories (
  category_id,
  placement_type,
  parent_category_id,
  label,
  icon_name,
  sort_order
) VALUES (
  'debug-tools',
  'context-menu',
  (SELECT id FROM system_prompt_categories WHERE category_id = 'code-operations'),
  'Debug Tools',
  'Bug',
  1
);
```

### 3. Create a System Prompt

```sql
INSERT INTO system_prompts (
  prompt_id,
  category_id,
  label,
  description,
  icon_name,
  prompt_snapshot,
  source_prompt_id
) VALUES (
  'explain-text',
  (SELECT id FROM system_prompt_categories WHERE category_id = 'text-operations'),
  'Explain Text',
  'Explains selected text in simple terms',
  'MessageCircleQuestion',
  '{
    "messages": [...],
    "settings": {...},
    "variables": ["content_to_explain"],
    "variableDefaults": {},
    "required_variables": ["content_to_explain"],
    "optional_variables": []
  }'::jsonb,
  'uuid-of-source-prompt'
);
```

### 4. Query the Hierarchy

```sql
-- Get all context menu items with hierarchy
SELECT 
  c.label AS category,
  sc.label AS subcategory,
  sp.label AS prompt,
  sp.prompt_id
FROM system_prompt_categories c
LEFT JOIN system_prompt_categories sc ON sc.parent_category_id = c.id
LEFT JOIN system_prompts sp ON sp.category_id = COALESCE(sc.id, c.id)
WHERE c.placement_type = 'context-menu' 
  AND c.parent_category_id IS NULL
  AND c.is_active = true
ORDER BY c.sort_order, sc.sort_order, sp.sort_order;
```

---

## Migration from Old Schema

The migration script (`consolidate_system_prompts_schema.sql`) handles:

1. ✅ **Creates new tables** with `_new` suffix
2. ✅ **Migrates data** from old `system_prompts` and `system_prompt_functionality_configs`
3. ✅ **Maps relationships** (functionality_id → category_id)
4. ✅ **Preserves all data** in `metadata` JSONB for reference
5. ✅ **Validates migration** (checks for orphans, shows counts)
6. ⏸️ **Rename tables** (commented out - run after verification)

**Steps to complete migration:**
1. Run the migration script
2. Verify data in `_new` tables
3. Test the new admin UI
4. Uncomment the RENAME section
5. Drop old backup tables when confident

---

## Admin UI Changes Needed

### Frontend Updates:

1. **Hooks** (`hooks/useSystemPrompts.ts`)
   - Update to fetch from new schema
   - Remove `useFunctionalityConfigs` (no longer needed)
   - Add `useSystemPromptCategories` with hierarchy support

2. **Admin Manager** (`ConsolidatedSystemPromptsManager.tsx`)
   - Show categories with placement_type
   - Support subcategory creation
   - Remove functionality_id references
   - Update to use prompt_id instead of system_prompt_id

3. **Context Menu** (`UnifiedContextMenu.tsx`)
   - Fetch categories filtered by placement_type = 'context-menu'
   - Build hierarchy from parent_category_id
   - Map prompts to categories via category_id FK

---

## Benefits of New Schema

### For Admins:
- ✅ **One place to manage** everything (no more two tables)
- ✅ **Clear hierarchy** visible in UI
- ✅ **Placement type obvious** (in category, not hidden)
- ✅ **No orphaned records** (CASCADE deletes)

### For Developers:
- ✅ **Single source of truth** per entity
- ✅ **Proper FK constraints** (referential integrity)
- ✅ **Self-documenting** (based on familiar content_blocks pattern)
- ✅ **Easy to query** (JOINs are straightforward)

### For Users:
- ✅ **Consistent organization** across placement types
- ✅ **Hierarchical menus** make sense
- ✅ **No missing/broken tools** (due to sync issues)

---

## Custom/Organization Prompts (Future)

The current schema is for **system-wide prompts** only. For custom/organization prompts:

### Separate Tables (Recommended):
- `organization_prompt_categories` (with organization_id FK)
- `organization_prompts` (with organization_id FK)
- `user_prompt_categories` (with user_id FK)
- `user_prompts` (with user_id FK)

**Why separate?**
- Different RLS policies (user/org-specific)
- Different lifecycle (can be deleted by users)
- Keeps system prompts pristine

---

## Summary

### The New Schema:
- **2 tables** instead of 3 (simpler)
- **Hierarchical** via self-referencing FK
- **Placement type in category** (not prompt)
- **Complete execution config** in prompt_snapshot
- **Proper FK constraints** with CASCADE
- **Based on proven pattern** (content_blocks)

### Next Steps:
1. ✅ Review migration script
2. ⏳ Run migration
3. ⏳ Update frontend hooks
4. ⏳ Update admin UI
5. ⏳ Test thoroughly
6. ⏳ Swap tables (rename)
7. ⏳ Drop old tables

---

**This is the foundation for a clean, scalable system prompts architecture!** 🎉

