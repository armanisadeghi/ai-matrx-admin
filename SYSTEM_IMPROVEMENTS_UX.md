# System Prompts Manager - UX Improvements

## Overview

Three key improvements to make the System Prompts Manager more intuitive and reliable.

## 1. ✅ Show Actual Prompt Names (Instead of "Connected")

### Problem
The "Source Prompt" column showed generic "Connected" badge, requiring hover to see the actual prompt name.

### Solution
**Now Shows:**
- **Prompt Name** directly in the cell with green link icon
- Hover tooltip with full details (name, ID, description)
- **Quick "Select Prompt" button** for items without a prompt (replaces "None" badge)

### Before:
```
Source Prompt: [Badge: "Connected"] 
               (need to hover to see prompt name)

Source Prompt: [Badge: "None"]
               (no direct action)
```

### After:
```
Source Prompt: [🔗 Key Points Extractor]
               (name visible immediately)
               
Source Prompt: [Button: "Select Prompt"]
               (click to connect directly)
```

### Implementation:
**File:** `components/admin/SystemPromptsManager.tsx`

```tsx
{prompt.source_prompt_id ? (
  <Tooltip>
    <TooltipTrigger>
      <div className="flex items-center gap-1">
        <Link2 className="h-3 w-3 text-green-600" />
        <span className="text-xs font-medium">
          {prompt.prompt_snapshot?.name || 'Connected'}
        </span>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <div className="space-y-1">
        <p className="font-semibold">Linked AI Prompt:</p>
        <p className="text-xs">{prompt.prompt_snapshot?.name}</p>
        <p className="font-semibold mt-2">Prompt ID:</p>
        <p className="text-xs font-mono">{prompt.source_prompt_id}</p>
        {prompt.prompt_snapshot?.description && (
          <>
            <p className="font-semibold mt-2">Description:</p>
            <p className="text-xs">{prompt.prompt_snapshot.description}</p>
          </>
        )}
      </div>
    </TooltipContent>
  </Tooltip>
) : (
  <Button
    variant="ghost"
    size="sm"
    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
    onClick={() => setSelectingPromptFor({ prompt, mode: 'select' })}
  >
    <Unlink className="h-3 w-3 mr-1" />
    Select Prompt
  </Button>
)}
```

### Benefits:
- ✅ Immediate visibility of connected prompt name
- ✅ One-click access to select prompts (no need to go to Actions column)
- ✅ Hover tooltip provides full details
- ✅ More natural workflow

---

## 2. ✅ Fixed Data Refresh After Updates

### Problem
After updating, linking, or changing system prompts, the table data wasn't refreshing properly due to 5-minute cache.

### Solution
Enhanced the `refetch()` function to **clear cache before refetching**, ensuring fresh data every time.

### Implementation:
**File:** `hooks/useSystemPrompts.ts`

```typescript
export function useAllSystemPrompts(placementType?: string) {
  const result = useSystemPrompts({
    placement_type: placementType as 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action',
    cacheKey: `all-system-prompts-${placementType || 'all'}`
  });
  
  // Enhance refetch to also clear cache
  const enhancedRefetch = async () => {
    result.clearCache();  // 🔑 Clear cache first
    await result.refetch();  // Then fetch fresh data
  };
  
  return {
    ...result,
    refetch: enhancedRefetch
  };
}
```

### How It Works:

**Before:**
```
1. User updates system prompt
2. onSuccess() → refetch() called
3. Cache still valid (< 5 min old)
4. Returns stale cached data ❌
5. User sees old data
```

**After:**
```
1. User updates system prompt
2. onSuccess() → refetch() called
3. Cache cleared first
4. Fresh data fetched from API ✅
5. User sees updated data immediately
```

### Affected Operations:
- ✅ Linking/changing prompts
- ✅ Updating to latest version
- ✅ Toggling active status
- ✅ Deleting system prompts
- ✅ Creating new system prompts

### Benefits:
- ✅ Immediate feedback on changes
- ✅ Consistent data across views
- ✅ No confusion from stale data

---

## 3. ✅ Prominent AI Generation Button

### Problem
The AI generation option was hidden and only appeared in the empty state when NO compatible prompts existed. Users couldn't find it when prompts existed but they wanted to generate a new one anyway.

### Solution
Added a **prominent "Generate New" button** in the header of the SelectPromptModal, always visible.

### Before:
```
┌─ Select AI Prompt ─────────────────────┐
│ Choose a compatible AI prompt...       │
│                                         │
│ [Search box]                            │
│ [List of prompts]                       │
│                                         │
│ (Only shows generate button if empty)  │
└─────────────────────────────────────────┘
```

### After:
```
┌─ Select AI Prompt ──────── [Generate New] ──┐
│ Choose a compatible AI prompt... ★ BUTTON   │
│                                              │
│ [Search box]                                 │
│ [List of prompts]                            │
│                                              │
│ (Button ALWAYS visible in header)           │
└──────────────────────────────────────────────┘
```

### Implementation:
**File:** `components/admin/SelectPromptModal.tsx`

```tsx
<DialogHeader>
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
      <DialogTitle>
        {mode === 'select' ? 'Select' : 'Change'} AI Prompt for "{systemPrompt.name}"
      </DialogTitle>
      <DialogDescription>
        Choose a compatible AI prompt to power this system prompt. 
        {data?.functionality && (
          <span className="block mt-1">
            Required variables: <code className="text-xs">
              {data.functionality.required_variables.join(', ')}
            </code>
          </span>
        )}
      </DialogDescription>
    </div>
    <Button
      onClick={() => setShowGenerateModal(true)}
      className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
      size="sm"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      Generate New
    </Button>
  </div>
</DialogHeader>
```

### Button Properties:
- **Position:** Top-right of dialog header
- **Style:** Purple-to-blue gradient (matches AI theme)
- **Icon:** Sparkles ✨
- **Text:** "Generate New"
- **Size:** Small (`sm`)
- **Visibility:** Always visible

### User Flows:

**Flow 1: Has Compatible Prompts**
```
1. Open SelectPromptModal
2. See list of 5 compatible prompts
3. See "Generate New" button in header
4. Click "Generate New" 
5. AI Generation modal opens
6. Generate custom prompt
```

**Flow 2: No Compatible Prompts**
```
1. Open SelectPromptModal
2. See "No compatible prompts found"
3. See TWO options:
   a) "Generate New" button in header (prominent)
   b) "Generate New Prompt with AI" in empty state (backup)
4. Click either button
5. AI Generation modal opens
```

### Benefits:
- ✅ Always discoverable (no hidden feature)
- ✅ Works whether prompts exist or not
- ✅ Consistent placement (top-right)
- ✅ Visually prominent (gradient button)
- ✅ Quick access to AI generation

---

## Combined User Experience

### Complete Workflow Example:

1. **Admin opens SystemPromptsManager**
   - Sees table with system prompts
   - "Source Prompt" column shows actual prompt names or "Select Prompt" button

2. **Admin clicks "Select Prompt" inline** (new!)
   - SelectPromptModal opens immediately
   - Sees "Generate New" button prominently in header (new!)

3. **Admin clicks "Generate New"**
   - GeneratePromptForSystemModal opens
   - Context pre-filled with requirements
   - Generates compatible prompt

4. **Prompt created and linked**
   - Success toast
   - Both modals close
   - **Table refreshes with cleared cache** (new!)
   - **Immediately sees new prompt name** (new!)

### Visual Improvements:

**Old Table:**
```
Name              | Source Prompt   | Actions
------------------+-----------------+----------
Content Expander  | [Connected]     | [Actions]
Translate Text    | [None]          | [Actions]
```

**New Table:**
```
Name              | Source Prompt           | Actions
------------------+-------------------------+----------
Content Expander  | 🔗 Key Points Extractor | [Actions]
Translate Text    | [Select Prompt Button]  | [Actions]
```

### Interaction Improvements:

**Old Workflow:**
```
3 clicks: Actions → Select → Choose prompt
```

**New Workflow:**
```
2 clicks: Select Prompt (inline) → Choose prompt
```

---

## Technical Changes Summary

### Files Modified:

1. **`components/admin/SystemPromptsManager.tsx`**
   - Updated Source Prompt column to show prompt name
   - Added inline "Select Prompt" button for items without prompts
   - Enhanced tooltip with full prompt details

2. **`hooks/useSystemPrompts.ts`**
   - Enhanced `useAllSystemPrompts()` to clear cache on refetch
   - Ensures fresh data after any update

3. **`components/admin/SelectPromptModal.tsx`**
   - Added "Generate New" button to dialog header
   - Button always visible regardless of prompt availability
   - Flexbox layout with title on left, button on right

### No Breaking Changes:
- All existing functionality preserved
- Backwards compatible
- Pure UX enhancements

---

## Testing Checklist

- [x] Source Prompt column shows prompt names
- [x] Hover tooltip shows full details
- [x] "Select Prompt" button opens modal
- [x] "Generate New" button visible in header
- [x] "Generate New" button works
- [x] Data refreshes after linking prompt
- [x] Data refreshes after changing prompt
- [x] Data refreshes after updating to latest
- [x] Data refreshes after toggling active
- [x] Cache cleared on all refetch operations
- [x] No linter errors

---

## User Feedback Expected

These improvements should result in:

1. **Faster Navigation:**
   - Inline "Select Prompt" reduces clicks
   - Prompt names visible at a glance

2. **Better Discovery:**
   - "Generate New" always visible
   - No hidden features

3. **More Reliable:**
   - Data always fresh after changes
   - No confusion from stale cache

4. **More Professional:**
   - Shows actual prompt names
   - Cleaner, more informative interface

---

## Summary

Three focused improvements that enhance the core workflow:

1. **Show What Matters:** Prompt names visible, not hidden
2. **Make It Work:** Data refreshes properly every time
3. **Make It Obvious:** AI generation easy to find and use

These changes make the System Prompts Manager feel more polished, reliable, and user-friendly without changing the underlying architecture.

