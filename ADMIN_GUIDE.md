# System Prompts Admin Guide

## 📍 Where Am I?

You're in the **System Prompts Manager** at `/administration/system-prompts`

This admin interface now has:
- ✅ **Sidebar navigation** (like ContentBlocksManager)
- ✅ **Placement type filtering** (cards, context menus, buttons, etc.)
- ✅ **Category organization**
- ✅ **Status indicators** (active/inactive, placeholder/mapped)
- ✅ **Functionality viewer** (see all available types)

---

## 🎯 Quick Answers to Your Questions

### 1. How do I map a prompt to a card placeholder?

**Method A: Via "Make Global System Prompt" (Recommended)**

1. Go to `/ai/prompts` (your regular prompts page)
2. Create a prompt with variables: `{{title}}`, `{{description}}`, `{{context}}`
3. Test it to make sure it works
4. Click the **⚙️ Settings** menu (3 dots) on the prompt card
5. Select **"Make Global System Prompt"**
6. **Step 1 (Functionality):**
   - Select: **"Content Expander Card"**
   - ✅ You'll see green checkmark if variables match
7. **Step 2 (Placement):**
   - System Prompt ID: `content-expander-cyrus` (or choose an existing placeholder like `content-expander-historical-figures`)
   - Name: Whatever you want to display
   - Placement Type: **Card**
   - Category: `educational`
   - Settings: Check "Allow Chat Mode" if desired
8. **Step 3 (Confirm):**
   - Review and click "Create System Prompt"
9. Go to **System Prompts Manager** → Find your prompt
10. Click the 👁️ **eye icon** to **activate** it

**Method B: Direct Database Update (Quick Test)**

```sql
-- Activate an existing placeholder by assigning a prompt to it
UPDATE public.system_prompts
SET 
  prompt_snapshot = (SELECT prompt_snapshot FROM public.system_prompts WHERE system_prompt_id = 'your-new-prompt-id'),
  is_active = true,
  status = 'published',
  source_prompt_id = (SELECT source_prompt_id FROM public.system_prompts WHERE system_prompt_id = 'your-new-prompt-id')
WHERE system_prompt_id = 'content-expander-educational';
```

---

### 2. How do I add a NEW type of card with different functionality?

**This requires CODE changes** (not just database). Here's how:

#### Step 1: Define the Functionality (Code)

Edit `types/system-prompt-functionalities.ts`:

```typescript
export const SYSTEM_FUNCTIONALITIES: Record<string, FunctionalityDefinition> = {
  // ... existing functionalities ...

  // NEW: Your custom card type
  'content-analyzer-card': {
    id: 'content-analyzer-card',
    name: 'Content Analyzer Card',
    description: 'Cards that analyze and critique content',
    placementTypes: ['card'],
    requiredVariables: ['title', 'content_to_analyze', 'analysis_type'],
    optionalVariables: ['tone', 'audience'],
    examples: ['Grammar analyzer', 'Sentiment analyzer', 'SEO analyzer']
  },
};
```

#### Step 2: Add Variable Resolution Logic (Code)

Edit `lib/services/prompt-context-resolver.ts`:

```typescript
private static resolveVariable(
  varName: string,
  functionalityId: string,
  placementType: string,
  uiContext: UIContext
): any {
  // ... existing cases ...

  // NEW: Handle your new functionality
  case 'content-analyzer-card':
    if (varName === 'title') return uiContext.cardTitle;
    if (varName === 'content_to_analyze') return uiContext.cardContext;
    if (varName === 'analysis_type') return uiContext.analysisType || 'general';
    if (varName === 'tone') return uiContext.tone;
    if (varName === 'audience') return uiContext.audience;
    break;
}
```

#### Step 3: Create Database Placeholder (SQL)

```sql
INSERT INTO public.system_prompts (
  system_prompt_id,
  name,
  description,
  placement_type,
  functionality_id,
  category,
  subcategory,
  prompt_snapshot,
  display_config,
  placement_settings,
  is_active,
  status,
  sort_order,
  tags,
  published_at,
  created_at,
  updated_at
) VALUES (
  'content-analyzer-seo',
  'SEO Analyzer',
  'Analyze content for SEO optimization',
  'card',
  'content-analyzer-card',  -- Links to your new functionality
  'analysis',
  'seo',
  '{"name": "Placeholder", "messages": [], "settings": {}, "variables": [], "placeholder": true}'::jsonb,
  '{"icon": "Search", "label": "SEO Analyzer"}'::jsonb,
  '{"allowChat": true, "allowInitialMessage": false}'::jsonb,
  false,  -- Start inactive
  'draft',
  10,
  ARRAY['seo', 'analysis', 'content']::text[],
  NOW(),
  NOW(),
  NOW()
);
```

#### Step 4: Create and Assign a Prompt

1. Go to `/ai/prompts`
2. Create a prompt with variables: `{{title}}`, `{{content_to_analyze}}`, `{{analysis_type}}`
3. Convert it to system prompt using "Make Global System Prompt"
4. Select functionality: **"Content Analyzer Card"**
5. Set System Prompt ID: `content-analyzer-seo` (matches the placeholder you created)
6. Complete wizard and activate

#### Step 5: Use It

```tsx
<DynamicCards 
  category="analysis" 
  context={pageContent}
/>
```

**Now your new analyzer cards will appear dynamically!**

---

## 📊 Understanding the Admin Interface

### Left Sidebar

**Placeholders View:**
- Shows all placement types (cards, context menus, buttons, etc.)
- Each type shows: `Active/Total` (e.g., "2/5" means 2 active out of 5 total)
- Click a type to filter the main view
- Categories further filter within a placement type

**Functionalities View:**
- Shows all available functionality definitions (hardcoded in code)
- For each functionality:
  - **ID**: What you use when creating system prompts
  - **Required Variables**: Must be in your prompt
  - **Optional Variables**: Can be in your prompt
  - **Placement Types**: Where this functionality can be used
  - **Examples**: Use cases

### Main Content Area

**Placeholder Cards:**
- 🔒 **Locked icon** = Placeholder (no prompt assigned yet)
- ✅ **Green checkmark** = Has prompt assigned
- **Active/Inactive badge** = Whether it's live in the app
- **Placement type badge** = Where it appears (card, menu, etc.)
- **Category badge** = Organizational grouping

**Card Actions:**
- 👁️ **Eye icon** = Toggle active/inactive
- ✏️ **Edit icon** = Edit details (coming soon - use database for now)
- 🗑️ **Trash icon** = Delete system prompt

---

## 🔄 Complete Workflow Examples

### Example 1: Activate an Existing Placeholder

**Scenario:** You have a "Translate to Spanish" placeholder in context menu

1. **Create the prompt:**
   - Go to `/ai/prompts`
   - Create prompt with: `{{text}}`, `{{target_language}}`
   - Prompt content: "Translate the following text to {{target_language}}: {{text}}"

2. **Convert to system prompt:**
   - Click ⚙️ → "Make Global System Prompt"
   - Functionality: **"Translate Text"**
   - System Prompt ID: `translate-to-spanish` (matches existing placeholder)
   - Placement: **Context Menu**
   - Category: `text-tools`
   - Subcategory: `translation`

3. **Activate:**
   - Go to System Prompts Manager
   - Find "Translate to Spanish"
   - Click 👁️ to activate
   - ✅ Now appears in right-click menus!

### Example 2: Create a Brand New Card

**Scenario:** You want a "Code Reviewer" card

1. **Define functionality** (code - see Step 1 above)
2. **Add resolution logic** (code - see Step 2 above)
3. **Create placeholder** (SQL - see Step 3 above)
4. **Create prompt:**
   - Variables: `{{title}}`, `{{code}}`, `{{language}}`
   - Content: "Review this {{language}} code: {{title}}\n\n```\n{{code}}\n```"
5. **Convert to system prompt:**
   - Functionality: **"Code Reviewer Card"** (your new one)
   - System Prompt ID: `code-reviewer-general`
6. **Activate in admin interface**
7. **Use it:**
   ```tsx
   <DynamicCards 
     category="code-review" 
     context={codeContent}
   />
   ```

---

## 🎨 Customization Options

### Per-Prompt Settings (`placement_settings`)

These are stored in the database and control behavior:

```typescript
{
  requiresSelection: boolean,      // For context menus: require highlighted text?
  allowChat: boolean,              // Enable conversational mode?
  allowInitialMessage: boolean,    // Prompt user before executing?
  minSelectionLength: number,      // Minimum text length for context menu?
  variant: string,                 // For buttons: 'default' | 'outline' | 'ghost'
  size: string,                    // For buttons: 'sm' | 'default' | 'lg'
  showIcon: boolean,               // Display icon?
}
```

---

## 🐛 Troubleshooting

### "I don't see my prompt in the admin interface"
- Check you converted it using "Make Global System Prompt" (not just created it)
- Refresh the admin page
- Check browser console for errors

### "My card doesn't appear on the demo page"
- Is it `is_active = true`?
- Is it `status = 'published'`?
- Is the category correct? (Check what `<DynamicCards category="X" />` is looking for)

### "Variables aren't resolving"
- Check your prompt has the EXACT variables the functionality requires
- Check `PromptContextResolver` has mapping logic for your functionality
- Check browser console: `PromptContextResolver.canResolve()` logs

### "My new functionality doesn't show up"
- Did you add it to `SYSTEM_FUNCTIONALITIES` object?
- Did you restart your dev server after code changes?
- Check TypeScript compiled without errors

---

## 📁 Key Files Reference

### For Creating Functionalities:
- `types/system-prompt-functionalities.ts` - Define functionality
- `lib/services/prompt-context-resolver.ts` - Variable resolution logic

### For Database Operations:
- `scripts/seed-system-prompts.sql` - Example placeholder creation
- System Prompts Manager UI - `/administration/system-prompts`

### For Using System Prompts:
- `components/dynamic/DynamicCards.tsx` - Card renderer
- `components/dynamic/DynamicContextMenu.tsx` - Context menu renderer
- `components/dynamic/DynamicButtons.tsx` - Button renderer

---

## 🚀 Quick Reference

| I want to... | Go to... | Action... |
|--------------|----------|-----------|
| See all placeholders | `/administration/system-prompts` | Filter by placement type |
| Create a new prompt | `/ai/prompts` | New Prompt → Test → Convert |
| Assign prompt to placeholder | Prompt Settings → "Make Global System Prompt" | Select functionality, match ID |
| Activate a system prompt | System Prompts Manager | Click 👁️ icon |
| Add new functionality type | Code: `types/system-prompt-functionalities.ts` | Define + Add resolution logic |
| View functionality requirements | System Prompts Manager | "Functionalities" tab in sidebar |
| Debug why card isn't working | Browser console | Check `canResolve()` output |

---

## 💡 Pro Tips

1. **Match placeholder IDs**: When converting a prompt, use the exact `system_prompt_id` of an existing placeholder to replace it
2. **Test first**: Always test your prompt in `/ai/prompts` before converting it
3. **Variables must match**: The 3-step wizard validates this - green ✅ means good!
4. **One functionality = one behavior**: If you need different behavior, create a new functionality
5. **Placeholders are your friends**: Seed them first, then fill them in as you create prompts

---

Need help? Check the browser console, verify your variables match, and ensure the prompt works standalone first!

