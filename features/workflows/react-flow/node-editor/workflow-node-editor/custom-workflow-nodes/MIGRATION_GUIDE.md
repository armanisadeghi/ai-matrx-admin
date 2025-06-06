# Custom Workflow Nodes Migration Guide

## Problem with Current Implementation

The current custom workflow nodes implementation has several issues:

1. **Duplicated Logic**: `node-data-methods.ts` reimplements logic that already exists in our centralized utilities
2. **Context Provider Overhead**: Uses React Context when simple prop drilling would suffice
3. **Sync Issues**: Updates don't go through the same validation and processing pipeline
4. **Maintenance Burden**: Logic changes need to be made in multiple places

## Recommended Solution: Use Centralized Utilities

We have centralized all workflow node logic into utility files:
- `arg-utils.ts` - Argument and broker management
- `dependency-utils.ts` - Workflow dependencies
- `mapping-utils.ts` - Argument mappings  
- `node-object-utils.ts` - JSON manipulation
- `overview-utils.ts` - Data aggregation
- `index.ts` - Exports all utilities

## Migration Options

### Option 1: Use SimplifiedCustomNodeEditor (Recommended)

Replace the context provider approach with the simplified editor:

```tsx
import SimplifiedCustomNodeEditor from './SimplifiedCustomNodeEditor';

// Instead of this:
<CustomNodeEditorManager node={node} onSave={onSave} onClose={onClose} open={open}>
  <MyCustomComponent />
</CustomNodeEditorManager>

// Use this:
<SimplifiedCustomNodeEditor node={node} onSave={onSave} onClose={onClose} open={open}>
  <MyCustomComponent />
</SimplifiedCustomNodeEditor>
```

Your custom components receive `nodeUtilities` as a prop:

```tsx
interface MyCustomComponentProps {
  nodeUtilities?: {
    node: BaseNode;
    updateStepName: (name: string) => void;
    updateArgOverride: (argName: string, field: string, value: any) => void;
    addWorkflowDependency: () => void;
    // ... all other utilities
    save: () => void;
    reset: () => void;
    hasChanges: boolean;
  };
}

const MyCustomComponent: React.FC<MyCustomComponentProps> = ({ nodeUtilities }) => {
  if (!nodeUtilities) return null;
  
  return (
    <div>
      <input 
        value={nodeUtilities.node.step_name || ''} 
        onChange={(e) => nodeUtilities.updateStepName(e.target.value)}
      />
      {nodeUtilities.hasChanges && (
        <button onClick={nodeUtilities.save}>Save Changes</button>
      )}
    </div>
  );
};
```

### Option 2: Direct Import of Utilities

For maximum flexibility, import utilities directly:

```tsx
import * as NodeUtils from '../utils';

const MyCustomComponent: React.FC<{ node: BaseNode; onUpdate: (node: BaseNode) => void }> = ({ node, onUpdate }) => {
  const handleStepNameChange = (stepName: string) => {
    onUpdate({ ...node, step_name: stepName });
  };
  
  const handleArgChange = (argName: string, value: any) => {
    NodeUtils.updateArgOverride(node, onUpdate, argName, 'default_value', value);
  };
  
  return (
    <div>
      <input 
        value={node.step_name || ''} 
        onChange={(e) => handleStepNameChange(e.target.value)}
      />
    </div>
  );
};
```

## Benefits of Migration

1. **Single Source of Truth**: All logic goes through the same utilities
2. **Consistent Behavior**: Same validation and processing as main editor
3. **No Duplication**: Remove 300+ lines of duplicated code
4. **Better Performance**: No context provider overhead
5. **Easier Testing**: Test utilities directly
6. **Simpler Architecture**: Clear data flow

## Files to Update/Remove After Migration

### Keep (but update to use utilities):
- Custom component files that have unique UI logic
- Any custom tabs that provide specialized interfaces

### Remove/Deprecate:
- `NodeDataContext.tsx` - Replace with prop drilling
- `CustomNodeEditorManager.tsx` - Replace with SimplifiedCustomNodeEditor
- `node-data-methods.ts` - Logic now handled by centralized utilities
- Complex type definitions that duplicate existing types

### Update:
- Custom components to receive `nodeUtilities` prop instead of using context
- Import statements to use centralized utilities

## Example Migration

**Before:**
```tsx
// Custom component using context
const MyComponent = () => {
  const { node, methods } = useNodeData();
  return (
    <input 
      value={node.step_name} 
      onChange={(e) => methods.updateStepName(e.target.value)} 
    />
  );
};

// Usage with context provider
<CustomNodeEditorManager node={node} onSave={onSave}>
  <MyComponent />
</CustomNodeEditorManager>
```

**After:**
```tsx
// Custom component using props
const MyComponent = ({ nodeUtilities }) => {
  return (
    <input 
      value={nodeUtilities.node.step_name} 
      onChange={(e) => nodeUtilities.updateStepName(e.target.value)} 
    />
  );
};

// Usage with simplified editor
<SimplifiedCustomNodeEditor node={node} onSave={onSave}>
  <MyComponent />
</SimplifiedCustomNodeEditor>
```

This approach eliminates duplication while maintaining the flexibility to create custom UIs for specific workflow nodes. 