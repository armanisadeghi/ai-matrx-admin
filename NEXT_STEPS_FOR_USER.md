# 🎯 Next Steps: Testing Your Database-Driven System Prompts

## ✅ What's Been Completed

I've successfully implemented the **simplified, database-driven system prompts architecture**! Here's what's ready:

### Core Infrastructure
1. ✅ Simplified `system_prompts` table (ran migration)
2. ✅ Seeded 21 placeholder system prompts (ran SQL script)
3. ✅ Created functionality definitions (`types/system-prompt-functionalities.ts`)
4. ✅ Created variable resolver service (`lib/services/prompt-context-resolver.ts`)
5. ✅ Updated all hooks and services to use new structure

### Database-Driven Components
1. ✅ `DynamicContextMenu` - loads menu items from database, shows "Coming Soon" placeholders
2. ✅ `DynamicCards` - loads cards from database, shows locked placeholders
3. ✅ `DynamicButtons` - loads buttons from database, shows disabled placeholders

### Admin Tools
1. ✅ Updated `ConvertToSystemPromptModal` - 3-step wizard with validation
2. ✅ Backend API validates prompt variables against functionality requirements

### Demo Page
1. ✅ Updated `execution-demo` page to use database-driven components
2. ✅ Shows example of right-click context menu (loaded from database)
3. ✅ Shows example of execution cards (loaded from database)

---

## 🧪 Testing Instructions

### Test 1: View Placeholders (Context Menu)

**Goal:** Verify all seeded menu items appear as "Coming Soon"

1. Go to: `/ai/prompts/experimental/execution-demo`
2. Click the "Matrx Actions" tab
3. **Right-click** anywhere in the text area
4. **Expected:**
   - Context menu appears with grouped items
   - Items organized by category (e.g., "Text Tools", "Code Helpers", etc.)
   - All items show "Coming Soon" badge
   - All items are disabled (greyed out)

**Screenshot Opportunity:** This demonstrates database-driven, placeholder-powered menus!

---

### Test 2: View Placeholders (Cards)

**Goal:** Verify seeded card placeholders appear as locked

1. Go to: `/ai/prompts/experimental/execution-demo`
2. Click the "System Prompts" tab
3. **Expected:**
   - Cards appear in a grid
   - Each card shows a lock icon
   - Each card has "Coming Soon" badge
   - Cards are not clickable

---

### Test 3: Create & Activate a Real System Prompt

**Goal:** Full flow from prompt creation to execution

#### Step 3a: Create a Prompt

1. Go to `/ai/prompts`
2. Click "New Prompt" or use an existing one
3. Create a prompt with these **exact variables**:
   ```
   {{title}}, {{description}}, {{context}}
   ```
4. Example prompt content:
   ```
   You are an educational assistant. The user is learning about "{{title}}".

   Brief description: {{description}}

   Please provide a comprehensive explanation of this topic, expanding on the description above. Include:
   - Key concepts and terminology
   - Historical context or background (if applicable)
   - Practical examples or applications
   - Common misconceptions
   - Further reading suggestions

   Full context:
   {{context}}

   Provide your explanation in a clear, engaging manner suitable for a student.
   ```
5. Test the prompt to ensure it works
6. Save the prompt

#### Step 3b: Convert to System Prompt

1. On your prompt card, click the **settings icon** (three dots)
2. Select **"Make Global System Prompt"**
3. **Step 1: Functionality**
   - Select: **"Content Expander Card"**
   - **Expected:** Green checkmark showing your variables match ✅
4. **Step 2: Placement**
   - System Prompt ID: `content-expander-cyrus` (or leave auto-generated)
   - Name: `Cyrus the Great Expander` (or whatever you like)
   - Placement Type: **Card**
   - Category: `educational`
   - Subcategory: (leave blank or add one)
   - Settings:
     - ✅ Allow Chat Mode (enable)
     - ❌ Allow Initial Message (disable)
     - ❌ Requires Selection (disable)
5. **Step 3: Confirm**
   - Review details
   - Click **"Create System Prompt"**
6. **Expected:** Success message, modal closes

#### Step 3c: Activate the System Prompt

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to find your new system prompt:
   ```sql
   SELECT id, system_prompt_id, name, is_active, status, functionality_id
   FROM public.system_prompts
   WHERE functionality_id = 'content-expander-card'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. Find the `content-expander-cyrus` entry (or whatever ID you used)
4. **Activate it:**
   ```sql
   UPDATE public.system_prompts
   SET is_active = true,
       status = 'published'
   WHERE system_prompt_id = 'content-expander-cyrus';
   ```
5. **Verify:**
   ```sql
   SELECT system_prompt_id, name, is_active, status
   FROM public.system_prompts
   WHERE system_prompt_id = 'content-expander-cyrus';
   ```
   - Should show `is_active = true`, `status = 'published'`

#### Step 3d: Test Execution

1. Go back to `/ai/prompts/experimental/execution-demo`
2. Click the **"System Prompts"** tab
3. **Expected:**
   - You should now see a **real, clickable card** (not locked, no "Coming Soon")
   - Card title: "Cyrus the Great Expander" (or your name)
4. **Click the card**
5. **Expected:**
   - Modal appears immediately
   - Starts streaming AI response automatically
   - You can continue chatting (because `allowChat = true`)

**Screenshot Opportunity:** Working database-driven card executing a system prompt!

---

### Test 4: Assign Prompt to Existing Placeholder

**Goal:** Replace a "Coming Soon" placeholder with a real prompt

#### Option A: Update via SQL

1. Create another prompt (or use your existing one from Test 3a)
2. Convert it to a system prompt (Test 3b)
3. Instead of creating a NEW record, **update an existing placeholder:**
   ```sql
   -- First, get your new prompt's snapshot
   SELECT prompt_snapshot
   FROM public.system_prompts
   WHERE system_prompt_id = 'content-expander-cyrus';
   
   -- Then, update a placeholder (e.g., translate-to-spanish)
   UPDATE public.system_prompts
   SET 
     prompt_snapshot = (SELECT prompt_snapshot FROM public.system_prompts WHERE system_prompt_id = 'content-expander-cyrus'),
     is_active = true,
     status = 'published',
     source_prompt_id = (SELECT source_prompt_id FROM public.system_prompts WHERE system_prompt_id = 'content-expander-cyrus')
   WHERE system_prompt_id = 'translate-to-spanish';
   ```

**Note:** This is a quick hack for testing. In the future, the admin UI will handle this properly.

#### Option B: Delete Placeholder & Recreate (Cleaner)

1. Delete the placeholder:
   ```sql
   DELETE FROM public.system_prompts
   WHERE system_prompt_id = 'translate-to-spanish';
   ```
2. Create a new prompt with variables matching the `translate-text` functionality:
   ```
   {{text}}, {{target_language}}
   ```
3. Convert it using the modal (Test 3b), selecting:
   - Functionality: **"Translate Text"**
   - Placement: **Context Menu**
   - Category: `text-tools`
   - Subcategory: `translation`
   - System Prompt ID: `translate-to-spanish`
4. Activate it (Test 3c)
5. Test by right-clicking in the demo page

---

## 🐛 Troubleshooting

### Issue: Modal doesn't appear when clicking a card
**Check:**
- Is `is_active = true`?
- Is `status = 'published'`?
- Does `prompt_snapshot` have a `placeholder: false` field?
- Check browser console for errors

### Issue: Context menu doesn't show items
**Check:**
- Run: `SELECT COUNT(*) FROM public.system_prompts WHERE placement_type = 'context-menu' AND is_active = true;`
- Should return at least 1
- Check `useContextMenuPrompts` hook is firing (browser console)

### Issue: Variables not resolving
**Check:**
- Does your prompt's variables match the `SYSTEM_FUNCTIONALITIES` required variables?
- Check `PromptContextResolver.resolve()` in browser console
- Ensure you're passing the correct `uiContext` to the component

### Issue: "Permission denied" errors
**Check:**
- Are you logged in as an admin?
- Run: `SELECT * FROM public.admins WHERE user_id = auth.uid();`
- Should return your user record

---

## 📊 Verification Queries

### See all active system prompts
```sql
SELECT 
  system_prompt_id,
  name,
  placement_type,
  functionality_id,
  category,
  is_active,
  status
FROM public.system_prompts
WHERE is_active = true
ORDER BY placement_type, category, sort_order;
```

### See all placeholders (no real prompt yet)
```sql
SELECT 
  system_prompt_id,
  name,
  placement_type,
  category
FROM public.system_prompts
WHERE prompt_snapshot->>'placeholder' = 'true'
ORDER BY placement_type, category;
```

### Count by placement type
```sql
SELECT 
  placement_type,
  COUNT(*) as total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN prompt_snapshot->>'placeholder' = 'true' THEN 1 ELSE 0 END) as placeholders
FROM public.system_prompts
GROUP BY placement_type
ORDER BY placement_type;
```

---

## 🎉 Success Criteria

You'll know the system is working when:

1. ✅ Context menu loads items from database (right-click in demo)
2. ✅ Cards grid loads from database (see educational cards)
3. ✅ Placeholders show "Coming Soon" and are disabled
4. ✅ Converting a prompt to system prompt succeeds (3-step wizard)
5. ✅ Activating a system prompt makes it appear in the UI
6. ✅ Clicking an active card executes the prompt correctly
7. ✅ Chat mode works (if enabled)
8. ✅ No linter errors
9. ✅ No console errors (except expected warnings about placeholders)

---

## 🚀 What's Next (After Testing)

Once you've verified everything works:

1. **Build Admin Manager UI** (`/administration/system-prompts`)
   - View/filter all system prompts
   - Enable/disable in bulk
   - Edit placement settings
   - View usage stats

2. **Migrate Hardcoded Features**
   - Identify all hardcoded prompt actions
   - Create database entries for each
   - Associate with real prompts
   - Remove hardcoded code

3. **Documentation**
   - Developer guide: How to add new functionalities
   - Admin guide: How to manage system prompts
   - User guide: How to use AI features

---

## 📝 Notes

- All new system prompts start as `status = 'draft'` and `is_active = false`
- You must manually activate them (for now) via SQL or admin UI (when built)
- Variables are extracted from `{{variable_name}}` in prompt messages
- `PromptContextResolver` handles mapping UI context to variables
- Each `functionality_id` defines expected variables in the CODE, not database

---

## 🤔 Questions or Issues?

If you encounter any problems:
1. Check browser console for errors
2. Check Supabase logs (if database-related)
3. Run the verification queries above
4. Share the error message with me

**Ready to test!** Start with Test 1 (view placeholders) and work your way through. Let me know how it goes! 🚀

