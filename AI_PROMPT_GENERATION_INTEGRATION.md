# AI Prompt Generation Integration for System Prompts

## Overview

Integrated the AI Prompt Generator into the System Prompts workflow, allowing admins to automatically generate compatible AI prompts when none exist. The system pre-fills context with all required information to ensure the generated prompt matches functionality requirements.

## Components Created

### 1. `GeneratePromptForSystemModal.tsx`

A specialized version of the PromptGenerator designed for system prompt context.

**Key Features:**
- **Pre-filled Context:** Automatically populates the "System Context" field with:
  - System prompt name
  - System prompt description
  - Category
  - Functionality name and description
  - **Required variables** (formatted with `{{variable}}` notation)
  - **Optional variables** (if any)
  - Placement type
  - Placement settings (requires selection, allows chat, etc.)
- **Editable Context:** Admin can modify the pre-filled context before generation
- **Voice Input:** Supports voice input for both purpose and context fields
- **Auto-Link:** After generation, automatically links the created prompt to the system prompt
- **Validation:** Uses the same variable validation as manual linking
- **Embedded Mode:** Doesn't route away - closes modal and updates the parent view

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: SystemPromptDB;
  onSuccess: (promptId: string) => void;
}
```

**Pre-filled Context Example:**
```
**System Prompt Details:**
- Name: Content Expander
- Description: Expand educational content with examples
- Category: educational

**Functionality: Content Expander Card**
Cards that expand on educational content with title, description, and full context

**Required Variables (MUST be included):**
- {{title}}
- {{description}}
- {{context}}

**Optional Variables (can be included):**
- None

**Important:** The prompt MUST use exactly these variable names with double curly braces (e.g., {{title}}).

**Placement Type:** card
- Supports chat mode / conversational responses
```

### 2. Updated `SelectPromptModal.tsx`

Enhanced to include AI generation option when no compatible prompts found.

**New Features:**
- Shows "Generate New Prompt with AI" button when filteredPrompts.length === 0
- Opens `GeneratePromptForSystemModal` on click
- Automatically closes both modals on successful generation and linking
- Success toast notification

**Button Appearance:**
- Purple-to-blue gradient background
- Sparkles icon
- Only shown when:
  - No search query active
  - Functionality is defined
  - No compatible prompts found

## User Flow

### Scenario: No Compatible Prompts Exist

1. Admin opens SystemPromptsManager
2. Clicks "Select AI Prompt" on a system prompt
3. SelectPromptModal opens - shows "No compatible prompts found"
4. Sees message: "Create a prompt with variables: title, description, context"
5. Clicks **"Generate New Prompt with AI"** button
6. GeneratePromptForSystemModal opens with:
   - System info banner showing functionality and required variables
   - Empty "Prompt Purpose" field (required)
   - Pre-filled "System Context" field (editable)
   - Pre-filled "Prompt Name" (editable)

7. Admin fills in "Prompt Purpose":
   ```
   Create detailed educational expansions that help students understand complex topics. 
   The response should include:
   - Clear explanation of the title concept
   - Multiple relevant examples
   - Connections to the broader context
   - Simple language appropriate for the learner
   ```

8. Admin can edit the pre-filled context if needed (or leave as-is)

9. Clicks **"Generate"**
   - Shows streaming response in markdown
   - Extracts JSON automatically
   - Shows success banner when done

10. Reviews generated prompt structure

11. Clicks **"Create & Link"**
    - Creates the AI prompt in database
    - Automatically calls `/api/system-prompts/[id]/link-prompt`
    - Validates variables match functionality
    - Links to system prompt
    - Shows success toast
    - Closes both modals
    - Refreshes SystemPromptsManager table

### Scenario: Generation Produces Incompatible Variables

If the AI generates a prompt with wrong variables:

1. Prompt is created successfully
2. Link attempt fails with validation error
3. Error toast shows detailed message:
   ```
   The generated prompt has variable issues:
   
   Missing: context
   Extra: subject, topic
   
   Prompt was created but not linked. 
   You can manually edit it and try again.
   ```

4. Admin can:
   - Find the newly created prompt in /ai/prompts
   - Edit it to fix variables
   - Return to SystemPromptsManager
   - Try linking manually via "Select AI Prompt"

## Technical Details

### Variable Extraction & Pre-filling

The context is built programmatically:

```typescript
const functionality = SYSTEM_FUNCTIONALITIES[systemPrompt.functionality_id];

let context = `**System Prompt Details:**\n`;
context += `- Name: ${systemPrompt.name}\n`;
context += `- Description: ${systemPrompt.description}\n`;
context += `- Category: ${systemPrompt.category}\n\n`;

context += `**Functionality: ${functionality.name}**\n`;
context += `${functionality.description}\n\n`;

context += `**Required Variables (MUST be included):**\n`;
functionality.requiredVariables.forEach(v => {
  context += `- {{${v}}}\n`;
});

// ... optional variables, placement settings, etc.
```

### Auto-Link Process

After prompt creation:

```typescript
const linkResponse = await fetch(
  `/api/system-prompts/${systemPrompt.id}/link-prompt`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt_id: promptId,
      update_notes: 'Auto-linked AI-generated prompt'
    })
  }
);
```

### Error Handling

1. **Generation Fails:** Shows error toast, keeps modal open
2. **JSON Extraction Fails:** Shows warning banner, keeps raw response visible
3. **Prompt Creation Fails:** Shows error toast with details
4. **Link Validation Fails:** 
   - Prompt is created but not linked
   - Shows detailed error with:
     - Missing variables
     - Extra variables
     - Guidance to manually fix
5. **Link API Fails:** Shows error toast with API response details

## UI Components

### Info Banner (Top of Generate Modal)

```
┌─────────────────────────────────────────────────┐
│ Functionality: Content Expander Card            │
│ Required Variables: {{title}} {{description}}   │
│                    {{context}}                   │
└─────────────────────────────────────────────────┘
```

### Action Buttons

**Before Generation:**
- Cancel (outline) / Generate (gradient)

**After Generation:**
- Discard (outline) / Regenerate (outline) / Create & Link (gradient with Link icon)

### Status Banners in Response Area

**Success:**
```
✓ Prompt generated successfully!
```

**JSON Extraction Failed:**
```
⚠ JSON Extraction Failed: Could not find valid JSON in response
```

## Integration Points

### Files Modified:
- `components/admin/SelectPromptModal.tsx`
  - Added state for generate modal
  - Added "Generate" button in empty state
  - Added modal component

### Files Created:
- `components/admin/GeneratePromptForSystemModal.tsx`
- `AI_PROMPT_GENERATION_INTEGRATION.md`

### Dependencies:
- Uses existing `PromptGenerator` logic
- Uses existing `/api/system-prompts/[id]/link-prompt` endpoint
- Uses existing `extractJsonFromText` utility
- Uses existing Redux socket.io integration
- Uses existing `VoiceInputButton` component

## Testing Checklist

- [x] Generate modal opens from SelectPromptModal
- [x] Context is pre-filled correctly
- [x] Voice input works for both fields
- [x] Generation streams response
- [x] JSON extraction works
- [x] Prompt name pre-fills
- [x] Create & Link button works
- [x] Validation catches variable mismatches
- [x] Error messages are detailed
- [x] Success closes both modals
- [x] Parent view refreshes
- [x] Toast notifications work
- [x] No linter errors

## Example Usage

### Good Flow:

**System Prompt:**
- Name: "Translate Text"
- Functionality: `translate-text`
- Required Variables: `text`, `target_language`

**Admin Input:**
```
Purpose: Translate provided text to the target language with high accuracy
```

**Pre-filled Context:**
```
**System Prompt Details:**
- Name: Translate Text
- Functionality: Translate Text
- Required Variables: {{text}}, {{target_language}}
```

**Generated Prompt:**
```json
{
  "name": "Translate Text",
  "description": "High-accuracy translation service",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional translator. Translate the following text to {{target_language}}..."
    },
    {
      "role": "user",
      "content": "{{text}}"
    }
  ],
  "settings": { ... },
  "variableDefaults": [
    { "name": "text", "defaultValue": "" },
    { "name": "target_language", "defaultValue": "Spanish" }
  ]
}
```

**Result:** ✅ Created and linked successfully

### Bad Flow (Wrong Variables):

**Generated Prompt:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Translate {{input_text}} to {{language}}"
    }
  ]
}
```

**Result:** ❌ Validation fails
```
Missing: text, target_language
Extra: input_text, language

Prompt was created but not linked.
```

## Future Enhancements

1. **Retry Generation:** Allow editing purpose and regenerating without closing modal
2. **Variable Preview:** Show extracted variables during generation
3. **Template Library:** Offer pre-made templates for common functionalities
4. **Batch Generation:** Generate multiple variations and choose best
5. **Fine-tuning:** Learn from admin edits to improve generation
6. **Version Control:** Track generated vs. manually edited versions

## Benefits

1. **Faster Onboarding:** New system prompts can be created without manual prompt writing
2. **Consistency:** Generated prompts follow the required structure
3. **Variable Accuracy:** Pre-filled context ensures correct variable usage
4. **Reduced Errors:** Validation catches issues before linking
5. **Admin Flexibility:** Context is editable for customization
6. **Voice Support:** Admins can use voice for faster input
7. **Embedded Workflow:** No routing away from admin interface

## Summary

The AI Prompt Generation integration provides a seamless way to create compatible AI prompts directly within the System Prompts workflow. By pre-filling all technical requirements and validating results, it reduces errors and speeds up the process of building a complete prompt library.

