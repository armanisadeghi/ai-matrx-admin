# Updated list of tasks - ONLY source of truth for this feature

## ✅ Completed Tasks

### Phase 1: Core Infrastructure (Completed)
- ✅ Created `constants.ts` with placement types and scope constants
- ✅ Updated `types.ts` with comprehensive type definitions
  - ScopeMapping interface
  - All table interfaces
  - CRUD input types
  - View types
- ✅ Created comprehensive service layer (`services/admin-service.ts`)
  - Full CRUD for shortcut_categories
  - Full CRUD for prompt_builtins
  - Full CRUD for prompt_shortcuts
  - Context menu operations
  - Batch operations with relations
- ✅ Created admin API routes
  - `/api/admin/shortcut-categories` (GET, POST)
  - `/api/admin/shortcut-categories/[id]` (GET, PUT, DELETE)
  - `/api/admin/prompt-builtins` (GET, POST)
  - `/api/admin/prompt-builtins/[id]` (GET, PUT, DELETE)
  - `/api/admin/prompt-shortcuts` (GET, POST)
  - `/api/admin/prompt-shortcuts/[id]` (GET, PUT, DELETE)
- ✅ Created execution utilities (`utils/execution.ts`)
  - Scope mapping functions
  - Variable substitution
  - Execution preparation
  - Helper functions
- ✅ Created validation utility placeholders (`utils/validation.ts`)
- ✅ Created barrel exports (`index.ts`)
- ✅ Created comprehensive README documentation

---

## 🔲 Pending Tasks

### Phase 2: Admin UI Components
- 🔲 Create admin page layout for prompt builtins management
- 🔲 Create ShortcutCategoryManager component
  - List view with hierarchy display
  - Create/Edit category form
  - Placement type selector dropdown
  - Icon and color pickers
  - Drag-and-drop for sort_order
- 🔲 Create PromptBuiltinManager component
  - List view with search and filters
  - Create/Edit builtin form
  - Message editor (similar to prompts feature)
  - Variable defaults editor
  - Settings editor
- 🔲 Create PromptShortcutManager component
  - List view with relations (category + builtin)
  - Create/Edit shortcut form
  - Scope mapping configurator (critical UI)
  - Category selector
  - Builtin selector with variable preview
  - Keyboard shortcut input
- 🔲 Create ScopeMappingConfigurator component
  - Visual UI for mapping scopes to variables
  - Show available variables from selected builtin
  - Validate mappings in real-time
  - Preview execution flow

### Phase 3: Context Menu Implementation
- 🔲 Create ContextMenu component
  - Fetch from context_menu_view
  - Build hierarchical menu structure
  - Render categories and shortcuts
  - Handle standalone items
  - Support icons and colors
- 🔲 Create ContextMenuItem component
  - Execute on click using getPromptExecutionData()
  - Handle scope mapping at runtime
  - Show loading states
  - Error handling
- 🔲 Integrate with existing AI action system
- 🔲 Add keyboard shortcut handling

### Phase 4: Button & Card Placements
- 🔲 Create PromptButton component
  - Fetch shortcuts for placement_type: 'button'
  - Execute prompt on click
  - Support custom scopes
- 🔲 Create PromptCard component
  - Fetch shortcuts for placement_type: 'card'
  - Auto-scope title and description
  - Visual card layout
- 🔲 Create placement integration examples

### Phase 5: Validation Implementation (Later Phase)
- 🔲 Implement `validateScopeMappings()`
  - Check that mapped variables exist in prompt
  - Detect duplicate mappings
  - Return detailed errors
- 🔲 Implement `validatePromptBuiltin()`
  - Validate message structure
  - Validate variable defaults
  - Validate settings
- 🔲 Implement `validateShortcutReferences()`
  - Check prompt_builtin_id exists
  - Check category_id exists
  - Validate scope_mappings against builtin variables
- 🔲 Implement `validateCategoryHierarchy()`
  - Detect circular references
  - Validate parent relationships
- 🔲 Add validation to API routes
- 🔲 Add validation to admin UI forms

### Phase 6: Testing & Polish
- 🔲 Create test data scripts
- 🔲 Test all CRUD operations
- 🔲 Test scope mapping execution flow
- 🔲 Test context menu rendering
- 🔲 Test keyboard shortcuts
- 🔲 Error boundary components
- 🔲 Loading states
- 🔲 Empty states
- 🔲 Accessibility audit

---

## 📋 Current Priority

**Next Up:** Phase 2 - Admin UI Components

Start with the PromptShortcutManager and ScopeMappingConfigurator as they are the most critical for configuring the system properly.

---

## 🔍 Notes

- Database views (`context_menu_view`) and functions (`get_prompt_execution_data()`) already exist
- RLS policies already configured for admin access
- Scope mapping is the critical system - must be configured correctly
- All API routes include scope_mappings validation for valid keys
- Soft delete pattern (is_active) implemented across all services

