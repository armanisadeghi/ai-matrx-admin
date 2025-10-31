# Matrx Actions System

A hierarchical action system with clean separation between **what actions do** and **where they appear**.

## 🎯 Current Status: Hardcoded Demo

This is a simplified, hardcoded version to test the core concepts before building the full database-driven system.

## 📁 Structure

```
features/matrx-actions/
├── types.ts                           # Core TypeScript types
├── constants/
│   ├── system-actions.ts             # Hardcoded action definitions
│   └── system-menu-items.ts          # Hardcoded menu item definitions
├── utils/
│   └── menu-builder.ts               # Utilities for building hierarchical menus
├── components/
│   └── MatrxActionsContextMenu.tsx   # Context menu component
├── examples/
│   └── MatrxActionsDemo.tsx          # Interactive demo
└── README.md                         # This file
```

## 🔑 Key Concepts

### 1. Actions (WHAT)

Actions define **what** the system does:
- Execution type (prompt, function, tool, workflow, api)
- Variable mappings to context sources
- Execution settings
- References to prompts/tools/workflows

**Example:**
```typescript
{
  id: 'summarize',
  name: 'Summarize',
  actionType: 'prompt',
  promptId: 'summarize-text',
  variableContextMap: {
    text: {
      source: 'selection',
      fallback: 'editor_content',
      required: true
    }
  }
}
```

### 2. Menu Items (WHERE)

Menu items define **where** actions appear:
- Menu type (context_menu, toolbar, command_palette)
- Category and subcategory
- Display order
- Context requirements (when to show)
- Display overrides
- UI settings

**Example:**
```typescript
{
  id: 'menu-summarize',
  actionId: 'summarize',
  menuType: 'context_menu',
  category: 'standalone',
  displayOrder: 20,
  contextRequirements: {
    minSelectionLength: 50
  }
}
```

## 🎨 Menu Structure

### Standalone Actions (Top-level)
- Explain
- Summarize
- Extract Key Points
- Improve
- Get Ideas
- Search Web

### Matrx Create (Submenu)
- Flashcards
- Presentation
- Quiz
- Flow Chart
- Other

### Translation (Submenu)
- English
- Spanish
- French
- Italian
- Persian
- Other

### Future Categories
- Personal Actions
- Org Actions
- Workspace Actions

## 🚀 Usage

### Basic Context Menu

```tsx
import { TextSelectionMatrxMenu } from '@/features/matrx-actions';

function MyComponent() {
  return (
    <TextSelectionMatrxMenu
      onActionTrigger={(actionId, context) => {
        console.log('Action triggered:', actionId, context);
      }}
    >
      <div>Right-click this content to see actions</div>
    </TextSelectionMatrxMenu>
  );
}
```

### With Custom Context

```tsx
import { MatrxActionsContextMenu } from '@/features/matrx-actions';

function MyComponent() {
  const context = {
    selectedText: 'Some selected text',
    editorContent: 'Full editor content',
    // ... other context
  };

  return (
    <MatrxActionsContextMenu
      context={context}
      onActionTrigger={(actionId, context) => {
        // Handle action
      }}
    >
      <div>Right-click here</div>
    </MatrxActionsContextMenu>
  );
}
```

## 🧪 Testing

Visit the demo page to test the system:
- Navigate to `/demo/prompt-execution`
- Click the "Matrx Actions" tab
- Right-click on the sample content (with or without selecting text)
- Observe the hierarchical menu structure

## ✅ Benefits of This Architecture

1. **Reusability**: One action can appear in multiple menus with different configurations
2. **Flexibility**: Easy to reorganize menus without touching action definitions
3. **Maintainability**: Clean separation makes it easier to manage and extend
4. **User Customization**: Users can create custom menu layouts using existing actions

## 📋 Next Steps (After Testing)

Once this hardcoded version is tested and approved:

1. Create database tables (`matrx_actions` and `matrx_action_menu_items`)
2. Build admin interface for managing actions and menu items
3. Create Redux state management for caching
4. Build context resolver service
5. Create action executor for different action types
6. Add support for user-created custom actions
7. Implement org and workspace scoped actions

## 🔗 Related Files

- Demo Page: `app/(authenticated)/demo/prompt-execution/page.tsx`
- Original Context Menu: `features/prompts/components/PromptContextMenu.tsx`
- Prompt Execution Hook: `features/prompts/hooks/usePromptExecution.ts`

