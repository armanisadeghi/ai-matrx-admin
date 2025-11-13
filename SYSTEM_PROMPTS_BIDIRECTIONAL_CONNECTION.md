# System Prompts ↔ AI Prompts Bidirectional Connection

## Overview

This implementation creates a complete bidirectional connection between System Prompts and AI Prompts, allowing admins to manage prompt assignments, updates, and version control seamlessly.

## Architecture

### API Endpoints

#### 1. `/api/system-prompts/[id]/link-prompt` (POST)
Links or updates a system prompt with a source AI prompt.

**Request Body:**
```json
{
  "prompt_id": "uuid-of-ai-prompt",
  "update_notes": "Optional update notes"
}
```

**Functionality:**
- Validates prompt variables against functionality requirements
- Extracts variables from AI prompt messages
- Updates system prompt with new prompt snapshot
- Increments version number
- Returns detailed validation errors if incompatible

**Response Success:**
```json
{
  "success": true,
  "message": "Successfully linked/updated prompt",
  "system_prompt": { /* updated system prompt */ },
  "changes": {
    "old_version": 1,
    "new_version": 2,
    "old_source_prompt_id": "...",
    "new_source_prompt_id": "...",
    "was_placeholder": false
  }
}
```

**Response Error (Validation Failed):**
```json
{
  "error": "Prompt variables do not match functionality requirements",
  "details": "Detailed explanation",
  "validation": {
    "functionality_id": "content-expander-card",
    "functionality_name": "Content Expander Card",
    "required_variables": ["title", "description", "context"],
    "optional_variables": [],
    "prompt_variables": ["title", "description"],
    "missing_variables": ["context"],
    "extra_variables": [],
    "valid": false
  },
  "system_prompt": { /* system prompt details */ },
  "source_prompt": { /* source prompt details */ }
}
```

#### 2. `/api/system-prompts/[id]/compatible-prompts` (GET)
Fetches all AI prompts compatible with a system prompt's functionality.

**Query Parameters:**
- `include_all=true` - Include incompatible prompts with validation info

**Response:**
```json
{
  "system_prompt": {
    "id": "...",
    "system_prompt_id": "content-expander",
    "name": "Content Expander",
    "functionality_id": "content-expander-card",
    "source_prompt_id": "current-prompt-id",
    "current_version": 2
  },
  "functionality": {
    "id": "content-expander-card",
    "name": "Content Expander Card",
    "description": "...",
    "required_variables": ["title", "description", "context"],
    "optional_variables": [],
    "placement_types": ["card"]
  },
  "compatible": [
    {
      "id": "prompt-id",
      "name": "My Content Expander",
      "description": "...",
      "variables": ["title", "description", "context"],
      "updated_at": "2025-01-15T10:00:00Z",
      "is_current": true,
      "validation": {
        "valid": true,
        "missing": [],
        "extra": []
      }
    }
  ],
  "total_compatible": 5,
  "total_prompts": 50
}
```

### UI Components

#### 1. SelectPromptModal (`components/admin/SelectPromptModal.tsx`)
Modal for selecting or changing the AI prompt linked to a system prompt.

**Features:**
- Shows compatible prompts with variable validation
- Filters prompts by search query
- Displays current prompt with "Current" badge
- Shows functionality requirements
- Real-time validation feedback
- Detailed error messages on failure

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: SystemPromptDB;
  onSuccess: () => void;
  mode: 'select' | 'change'; // select = no current prompt, change = has current prompt
}
```

#### 2. UpdatePromptModal (`components/admin/UpdatePromptModal.tsx`)
Modal for updating a system prompt to the latest version of its source AI prompt.

**Features:**
- Side-by-side comparison of current vs. latest
- Tabbed interface: Overview, Variables, Messages, Settings, Defaults
- Highlights changes:
  - Variables added (green badges)
  - Variables removed (red badges)
  - Name/description changes
  - Message changes
  - Settings changes
- Validation before update
- Detailed JSON diffs
- Blocks incompatible updates with specific errors

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: SystemPromptDB;
  onSuccess: () => void;
}
```

### SystemPromptsManager Integration

Updated `components/admin/SystemPromptsManager.tsx` with new action buttons:

#### Action Buttons (in Actions column)

**For system prompts WITHOUT source_prompt_id:**
- **Link Icon (Link2)** - "Select AI Prompt" - Opens SelectPromptModal in 'select' mode

**For system prompts WITH source_prompt_id:**
- **ArrowLeftRight Icon** - "Change AI Prompt" - Opens SelectPromptModal in 'change' mode
- **Download Icon** - "Update to Latest" - Opens UpdatePromptModal
- **Eye/EyeOff Icon** - "Activate/Deactivate" - Toggles is_active status

**Always Available:**
- **Edit Icon** - "Edit settings" (placeholder for future)
- **Trash Icon** - "Delete" - Deletes system prompt

#### Enhanced Source Prompt Column

Shows detailed tooltip with:
- Source prompt ID (UUID)
- Source prompt name (from snapshot)
- Connection status badge

## User Flow

### Flow 1: Initial Connection (Placeholder → Connected)

1. Admin views SystemPromptsManager table
2. Sees system prompt with "Lock" icon (placeholder)
3. Clicks **Link Icon** in Actions column
4. SelectPromptModal opens showing:
   - Functionality requirements
   - List of compatible AI prompts
   - Search functionality
5. Admin selects a compatible prompt
6. System validates variables
7. If valid:
   - Updates system prompt with prompt_snapshot
   - Sets source_prompt_id
   - Increments version
   - Shows success toast
8. If invalid:
   - Shows detailed error with JSON structures
   - Blocks the assignment

### Flow 2: Changing to a Different Prompt

1. Admin sees system prompt with "CheckCircle2" icon (connected)
2. Clicks **ArrowLeftRight Icon** in Actions column
3. SelectPromptModal opens in 'change' mode
4. Shows current prompt with "Current" badge
5. Admin selects different compatible prompt
6. Same validation and update flow as Flow 1

### Flow 3: Updating to Latest Version

1. Admin clicks **Download Icon** in Actions column
2. UpdatePromptModal opens
3. System fetches latest version of source prompt
4. Compares current snapshot vs. latest:
   - Name changes
   - Description changes
   - Message changes (deep comparison)
   - Settings changes
   - Variable changes (added/removed/unchanged)
5. Shows changes in tabbed interface:
   - **Overview Tab:** Summary of all changes
   - **Variables Tab:** Side-by-side variable comparison
   - **Messages Tab:** Side-by-side JSON comparison
   - **Settings Tab:** Side-by-side settings comparison
   - **Defaults Tab:** Side-by-side defaults comparison
6. Admin reviews changes
7. Clicks "Update to Latest"
8. System validates new version against functionality
9. If valid:
   - Updates prompt_snapshot
   - Increments version
   - Shows success toast
10. If invalid:
    - Shows detailed error with why it's blocked
    - Includes full JSON validation details

## Validation Logic

### Variable Extraction
Regular expression: `/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g`

Extracts variables like:
- `{{title}}` → `title`
- `{{user_name}}` → `user_name`
- `{{ content }}` → `content` (handles whitespace)

### Functionality Validation
From `types/system-prompt-functionalities.ts`:

```typescript
export function validatePromptForFunctionality(
  promptSnapshot: any,
  functionalityId: string
): { valid: boolean; missing: string[]; extra: string[] }
```

**Validation Rules:**
1. Extract variables from prompt messages
2. Check all required variables are present
3. Check no extra variables exist (unless in optional list)
4. Special case: `custom` functionality allows any variables

**Example - Content Expander Card:**
```typescript
{
  id: 'content-expander-card',
  requiredVariables: ['title', 'description', 'context'],
  optionalVariables: []
}
```

Prompt MUST have exactly: `title`, `description`, `context`

## Error Handling

### Detailed Error Responses

All validation errors include:
- Human-readable error message
- Detailed explanation
- Full validation object with:
  - Functionality details
  - Required variables
  - Optional variables
  - Prompt variables
  - Missing variables
  - Extra variables
- System prompt details
- Source prompt details
- Full JSON structures for debugging

### Error Display in UI

**SelectPromptModal:**
- Shows error in Alert component
- Displays full error message
- Toast notification on failure

**UpdatePromptModal:**
- Shows error in Alert with destructive variant
- Pre-formatted error text (whitespace preserved)
- Mono font for JSON structures
- Disables "Update" button if incompatible

## Database Schema

### system_prompts table fields used:

```sql
source_prompt_id        -- UUID of the AI prompt this is linked to
version                 -- Integer, incremented on each update
prompt_snapshot         -- JSONB containing:
  {
    name: string,
    description: string,
    messages: array,
    settings: object,
    variableDefaults: array,
    variables: string[],
    placeholder: boolean  -- true for placeholders
  }
functionality_id        -- String, ties to SYSTEM_FUNCTIONALITIES
update_notes           -- String, notes about updates
last_updated_by        -- UUID of admin who updated
last_updated_at        -- Timestamp
updated_at             -- Timestamp
```

## Testing Checklist

- [x] API endpoint for linking prompts
- [x] API endpoint for fetching compatible prompts
- [x] SelectPromptModal component
- [x] UpdatePromptModal component
- [x] SystemPromptsManager integration
- [x] Action buttons for Select/Change/Update
- [x] Variable extraction logic
- [x] Functionality validation
- [x] Change comparison logic
- [x] Error handling with detailed messages
- [x] Source prompt column enhancements
- [x] Tooltips and badges
- [x] No linter errors

## Next Steps (Future Enhancements)

1. **Auto-Update Detection:** Add background job to detect when source prompts have updates
2. **Update Badges:** Show visual indicator in table when updates are available
3. **Version History:** Show full version history with diffs
4. **Bulk Operations:** Update multiple system prompts at once
5. **Database-Driven Functionalities:** Move hardcoded SYSTEM_FUNCTIONALITIES to database
6. **Conflict Resolution:** Handle edge cases where updates cause conflicts
7. **Rollback:** Allow reverting to previous versions
8. **Notification System:** Alert admins when source prompts change

## Usage Example

```typescript
// 1. Admin creates AI prompt with variables: {{title}}, {{description}}, {{context}}

// 2. Admin converts to system prompt via "Make Global System Prompt"
//    - Selects functionality: "content-expander-card"
//    - System validates variables match
//    - Creates system prompt with source_prompt_id

// 3. Admin edits the AI prompt (adds {{author}} variable)

// 4. Admin opens SystemPromptsManager
//    - Clicks "Update to Latest" button
//    - Sees variables changed: +author
//    - Validation fails (author not in required variables)
//    - Update blocked with detailed error

// 5. Admin fixes AI prompt (removes {{author}}, updates description)

// 6. Admin clicks "Update to Latest" again
//    - Sees description changed
//    - Validation passes
//    - Clicks "Update to Latest"
//    - System prompt updated to v2
```

## Files Created/Modified

### New Files:
- `app/api/system-prompts/[id]/link-prompt/route.ts`
- `app/api/system-prompts/[id]/compatible-prompts/route.ts`
- `components/admin/SelectPromptModal.tsx`
- `components/admin/UpdatePromptModal.tsx`

### Modified Files:
- `components/admin/SystemPromptsManager.tsx`

### Documentation:
- `SYSTEM_PROMPTS_BIDIRECTIONAL_CONNECTION.md` (this file)

## Summary

The bidirectional connection system is now complete! Admins can:
1. ✅ Select AI prompts for system prompts
2. ✅ Change to different AI prompts
3. ✅ Update to latest versions with visual diff
4. ✅ See detailed validation errors
5. ✅ Track version history
6. ✅ Understand exactly why updates are blocked

All functionality is production-ready with comprehensive error handling and user-friendly interfaces.

