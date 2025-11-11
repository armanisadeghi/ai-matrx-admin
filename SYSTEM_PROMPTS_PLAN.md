# System Prompts - Final Simplified Approach

## Core Principle
**Database = Storage. Code = Logic.**

Each system_prompt record = ONE specific instance of a prompt tied to ONE specific UI component.

### The Three Requirements:

1. **Functionality (Required)** - Tied to REAL CODE
   - Example: "Content Expander Card" requires variables: `title`, `description`, `context`
   - Example: "Translate Text" requires variable: `content` or `text`
   - Cannot publish without matching code functionality

2. **Prompt Snapshot (Admin provides)** - The actual prompt
   - Admin builds prompt, tests it, then publishes to system prompts
   - Variables MUST match what the code expects
   - System validates before allowing publish

3. **Where to Show** - Placement configuration
   - Context Menu: category drives where it appears
   - Card: Just marked as "Card" - used in specific code locations
   - Button: Category/location drives where it appears

**Key Insight:** If you want the same prompt in multiple places, create multiple system_prompt records. Simple.

---

## Step 1: Clean Up Database Table

### Remove Unnecessary Fields:
```sql
-- REMOVE these from system_prompts:
-- ❌ required_variables (already in prompt_snapshot.messages)
-- ❌ optional_variables (already in prompt_snapshot.messages)
-- ❌ variable_mappings (this is UI logic, not storage)
-- ❌ total_executions (waste of resources)
-- ❌ unique_users_count (waste of resources)
-- ❌ last_executed_at (waste of resources)
-- ❌ placement_config (confusing with category/subcategory)

ALTER TABLE system_prompts 
DROP COLUMN IF EXISTS required_variables,
DROP COLUMN IF EXISTS optional_variables,
DROP COLUMN IF EXISTS variable_mappings,
DROP COLUMN IF EXISTS total_executions,
DROP COLUMN IF EXISTS unique_users_count,
DROP COLUMN IF EXISTS last_executed_at,
DROP COLUMN IF EXISTS placement_config;
```

### Add New Fields:
```sql
-- ADD these to system_prompts:
-- ✅ placement_type (what kind of UI component)
-- ✅ functionality_id (ties to REAL CODE functionality)
-- ✅ placement_settings (simple flags only)

ALTER TABLE system_prompts
ADD COLUMN IF NOT EXISTS placement_type TEXT NOT NULL DEFAULT 'context-menu',
ADD COLUMN IF NOT EXISTS functionality_id TEXT,
ADD COLUMN IF NOT EXISTS placement_settings JSONB DEFAULT '{}';

-- Add check constraint for placement_type
ALTER TABLE system_prompts
DROP CONSTRAINT IF EXISTS system_prompts_placement_type_check,
ADD CONSTRAINT system_prompts_placement_type_check 
  CHECK (placement_type IN (
    'context-menu',
    'card', 
    'button',
    'modal',
    'link',
    'action'
  ));

-- Add index for placement_type
CREATE INDEX IF NOT EXISTS idx_system_prompts_placement_type 
  ON system_prompts(placement_type);

-- Add index for functionality_id
CREATE INDEX IF NOT EXISTS idx_system_prompts_functionality_id 
  ON system_prompts(functionality_id);
```

### Final Simplified Table Structure:
```sql
system_prompts {
  id                  -- UUID primary key
  system_prompt_id    -- Human-readable ID (e.g., "translate-spanish-001")
  name                -- Display name
  description         -- Optional description
  
  -- Prompt data
  source_prompt_id    -- Link to original prompt (for updates)
  version             -- Version number
  prompt_snapshot     -- The actual prompt (messages, variables, settings)
  
  -- CRITICAL: Where and what this is for
  placement_type      -- 'context-menu' | 'card' | 'button' | 'modal' | 'link'
  functionality_id    -- Ties to REAL CODE (e.g., 'content-expander-card', 'translate-text')
  category            -- Drives where it appears (like ContentBlocksManager)
  subcategory         -- Optional sub-grouping
  placement_settings  -- Simple flags ONLY (requiresSelection, allowChat, etc.)
  
  -- Display
  display_config      -- JSONB: { icon, label, badge }
  tags                -- For search/filtering
  sort_order          -- Display order within category
  
  -- Status
  is_active           -- Show/hide toggle
  is_featured         -- Pin to top or highlight
  status              -- draft/published/archived
  
  -- Metadata
  published_by        -- Who published it
  published_at        -- When published
  last_updated_by     -- Who last updated
  last_updated_at     -- When updated
  update_notes        -- What changed
  metadata            -- Any other data
  
  created_at
  updated_at
}
```

### Key Changes Explained:

**1. placement_type** - What kind of UI component is this?
- Replaces the confusing placement_config array approach
- One record = one placement type
- Want same prompt in multiple places? Create multiple records!

**2. functionality_id** - Ties to REAL CODE
- Examples: `content-expander-card`, `translate-text`, `explain-concept`
- Code defines required variables for each functionality
- System validates prompt variables match functionality requirements
- This is CRITICAL - without matching functionality, code won't work!

**3. category/subcategory** - Drives WHERE it appears (like ContentBlocksManager)
- For context menus: category = "text-operations", subcategory = "translation"
- For cards: category = "educational" 
- For buttons: category = "toolbar", subcategory = "quick-actions"
- Simple, clear hierarchy

**4. placement_settings** - Simple flags ONLY
```json
// Context menu example:
{ "requiresSelection": true, "minSelectionLength": 10 }

// Card example:
{ "allowChat": true, "allowInitialMessage": false }

// Button example:
{ "variant": "primary", "size": "sm", "showIcon": true }
```

---

## Step 2: Define Code Functionalities

**These are the REAL CODE components that system prompts can plug into:**

```typescript
// types/system-prompt-functionalities.ts

export interface FunctionalityDefinition {
  id: string;
  name: string;
  description: string;
  placementTypes: string[]; // Which placement types support this
  requiredVariables: string[]; // Variables the CODE expects
  optionalVariables?: string[];
  examples?: string[];
}

// These are HARDCODED in the codebase - they represent REAL components
export const SYSTEM_FUNCTIONALITIES: Record<string, FunctionalityDefinition> = {
  'content-expander-card': {
    id: 'content-expander-card',
    name: 'Content Expander Card',
    description: 'Cards that expand on educational content',
    placementTypes: ['card'],
    requiredVariables: ['title', 'description', 'context'],
    examples: ['Vocabulary term cards', 'Concept explainers']
  },
  
  'translate-text': {
    id: 'translate-text',
    name: 'Translate Text',
    description: 'Translate selected or provided text',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['text'],
    optionalVariables: ['target_language'],
    examples: ['Translate to Spanish', 'Translate to French']
  },
  
  'explain-concept': {
    id: 'explain-concept',
    name: 'Explain Concept',
    description: 'Explain selected text or concept',
    placementTypes: ['context-menu', 'button', 'modal'],
    requiredVariables: ['concept'],
    optionalVariables: ['context'],
    examples: ['Explain selection', 'What is this?']
  },
  
  'analyze-code': {
    id: 'analyze-code',
    name: 'Analyze Code',
    description: 'Analyze code for improvements, bugs, etc.',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['current_code'],
    optionalVariables: ['language', 'framework'],
    examples: ['Find bugs', 'Suggest improvements', 'Explain code']
  },
  
  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Custom functionality with no variable requirements',
    placementTypes: ['context-menu', 'card', 'button', 'modal', 'link'],
    requiredVariables: [],
    examples: ['Experimental features']
  }
};

// Validation function
export function validatePromptForFunctionality(
  promptSnapshot: any,
  functionalityId: string
): { valid: boolean; missing: string[]; extra: string[] } {
  const functionality = SYSTEM_FUNCTIONALITIES[functionalityId];
  if (!functionality) {
    return { valid: false, missing: [], extra: [] };
  }

  // Extract variables from prompt
  const variables = extractVariablesFromPrompt(promptSnapshot);
  
  // Check required variables
  const missing = functionality.requiredVariables.filter(v => !variables.includes(v));
  
  // For custom, allow anything
  if (functionalityId === 'custom') {
    return { valid: missing.length === 0, missing, extra: [] };
  }
  
  // Check for extra variables
  const allowed = [...functionality.requiredVariables, ...(functionality.optionalVariables || [])];
  const extra = variables.filter(v => !allowed.includes(v));
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}
```

### Example Records:

**Example 1: Translate to Spanish (Context Menu)**
```sql
INSERT INTO system_prompts (
  system_prompt_id,
  name,
  description,
  placement_type,
  functionality_id,
  category,
  subcategory,
  placement_settings,
  prompt_snapshot,
  display_config
) VALUES (
  'translate-spanish-context-menu',
  'Translate to Spanish',
  'Translate selected text to Spanish',
  'context-menu',
  'translate-text',
  'text-operations',
  'translation',
  '{"requiresSelection": true, "minSelectionLength": 1}',
  '{"messages": [...], "variables": ["text"]}', -- Must have 'text' variable!
  '{"icon": "Languages", "label": "Translate to Spanish"}'
);
```

**Example 2: Same Translate Prompt as a Button**
```sql
INSERT INTO system_prompts (
  system_prompt_id,
  name,
  placement_type,
  functionality_id,
  category,
  source_prompt_id,  -- SAME source prompt!
  prompt_snapshot    -- SAME snapshot!
) VALUES (
  'translate-spanish-button',
  'Translate to Spanish',
  'button',
  'translate-text',
  'toolbar',
  '<same-source-prompt-id>',
  '{"messages": [...], "variables": ["text"]}'  -- Same prompt!
);
```

**Example 3: Content Expander Card**
```sql
INSERT INTO system_prompts (
  system_prompt_id,
  name,
  placement_type,
  functionality_id,
  category,
  placement_settings,
  prompt_snapshot
) VALUES (
  'vocab-expander-card',
  'Vocabulary Expander',
  'card',
  'content-expander-card',
  'educational',
  '{"allowChat": true, "allowInitialMessage": false}',
  '{"messages": [...], "variables": ["title", "description", "context"]}'  -- Must have all 3!
);
```

---

## Step 3: Code-Based Variable Resolution

**The CODE figures out which variables to use based on functionality:**

```typescript
// lib/services/prompt-context-resolver.ts

interface UIContext {
  // Available data from UI
  selection?: string;
  editorContent?: string;
  currentCode?: string;
  cardTitle?: string;
  cardDescription?: string;
  cardContext?: string;
  pageUrl?: string;
  userId?: string;
  [key: string]: any;
}

export class PromptContextResolver {
  /**
   * Extract variables from prompt snapshot
   */
  static getVariables(promptSnapshot: any): string[] {
    const variables = new Set<string>();
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    
    promptSnapshot.messages?.forEach((msg: any) => {
      let match;
      while ((match = regex.exec(msg.content)) !== null) {
        variables.add(match[1]);
      }
    });
    
    return Array.from(variables);
  }

  /**
   * Resolve variables based on functionality and available data
   * This uses the functionality_id to know what variables to map
   */
  static resolve(
    promptSnapshot: any,
    functionalityId: string,
    placementType: string,
    uiContext: UIContext
  ): Record<string, any> {
    const variables = this.getVariables(promptSnapshot);
    const resolved: Record<string, any> = {};

    // Resolve based on functionality
    for (const varName of variables) {
      resolved[varName] = this.resolveVariable(
        varName, 
        functionalityId,
        placementType,
        uiContext
      );
    }

    return resolved;
  }

  private static resolveVariable(
    varName: string,
    functionalityId: string,
    placementType: string,
    uiContext: UIContext
  ): any {
    // Functionality-based mapping (the CODE knows what each functionality needs)
    switch (functionalityId) {
      case 'content-expander-card':
        // Cards always get these specific variables
        if (varName === 'title') return uiContext.cardTitle;
        if (varName === 'description') return uiContext.cardDescription;
        if (varName === 'context') return uiContext.cardContext;
        break;

      case 'translate-text':
        // Text translation needs the text to translate
        if (varName === 'text' || varName === 'content') {
          return uiContext.selection || uiContext.editorContent;
        }
        if (varName === 'target_language') return uiContext.targetLanguage;
        break;

      case 'explain-concept':
        // Explain needs the concept (selection) and optional context
        if (varName === 'concept') {
          return uiContext.selection || uiContext.concept;
        }
        if (varName === 'context') {
          return uiContext.editorContent || uiContext.context;
        }
        break;

      case 'analyze-code':
        // Code analysis needs the code
        if (varName === 'current_code' || varName === 'code') {
          return uiContext.currentCode || uiContext.selection;
        }
        if (varName === 'language') return uiContext.language;
        if (varName === 'framework') return uiContext.framework;
        break;

      case 'custom':
        // Custom: try direct match first, then common fallbacks
        if (uiContext[varName]) return uiContext[varName];
        // Common fallbacks
        if (varName === 'text' || varName === 'content') {
          return uiContext.selection || uiContext.editorContent;
        }
        break;
    }

    // Direct match as fallback
    return uiContext[varName];
  }
}
```

---

## Step 4: Admin UI - Convert Prompt Modal

**When admin clicks "Make Global System Prompt", show this flow:**

```typescript
// components/admin/ConvertToSystemPromptModal.tsx (updated)

function ConvertToSystemPromptModal({ promptId, promptName }) {
  const [step, setStep] = useState<'functionality' | 'placement' | 'confirm'>();
  const [selectedFunctionality, setSelectedFunctionality] = useState<string>();
  const [placementType, setPlacementType] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [validation, setValidation] = useState<any>();

  // Step 1: Select Functionality
  const FunctionalityStep = () => (
    <div className="space-y-4">
      <h3>What functionality does this prompt provide?</h3>
      <p className="text-sm text-muted-foreground">
        Select the code functionality this prompt will power. Your prompt's variables 
        must match the functionality's requirements.
      </p>

      <RadioGroup value={selectedFunctionality} onValueChange={setSelectedFunctionality}>
        {Object.values(SYSTEM_FUNCTIONALITIES).map(func => (
          <Card key={func.id} className="p-4">
            <Radio value={func.id}>
              <div>
                <div className="font-semibold">{func.name}</div>
                <div className="text-sm text-muted-foreground">{func.description}</div>
                <div className="text-xs mt-2">
                  Required variables: {func.requiredVariables.map(v => `{{${v}}}`).join(', ')}
                </div>
              </div>
            </Radio>
          </Card>
        ))}
      </RadioGroup>

      {selectedFunctionality && (
        <ValidationPanel
          promptSnapshot={promptSnapshot}
          functionalityId={selectedFunctionality}
        />
      )}

      <Button 
        onClick={() => setStep('placement')}
        disabled={!validation?.valid}
      >
        Next: Choose Placement
      </Button>
    </div>
  );

  // Step 2: Select Placement
  const PlacementStep = () => {
    const functionality = SYSTEM_FUNCTIONALITIES[selectedFunctionality];
    
    return (
      <div className="space-y-4">
        <h3>Where should this appear?</h3>

        <Select value={placementType} onValueChange={setPlacementType}>
          <SelectTrigger>
            <SelectValue placeholder="Select placement type" />
          </SelectTrigger>
          <SelectContent>
            {functionality.placementTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {placementType && (
          <>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getCategoriesForPlacementType(placementType).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Placement-specific settings */}
            {placementType === 'context-menu' && (
              <Checkbox label="Requires text selection" />
            )}
            {placementType === 'card' && (
              <>
                <Checkbox label="Allow chat mode" />
                <Checkbox label="Allow initial message" />
              </>
            )}
          </>
        )}

        <Button onClick={() => setStep('confirm')}>
          Next: Confirm
        </Button>
      </div>
    );
  };

  // Step 3: Confirm and Create
  const ConfirmStep = () => (
    <div className="space-y-4">
      <h3>Confirm System Prompt</h3>
      
      <Card className="p-4">
        <div><strong>Functionality:</strong> {SYSTEM_FUNCTIONALITIES[selectedFunctionality].name}</div>
        <div><strong>Placement:</strong> {placementType}</div>
        <div><strong>Category:</strong> {category}</div>
      </Card>

      <Button onClick={handleCreate}>
        Create System Prompt
      </Button>
    </div>
  );

  const handleCreate = async () => {
    await fetch('/api/prompts/convert-to-system-prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt_id: promptId,
        functionality_id: selectedFunctionality,
        placement_type: placementType,
        category,
        subcategory,
        placement_settings
      })
    });
  };

  return (
    <Dialog>
      {step === 'functionality' && <FunctionalityStep />}
      {step === 'placement' && <PlacementStep />}
      {step === 'confirm' && <ConfirmStep />}
    </Dialog>
  );
}
```

---

## Step 5: Dynamic Component Loading

**Components load from database, code handles execution:**

```typescript
// components/placements/DynamicContextMenu.tsx

export function DynamicContextMenu({ children, uiContext }) {
  const { data: systemPrompts } = useQuery({
    queryKey: ['system-prompts', 'context-menu'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('placement_type', 'context-menu')  // Simple!
        .eq('is_active', true)
        .eq('status', 'published')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      
      return data;
    }
  });

  const handleActionTrigger = async (systemPrompt: any) => {
    // CODE resolves variables based on functionality
    const variables = PromptContextResolver.resolve(
      systemPrompt.prompt_snapshot,
      systemPrompt.functionality_id,
      'context-menu',
      uiContext
    );

    // Execute prompt with resolved variables
    await executePrompt(systemPrompt.id, variables);
  };

  // Group by category (like ContentBlocksManager)
  const byCategory = groupBy(systemPrompts, 'category');

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {Object.entries(byCategory).map(([categoryName, items]) => {
          // Check if any items have subcategory
          const hasSubcategories = items.some(i => i.subcategory);
          
          if (!hasSubcategories) {
            // Simple category with items
            return (
              <ContextMenuSub key={categoryName}>
                <ContextMenuSubTrigger>
                  {formatCategoryName(categoryName)}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {items.map(item => (
                    <ContextMenuItem
                      key={item.id}
                      onClick={() => handleActionTrigger(item)}
                      disabled={checkRequirements(item, uiContext)}
                    >
                      {item.display_config?.icon && <Icon name={item.display_config.icon} />}
                      {item.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          } else {
            // Category with subcategories
            const bySubcategory = groupBy(items, 'subcategory');
            return (
              <ContextMenuSub key={categoryName}>
                <ContextMenuSubTrigger>
                  {formatCategoryName(categoryName)}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {Object.entries(bySubcategory).map(([subName, subItems]) => (
                    <ContextMenuSub key={subName}>
                      <ContextMenuSubTrigger>
                        {formatCategoryName(subName)}
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {subItems.map(item => (
                          <ContextMenuItem
                            key={item.id}
                            onClick={() => handleActionTrigger(item)}
                          >
                            {item.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          }
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Check if item's requirements are met
function checkRequirements(systemPrompt: any, uiContext: UIContext): boolean {
  const settings = systemPrompt.placement_settings || {};
  
  // If requires selection but none available, disable
  if (settings.requiresSelection && !uiContext.selection) {
    return true; // disabled
  }
  
  // If requires minimum selection length
  if (settings.minSelectionLength && 
      uiContext.selection?.length < settings.minSelectionLength) {
    return true; // disabled
  }
  
  return false; // enabled
}
```

---

## Step 6: Migrate Hardcoded Actions

**Simple migration script:**

```typescript
// scripts/migrate-actions.ts

import { SYSTEM_ACTIONS, SYSTEM_MENU_ITEMS } from '@/features/matrx-actions/constants';

async function migrate() {
  for (const action of SYSTEM_ACTIONS) {
    // Find the menu items for this action
    const menuItems = SYSTEM_MENU_ITEMS.filter(mi => mi.actionId === action.id);
    
    // Build placement_config from menu items
    const placementConfig = {
      contextMenu: menuItems
        .filter(mi => mi.menuType === 'context_menu')
        .map(mi => ({
          enabled: mi.showInMenu,
          category: mi.category,
          subcategory: mi.subcategory,
          standalone: mi.category === 'standalone',
          order: mi.displayOrder,
          requiresSelection: mi.contextRequirements?.requiresSelection
        }))
    };

    // Get the actual prompt
    const { data: prompt } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', action.promptId)
      .single();

    if (!prompt) {
      console.log(`Prompt not found for action ${action.id}`);
      continue;
    }

    // Create system prompt
    await supabase.from('system_prompts').insert({
      system_prompt_id: action.id,
      name: action.name,
      description: action.description,
      source_prompt_id: action.promptId,
      prompt_snapshot: {
        messages: prompt.messages,
        settings: prompt.settings,
        name: prompt.name
      },
      display_config: {
        icon: action.icon,
        label: action.name
      },
      placement_config: placementConfig,
      category: 'migrated-actions',
      is_active: true,
      status: 'published'
    });

    console.log(`✓ Migrated ${action.name}`);
  }
}
```

---

## Summary: Final Approach

### Key Principles:

1. **One Record = One Specific Instance**
   - Each system_prompt record is ONE prompt in ONE specific UI location
   - Want same prompt in multiple places? Create multiple records!
   - Simple, clear, no confusion

2. **Functionality-Driven**
   - `functionality_id` ties to REAL CODE components
   - Code defines required variables
   - System validates prompt matches functionality
   - Cannot publish without valid functionality match

3. **Category-Driven Placement** (like ContentBlocksManager)
   - `placement_type` = what kind of component
   - `category`/`subcategory` = where it appears
   - Simple hierarchy, no complex nesting

4. **Code Handles Logic**
   - Variable resolution based on functionality
   - Context awareness
   - UI rendering
   - Menu building
   - Validation

### Database Role:
**JUST** storage for:
- Prompt snapshot
- Functionality ID (ties to code)
- Placement type + category (where to show)
- Simple flags (placement_settings)
- Display info (icon, label)
- Status (active/inactive)

### Code Role:
**ALL** the logic:
- Define functionalities and their required variables
- Variable resolution per functionality
- Validation
- Context awareness
- UI rendering
- Execution

---

## Migration Script

```sql
-- Step 1: Clean up table
ALTER TABLE system_prompts 
DROP COLUMN IF EXISTS required_variables,
DROP COLUMN IF EXISTS optional_variables,
DROP COLUMN IF EXISTS variable_mappings,
DROP COLUMN IF EXISTS total_executions,
DROP COLUMN IF EXISTS unique_users_count,
DROP COLUMN IF EXISTS last_executed_at,
DROP COLUMN IF EXISTS placement_config;

-- Step 2: Add new fields
ALTER TABLE system_prompts
ADD COLUMN IF NOT EXISTS placement_type TEXT NOT NULL DEFAULT 'context-menu',
ADD COLUMN IF NOT EXISTS functionality_id TEXT,
ADD COLUMN IF NOT EXISTS placement_settings JSONB DEFAULT '{}';

-- Step 3: Add constraints and indexes
ALTER TABLE system_prompts
DROP CONSTRAINT IF EXISTS system_prompts_placement_type_check,
ADD CONSTRAINT system_prompts_placement_type_check 
  CHECK (placement_type IN ('context-menu', 'card', 'button', 'modal', 'link', 'action'));

CREATE INDEX IF NOT EXISTS idx_system_prompts_placement_type 
  ON system_prompts(placement_type);

CREATE INDEX IF NOT EXISTS idx_system_prompts_functionality_id 
  ON system_prompts(functionality_id);

-- Step 4: Update existing records to have placement_type
-- (if you have any existing records, they'll need to be set)
UPDATE system_prompts
SET placement_type = 'card'
WHERE placement_type IS NULL;

-- Done!
```

---

## Next Steps

1. ✅ **Run migration** (see above)
2. **Create functionality definitions** (types/system-prompt-functionalities.ts)
3. **Update ConvertToSystemPromptModal** (3-step flow: functionality → placement → confirm)
4. **Create PromptContextResolver** service
5. **Update DynamicContextMenu** to load by placement_type
6. **Test with one example** (e.g., translate-text in context menu)
7. **Migrate hardcoded actions** one by one
8. **Build simple admin manager** (if needed - current one might work!)

**Time estimate:** 2-3 days

Simple. Clean. Effective. No over-engineering.

