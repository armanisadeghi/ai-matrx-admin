# Matrx Actions Plan

Perfect! Now let me create a properly separated architecture. You're absolutely right - we need to separate **what an action IS** from **where/how it's USED**.

## 🎯 Revised Architecture: Separation of Concerns

### Two-Table Design

**Table 1: `matrx_actions`** - Defines WHAT the action is
- Core action definition
- Execution configuration
- References to prompts/tools/workflows
- No UI-specific concerns

**Table 2: `matrx_action_menu_items`** - Defines WHERE/HOW it's used
- Menu placement and organization
- Context requirements
- Display settings
- References to `matrx_actions`

This allows:
- ✅ One action reused in multiple places
- ✅ Different context requirements per placement
- ✅ User customization of menu structure without touching actions
- ✅ Clean admin interfaces for both concerns

---

## 📊 Complete Revised Database Schema

```sql
-- ============================================================================
-- TABLE 1: MATRX ACTIONS - Core Action Definitions
-- ============================================================================
CREATE TABLE matrx_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name
  
  -- Action Type & Execution
  action_type TEXT NOT NULL CHECK (action_type IN ('prompt', 'function', 'tool', 'workflow', 'api', 'hybrid')),
  
  -- Action References (only one should be populated based on action_type)
  prompt_id TEXT REFERENCES prompts(id) ON DELETE CASCADE,
  tool_id TEXT REFERENCES tool(id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES workflow(id) ON DELETE CASCADE,
  function_name TEXT, -- For system/custom JavaScript functions
  api_config JSONB, -- For direct API calls: { "url": "...", "method": "POST", "headers": {...} }
  
  -- Variable Configuration (for prompt-based actions)
  -- Defines what variables the action needs and how they map to context
  -- Example: { 
  --   "text": { 
  --     "source": "selection", 
  --     "fallback": "editor_content", 
  --     "required": true, 
  --     "label": "Text to summarize" 
  --   } 
  -- }
  variable_context_map JSONB DEFAULT '{}',
  
  -- Execution Settings
  execution_settings JSONB DEFAULT '{}',
  -- Example: { 
  --   "confirmBeforeExecute": false, 
  --   "showLoadingModal": true,
  --   "timeoutMs": 30000 
  -- }
  
  -- Ownership & Scope
  scope TEXT NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'user', 'org', 'workspace')),
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id TEXT,
  workspace_id TEXT,
  
  -- Metadata & Analytics
  use_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  version INT DEFAULT 1,
  
  -- Validation: Ensure proper reference based on action_type
  CONSTRAINT action_reference_check CHECK (
    (action_type = 'prompt' AND prompt_id IS NOT NULL) OR
    (action_type = 'tool' AND tool_id IS NOT NULL) OR
    (action_type = 'workflow' AND workflow_id IS NOT NULL) OR
    (action_type = 'function' AND function_name IS NOT NULL) OR
    (action_type = 'api' AND api_config IS NOT NULL) OR
    (action_type = 'hybrid')
  )
);

-- ============================================================================
-- TABLE 2: MATRX ACTION MENU ITEMS - UI Placement & Context
-- ============================================================================
CREATE TABLE matrx_action_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Link to Action
  action_id UUID REFERENCES matrx_actions(id) ON DELETE CASCADE NOT NULL,
  
  -- Menu Structure & Organization
  menu_type TEXT NOT NULL CHECK (menu_type IN ('context_menu', 'toolbar', 'command_palette', 'quick_actions')),
  category TEXT NOT NULL, -- 'standalone', 'matrx_create', 'translation', 'personal', 'org', 'workspace'
  subcategory TEXT, -- For nested grouping (e.g., 'flashcards', 'presentation' under 'matrx_create')
  parent_item_id UUID REFERENCES matrx_action_menu_items(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  
  -- Display Settings (overrides from action if provided)
  display_label TEXT, -- Override action name if needed
  display_icon TEXT, -- Override action icon if needed
  display_description TEXT, -- Override action description
  show_in_menu BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Context Requirements - When this menu item should appear
  context_requirements JSONB DEFAULT '{}',
  -- Example: {
  --   "requiresSelection": true,
  --   "minSelectionLength": 10,
  --   "requiresEditor": false,
  --   "editorTypes": ["markdown", "plaintext"],
  --   "fileTypes": ["md", "txt"],
  --   "customValidation": "functionName" 
  -- }
  
  -- Variable Override/Customization for this specific placement
  -- Can provide specific values or additional mapping for variables
  variable_overrides JSONB DEFAULT '{}',
  -- Example: {
  --   "targetLanguage": { "value": "Spanish", "locked": true },
  --   "format": { "source": "manual_input", "prompt": "Choose format" }
  -- }
  
  -- UI Behavior for this placement
  ui_settings JSONB DEFAULT '{}',
  -- Example: {
  --   "outputDestination": "canvas",
  --   "successMessage": "Translation complete!",
  --   "showModal": true,
  --   "modalTitle": "Translate to Spanish"
  -- }
  
  -- Ownership (for user customization)
  scope TEXT NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'user', 'org', 'workspace')),
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id TEXT,
  workspace_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- matrx_actions indexes
CREATE INDEX idx_matrx_actions_action_type ON matrx_actions(action_type);
CREATE INDEX idx_matrx_actions_scope ON matrx_actions(scope);
CREATE INDEX idx_matrx_actions_is_system ON matrx_actions(is_system);
CREATE INDEX idx_matrx_actions_user_id ON matrx_actions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_matrx_actions_prompt_id ON matrx_actions(prompt_id) WHERE prompt_id IS NOT NULL;
CREATE INDEX idx_matrx_actions_tool_id ON matrx_actions(tool_id) WHERE tool_id IS NOT NULL;
CREATE INDEX idx_matrx_actions_workflow_id ON matrx_actions(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_matrx_actions_tags ON matrx_actions USING GIN(tags);

-- matrx_action_menu_items indexes
CREATE INDEX idx_menu_items_action_id ON matrx_action_menu_items(action_id);
CREATE INDEX idx_menu_items_menu_type ON matrx_action_menu_items(menu_type);
CREATE INDEX idx_menu_items_category ON matrx_action_menu_items(category);
CREATE INDEX idx_menu_items_category_subcategory ON matrx_action_menu_items(category, subcategory);
CREATE INDEX idx_menu_items_display_order ON matrx_action_menu_items(menu_type, category, display_order);
CREATE INDEX idx_menu_items_user_id ON matrx_action_menu_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_menu_items_featured ON matrx_action_menu_items(is_featured) WHERE is_featured = true;
CREATE INDEX idx_menu_items_visible ON matrx_action_menu_items(show_in_menu) WHERE show_in_menu = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- matrx_actions RLS
ALTER TABLE matrx_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System actions are readable by everyone"
  ON matrx_actions FOR SELECT
  USING (is_system = true);

CREATE POLICY "Users can read their own actions"
  ON matrx_actions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own actions"
  ON matrx_actions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own actions"
  ON matrx_actions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own actions"
  ON matrx_actions FOR DELETE
  USING (user_id = auth.uid());

-- matrx_action_menu_items RLS
ALTER TABLE matrx_action_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System menu items are readable by everyone"
  ON matrx_action_menu_items FOR SELECT
  USING (is_system = true AND show_in_menu = true);

CREATE POLICY "Users can read their own menu items"
  ON matrx_action_menu_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own menu items"
  ON matrx_action_menu_items FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own menu items"
  ON matrx_action_menu_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own menu items"
  ON matrx_action_menu_items FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for matrx_actions
CREATE OR REPLACE FUNCTION update_matrx_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matrx_actions_updated_at
  BEFORE UPDATE ON matrx_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_matrx_actions_updated_at();

-- Auto-update updated_at for matrx_action_menu_items
CREATE OR REPLACE FUNCTION update_matrx_action_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matrx_action_menu_items_updated_at
  BEFORE UPDATE ON matrx_action_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_matrx_action_menu_items_updated_at();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Increment action usage
CREATE OR REPLACE FUNCTION increment_action_usage(p_action_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE matrx_actions
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = p_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get menu items with action details (for efficient queries)
CREATE OR REPLACE VIEW matrx_menu_items_with_actions AS
SELECT 
  mi.id as menu_item_id,
  mi.menu_type,
  mi.category,
  mi.subcategory,
  mi.display_order,
  mi.show_in_menu,
  mi.is_featured,
  mi.context_requirements,
  mi.variable_overrides,
  mi.ui_settings,
  COALESCE(mi.display_label, a.name) as display_label,
  COALESCE(mi.display_icon, a.icon) as display_icon,
  COALESCE(mi.display_description, a.description) as display_description,
  a.id as action_id,
  a.name as action_name,
  a.action_type,
  a.prompt_id,
  a.tool_id,
  a.workflow_id,
  a.function_name,
  a.api_config,
  a.variable_context_map,
  a.execution_settings,
  mi.scope as menu_scope,
  a.scope as action_scope,
  mi.user_id as menu_user_id,
  a.user_id as action_user_id
FROM matrx_action_menu_items mi
JOIN matrx_actions a ON mi.action_id = a.id
WHERE mi.show_in_menu = true;
```

---

## 📁 Updated File Structure

```
features/matrx-actions/
├── index.ts
├── README.md
├── types.ts                                    # All TypeScript types
│
├── constants/
│   ├── action-categories.ts                   # Category definitions
│   ├── context-sources.ts                     # Context source types
│   └── system-actions-seed.ts                 # System actions seed data
│
├── components/
│   ├── admin/
│   │   ├── ActionsManager.tsx                 # Manage actions (Table 1)
│   │   ├── MenuItemsManager.tsx               # Manage menu items (Table 2)
│   │   ├── ActionEditor.tsx                   # Edit action dialog
│   │   ├── MenuItemEditor.tsx                 # Edit menu item dialog
│   │   ├── VariableContextMapper.tsx          # Map variables to context
│   │   └── ContextRequirementsBuilder.tsx     # Build context requirements
│   │
│   └── ui/
│       ├── MatrxActionsContextMenu.tsx        # Context menu component
│       ├── MatrxActionsToolbar.tsx            # Toolbar component
│       └── MatrxActionsCommandPalette.tsx     # Command palette
│
├── hooks/
│   ├── useMatrxActions.ts                     # Access actions
│   ├── useMenuItems.ts                        # Access menu items
│   ├── useActionExecution.ts                  # Execute actions
│   └── useContextResolver.ts                  # Resolve context
│
├── services/
│   ├── actions-service.ts                     # CRUD for actions
│   ├── menu-items-service.ts                  # CRUD for menu items
│   ├── context-resolver.ts                    # Gather context intelligently
│   ├── action-executor.ts                     # Execute by type
│   └── seed-service.ts                        # Seed system data
│
└── state/
    ├── actions-slice.ts                       # Redux for actions
    └── menu-items-slice.ts                    # Redux for menu items
```

---

## 🎯 Context Resolution Strategy

The context resolver will be smart:

```typescript
// Example: User right-clicks with text selected

const action = {
  variable_context_map: {
    "text": {
      source: "selection",
      fallback: "editor_content",
      required: true
    },
    "targetLanguage": {
      source: "manual_input",
      prompt: "Select target language",
      default: "Spanish"
    }
  }
};

// Context Resolver automatically:
// 1. Checks for selected text
// 2. If none, falls back to editor content
// 3. If variable required and missing, shows error
// 4. For manual_input, shows modal/dropdown
// 5. Gathers all context before execution
```

---

## 📋 Admin Interface Plan

Following the ContentBlocksManager pattern, we'll have **TWO admin pages**:

1. **`/administration/matrx-actions`** - Manage core actions
   - Create/edit/delete actions
   - Configure variable mappings
   - Test action execution

2. **`/administration/matrx-menu-items`** - Organize menus
   - Drag-and-drop menu organization
   - Configure context requirements per placement
   - Preview menus in real-time

Both use similar pattern to `ContentBlocksManager` with:
- Split view (list + editor)
- Real-time preview
- Category/subcategory management
- Drag-and-drop reordering
- Search and filtering

---

## ✅ Summary: What's Different Now

**Before:** Mixed everything in one table
**Now:** Clean separation

| Concern | Table | Purpose |
|---------|-------|---------|
| **What it IS** | `matrx_actions` | Core action definition, execution config |
| **Where it APPEARS** | `matrx_action_menu_items` | UI placement, context requirements, display settings |

**Benefits:**
- ✅ One action → multiple placements
- ✅ Clean admin interfaces
- ✅ Easy to customize without breaking actions
- ✅ Better performance (targeted queries)
- ✅ User customization of menu structure

---

Does this separation make sense? Should I proceed with implementation?