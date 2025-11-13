# 🎯 System Prompts V2: Database-Driven Visual Hierarchy

## ✅ What's Been Created

### 1. **Comprehensive Plan** (`SYSTEM_PROMPTS_DATABASE_PLAN.md`)
- Complete analysis of current vs. desired architecture
- 3-table design (categories, functionalities, prompts)
- Visual hierarchy matching Content Blocks quality
- Migration strategy and timeline
- Code changes roadmap

### 2. **Migration File** (`migrations/00XX_system_prompts_database_v2.sql`)
- Creates `system_prompt_categories` table (visual organization)
- Creates `system_prompt_functionalities` table (moves hardcoded defs to DB)
- Adds foreign key constraint to `system_prompts`
- Seeds 4 categories with icons and colors
- Migrates 18 functionalities from hardcoded TypeScript to database
- Creates helper view for easy querying
- Validates existing data

---

## 🎨 What This Achieves

### **Before** (Current State)
```
AI Tools Menu:
  Explain (flat)
  Summarize (flat)
  Translate (flat)
  Fix Code (flat)
  ... (no visual hierarchy, no icons, no colors)
```

### **After** (With Migration)
```
AI Tools Menu:
  📄 Text Operations (blue)
    ├── Explain Text
    ├── Summarize
    ├── Translate
    ├── Improve Writing
    └── Extract Key Points

  💻 Code Tools (purple)
    ├── Analyze Code
    ├── Fix Code
    └── Refactor Code

  ✨ Content Generation (green)
    ├── Content Expander
    ├── Generate Content
    ├── Create Flashcards
    └── Create Quiz

  ⚡ Utilities (yellow)
    ├── Search Web
    ├── Get Ideas
    └── Custom
```

---

## 📊 Database Architecture

### **New Tables:**

```sql
system_prompt_categories
  ├── category_id (text-operations, code-tools, etc.)
  ├── label, description
  ├── icon_name (Lucide icon)
  ├── color (Tailwind class)
  └── sort_order, is_active

system_prompt_functionalities
  ├── id (explain-text, fix-code, etc.)
  ├── name, description
  ├── category_id → references categories
  ├── icon_name (optional specific icon)
  ├── required_variables, optional_variables
  ├── default_placement_types
  └── examples, sort_order, is_active

system_prompts (existing, updated)
  ├── functionality_id → FK to functionalities
  └── (all other fields remain the same)
```

### **Relationships:**
```
Categories (1) ←→ (N) Functionalities (1) ←→ (N) System Prompts
```

---

## 🚀 Next Steps

### **Step 1: Review the Plan** (5 minutes)
```bash
# Read the comprehensive plan
cat SYSTEM_PROMPTS_DATABASE_PLAN.md
```

### **Step 2: Run the Migration** (2 minutes)
```bash
# Option A: Supabase CLI
supabase db push

# Option B: SQL Editor (copy/paste migration file content)
# Go to Supabase Dashboard → SQL Editor → Paste migration → Run

# The migration will:
# - Create 2 new tables
# - Seed 4 categories
# - Migrate 18 functionalities
# - Update existing system_prompts
# - Create a helper view
```

### **Step 3: Verify Data** (3 minutes)
```sql
-- Check categories (should see 4)
SELECT category_id, label, icon_name, color, sort_order 
FROM system_prompt_categories 
ORDER BY sort_order;

-- Check functionalities (should see 18)
SELECT id, name, category_id, required_variables, sort_order 
FROM system_prompt_functionalities 
ORDER BY category_id, sort_order;

-- Check the view (see full hierarchy)
SELECT functionality_name, category_label, category_icon, category_color
FROM system_prompts_with_hierarchy
LIMIT 10;
```

### **Step 4: Code Updates** (Optional - Next Session)
After migration is confirmed working, update the TypeScript code:

1. **Create Hook:**
   - `hooks/useSystemPromptFunctionalities.ts`
   - Similar to `useContentBlocks`
   - Fetches categories + functionalities from database

2. **Update UnifiedContextMenu:**
   - Use new hook instead of hardcoded grouping
   - Render with visual hierarchy (icons, colors)

3. **Create Component:**
   - `components/system-prompts/DynamicAIToolsSection.tsx`
   - Similar to `DynamicContextMenuSection`
   - Renders categories with Lucide icons and Tailwind colors

4. **Create Config File:**
   - `config/system-prompts.ts`
   - Fallback static data if database fails
   - Similar pattern to `config/content-blocks.ts`

---

## 💡 Benefits of This Approach

### ✅ **No Duplication**
- Single source of truth: database
- Categories define organization
- Functionalities define behavior
- System prompts link to both

### ✅ **Visual Consistency**
- Same pattern as Content Blocks
- Icons and colors in database
- Easy to customize per category
- Professional hierarchy rendering

### ✅ **Easy Management**
- Add new functionality → Just insert DB record
- Change icon/color → Just update category
- Reorder items → Just update sort_order
- No code changes needed

### ✅ **Scalable**
- Admin UI can manage everything
- No hardcoded lists to maintain
- Can add subcategories later
- Flexible metadata field for future needs

### ✅ **Backward Compatible**
- Existing system_prompts table unchanged (mostly)
- Foreign key constraint ensures data integrity
- Migration validates existing data
- Fallback to static data if DB fails

---

## 📁 What's Different from Content Blocks?

| Feature | Content Blocks | System Prompts |
|---------|----------------|----------------|
| **Storage** | Blocks in DB, categories in DB | Prompts in DB, functionalities in DB, categories in DB |
| **Purpose** | Insert text templates | Execute AI prompts with variable resolution |
| **Complexity** | Simple templates | Complex: variables, execution, modals |
| **Categories** | Structure, Formatting, Special | Text Ops, Code Tools, Content Gen, Utilities |
| **Admin** | ContentBlocksManager | (To be built: FunctionalitiesManager) |

### **Key Insight:**
Content Blocks = **What to insert**  
System Prompts = **What to do with variables**

Both now share:
- Database-driven categories with visual metadata
- Hierarchical organization
- Icons and colors
- Admin-manageable

---

## 🎯 Current Workflow (After Migration)

### **User Creates System Prompt:**
1. User creates a prompt with variables
2. Clicks "Make Global System Prompt"
3. **Modal shows functionalities from database** (not hardcoded!)
4. Compatible functionalities shown first (based on variables)
5. User selects functionality
6. System validates & creates `system_prompts` record

### **User Right-Clicks in Note:**
1. UnifiedContextMenu loads
2. **Fetches categories from DB**
3. **Fetches functionalities from DB**
4. **Joins with system_prompts**
5. **Renders with icons, colors, hierarchy**
6. User clicks → Executes prompt

---

## 🔍 What to Check After Migration

### **Database:**
```sql
-- 1. Categories (should have 4)
SELECT * FROM system_prompt_categories ORDER BY sort_order;

-- 2. Functionalities (should have 18)
SELECT * FROM system_prompt_functionalities ORDER BY category_id, sort_order;

-- 3. Existing prompts still valid?
SELECT id, name, functionality_id 
FROM system_prompts 
WHERE functionality_id NOT IN (SELECT id FROM system_prompt_functionalities);
-- (Should return 0 rows)
```

### **Behavior:**
- Existing system prompts still work?
- ConvertToSystemPromptModal still shows functionalities?
- UnifiedContextMenu still renders AI Tools?

---

## ⚠️ Important Notes

### **Migration is Safe:**
- Uses `IF NOT EXISTS` (won't break if run twice)
- Uses `ON CONFLICT DO UPDATE` (upserts, not duplicates)
- Validates existing data before constraints
- Sets invalid `functionality_id` to NULL (doesn't delete prompts)

### **No Breaking Changes:**
- Existing code still works (uses hardcoded SYSTEM_FUNCTIONALITIES)
- Migration ADDS new tables, doesn't remove old structure
- Foreign key is nullable (existing prompts still valid)
- Can update code at your own pace

### **Rollback Plan:**
If needed, you can rollback by:
```sql
DROP VIEW IF EXISTS system_prompts_with_hierarchy;
ALTER TABLE system_prompts DROP CONSTRAINT IF EXISTS fk_system_prompts_functionality;
DROP TABLE IF EXISTS system_prompt_functionalities CASCADE;
DROP TABLE IF EXISTS system_prompt_categories CASCADE;
```

---

## 📝 Summary

| Item | Status |
|------|--------|
| Plan Document | ✅ Created |
| Migration File | ✅ Created |
| Database Schema | ✅ Ready to apply |
| Seed Data | ✅ Included in migration |
| Code Updates | ⏭️ After migration confirmed |
| Admin UI | ⏭️ Future enhancement |

---

## 🚦 Decision Point

**Ready to run the migration?**

✅ **YES** → Run the migration file and test
❌ **NO** → Review the plan, ask questions, request changes

**The migration is designed to be:**
- Non-destructive
- Reversible
- Safe to run in development
- Compatible with existing system

---

**Status:** 🟢 Ready for Migration - Waiting for Your Approval

