# System Prompts Database Transformation Plan
## Making AI Tools as Beautiful and Manageable as Content Blocks

**Goal:** Transform the hardcoded System Prompts system into a fully database-driven, visually polished system matching the quality of Content Blocks.

---

## Current State Analysis

### **Content Blocks Architecture** ✅ (What We Want to Match)
```
content_blocks table
  ├── block_id, label, description
  ├── icon_name (Lucide), category, subcategory
  ├── template, sort_order, is_active
  └── Rendering: DynamicContextMenuSection with visual hierarchy

content_block_categories table
  ├── category_id, label, icon_name
  ├── color (Tailwind class)
  ├── sort_order, is_active
  └── Visual presentation metadata

content_block_subcategories table
  ├── category_id, subcategory_id, label
  ├── icon_name, sort_order, is_active
  └── Hierarchical organization
```

### **System Prompts Architecture** ❌ (What Needs Improvement)
```
system_prompts table
  ├── name, description, functionality_id
  ├── placement_type, category, subcategory
  ├── prompt_snapshot (JSONB)
  ├── source_prompt_id (links to prompts table)
  └── NO visual metadata (icons, colors, hierarchy)

SYSTEM_FUNCTIONALITIES (hardcoded TypeScript file)
  ├── id, name, description
  ├── requiredVariables, optionalVariables
  ├── placementTypes, examples
  └── NO database, NO visual metadata, NO admin UI
```

---

## The Problem

1. **Hardcoded Functionalities**: `SYSTEM_FUNCTIONALITIES` is a TypeScript constant, not database
2. **No Visual Metadata**: No icons, colors, or styling for categories
3. **No Hierarchy**: Flat list rendering, not organized like Content Blocks
4. **No Admin UI**: Can't manage functionalities like you manage content blocks
5. **Duplicate Logic**: Content Blocks and System Prompts should use the same pattern

---

## The Solution: 3-Table Architecture

### **Table 1: `system_prompt_categories`**
**Purpose:** Visual organization (like `content_block_categories`)

```sql
CREATE TABLE system_prompt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL UNIQUE,  -- 'text-operations', 'code-tools', 'content-generation'
  label TEXT NOT NULL,                -- 'Text Operations', 'Code Tools', 'Content Generation'
  description TEXT,
  icon_name TEXT NOT NULL,            -- 'FileText', 'Code', 'Sparkles' (Lucide icons)
  color TEXT NOT NULL,                -- 'text-blue-600', 'text-purple-600' (Tailwind classes)
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Examples:**
| category_id | label | icon_name | color | sort_order |
|-------------|-------|-----------|-------|------------|
| text-operations | Text Operations | FileText | text-blue-600 | 0 |
| code-tools | Code Tools | Code | text-purple-600 | 1 |
| content-generation | Content Generation | Sparkles | text-green-600 | 2 |
| utilities | Utilities | Zap | text-yellow-600 | 3 |

---

### **Table 2: `system_prompt_functionalities`**
**Purpose:** Move hardcoded functionalities to database

```sql
CREATE TABLE system_prompt_functionalities (
  id TEXT PRIMARY KEY,                -- 'explain-text', 'fix-code', 'summarize-text'
  name TEXT NOT NULL,                 -- 'Explain Text', 'Fix Code', 'Summarize Text'
  description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES system_prompt_categories(category_id),
  icon_name TEXT,                     -- Optional: specific icon for this functionality
  required_variables TEXT[] DEFAULT '{}',
  optional_variables TEXT[] DEFAULT '{}',
  default_placement_types TEXT[] DEFAULT '{}',
  examples TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Examples:**
| id | name | category_id | required_variables | icon_name |
|----|------|-------------|-------------------|-----------|
| explain-text | Explain Text | text-operations | ['content_to_explain'] | HelpCircle |
| fix-code | Fix Code | code-tools | ['current_code'] | Wrench |
| summarize-text | Summarize | text-operations | ['text'] | FileDown |

---

### **Table 3: `system_prompts`** (Existing, Minor Updates)
**Purpose:** Links prompts to functionalities (already works)

```sql
-- Already exists, just add foreign key constraint
ALTER TABLE system_prompts
  ADD CONSTRAINT fk_functionality
  FOREIGN KEY (functionality_id)
  REFERENCES system_prompt_functionalities(id)
  ON DELETE SET NULL;

-- Optional: Remove redundant 'category' field since it's now in functionalities
ALTER TABLE system_prompts DROP COLUMN IF EXISTS category;
```

---

## Data Flow

```
User Creates Prompt
  ↓
Converts to System Prompt (via admin modal)
  ↓
Selects Functionality (from DB: system_prompt_functionalities)
  ↓
System validates variables match
  ↓
Saves to system_prompts table (with functionality_id)
  ↓
Context Menu Loads:
    1. Fetch system_prompts WHERE placement_type='context-menu'
    2. JOIN with functionalities
    3. JOIN with categories (for icons/colors)
    4. Render with DynamicContextMenuSection (like Content Blocks)
```

---

## Migration Strategy

### **Phase 1: Database Setup** (This Migration)
1. Create `system_prompt_categories` table
2. Create `system_prompt_functionalities` table
3. Add foreign key constraint to `system_prompts`
4. Seed categories (Text Operations, Code Tools, etc.)
5. Migrate hardcoded `SYSTEM_FUNCTIONALITIES` to database

### **Phase 2: Code Updates** (Next Step)
1. Create `useSystemPromptCategories` hook (like `useContentBlocks`)
2. Create `DynamicAIToolsSection` component (like `DynamicContextMenuSection`)
3. Update `UnifiedContextMenu` to use new rendering
4. Create config file `config/system-prompts.ts` (like `config/content-blocks.ts`)
5. Fallback to static data if DB fails

### **Phase 3: Admin UI** (After Testing)
1. Create Functionality Manager (like Content Blocks Manager)
2. Create Category Manager
3. Visual editor for icons/colors
4. Drag-and-drop sort order

---

## Visual Hierarchy (Goal)

**Before (Current):**
```
AI Tools
  ├── Explain (flat list)
  ├── Summarize (flat list)
  ├── Translate (flat list)
  ├── Fix Code (flat list)
  └── ... (no organization)
```

**After (Target):**
```
AI Tools
  ├── 📄 Text Operations (blue)
  │   ├── Explain Text
  │   ├── Summarize
  │   ├── Improve Writing
  │   └── Extract Key Points
  │
  ├── 💻 Code Tools (purple)
  │   ├── Fix Code
  │   ├── Refactor Code
  │   └── Analyze Code
  │
  ├── ✨ Content Generation (green)
  │   ├── Create Flashcards
  │   ├── Create Quiz
  │   └── Generate Ideas
  │
  └── ⚡ Utilities (yellow)
      ├── Search Web
      └── Get Ideas
```

---

## Benefits

✅ **Consistent Architecture**: Same pattern as Content Blocks
✅ **Database-Driven**: Easy to add/modify without code changes
✅ **Visual Hierarchy**: Icons, colors, organized categories
✅ **Admin UI**: Manage like Content Blocks
✅ **No Duplication**: Single source of truth
✅ **Scalable**: Add new categories/functionalities via DB
✅ **Professional**: Matches Content Blocks quality

---

## What Doesn't Change

- `system_prompts` table structure (mostly)
- Prompt creation/conversion flow
- Variable resolution logic (`PromptContextResolver`)
- Execution flow (`PromptRunnerModal`, `TextActionResultModal`)
- Context menu behavior

---

## Migration File Structure

```sql
-- 1. Create categories table
CREATE TABLE system_prompt_categories ...

-- 2. Create functionalities table
CREATE TABLE system_prompt_functionalities ...

-- 3. Add foreign key to system_prompts
ALTER TABLE system_prompts ADD CONSTRAINT ...

-- 4. Seed categories (4 categories)
INSERT INTO system_prompt_categories ...

-- 5. Migrate existing functionalities (20+ items)
INSERT INTO system_prompt_functionalities ...

-- 6. Update existing system_prompts (if any have invalid functionality_id)
-- This ensures all existing data remains valid
```

---

## Code Changes Needed (After Migration)

### **1. New Hook: `useSystemPromptFunctionalities`**
```typescript
export function useSystemPromptFunctionalities() {
  const [functionalities, setFunctionalities] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Fetch from database
  // Fallback to static if needed
  
  return { functionalities, categories, loading, error };
}
```

### **2. Update `UnifiedContextMenu`**
```typescript
// OLD: Hardcoded grouping
const groupedAITools = useMemo(() => {
  const groups: Record<string, any[]> = {};
  systemPrompts.forEach((prompt) => {
    const cat = prompt.category || 'other';
    groups[cat].push(prompt);
  });
  return groups;
}, [systemPrompts]);

// NEW: Database-driven with visual hierarchy
const { categories } = useSystemPromptCategories();
const groupedAITools = useMemo(() => {
  return categories.map(cat => ({
    ...cat,
    prompts: systemPrompts.filter(p => p.functionality?.category_id === cat.category_id)
  }));
}, [categories, systemPrompts]);
```

### **3. New Component: `DynamicAIToolsSection`**
```typescript
// Similar to DynamicContextMenuSection
export function DynamicAIToolsSection({
  category,
  prompts,
  onPromptSelect
}: DynamicAIToolsSectionProps) {
  const Icon = lucideIcons[category.icon_name];
  
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className={category.color}>
        <Icon className="h-4 w-4 mr-2" />
        {category.label}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {prompts.map(prompt => (
          <ContextMenuItem key={prompt.id} onSelect={() => onPromptSelect(prompt)}>
            {prompt.display_config?.label || prompt.name}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
```

---

## Timeline

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Create migration file | 30 min |
| 1 | Run migration | 5 min |
| 1 | Seed data | 15 min |
| 2 | Create hooks | 1 hour |
| 2 | Update components | 2 hours |
| 2 | Testing | 1 hour |
| 3 | Admin UI | 3 hours |
| **Total** | | **~8 hours** |

---

## Next Steps

1. ✅ Review this plan
2. ⏭️ Create migration file
3. ⏭️ Run migration + seed data
4. ⏭️ Update TypeScript code
5. ⏭️ Test in UnifiedContextMenu
6. ⏭️ Build admin UI

---

**Status:** 📋 Plan Complete - Ready for Implementation

