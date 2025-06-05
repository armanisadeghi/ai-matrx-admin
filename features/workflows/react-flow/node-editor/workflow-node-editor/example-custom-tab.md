# NodeEditor Custom Tabs Examples

The refactored NodeEditor now supports custom tabs that can replace default tabs or add additional functionality. Here are examples of how to use this feature:

## Basic Usage (Default Tabs Only)

```tsx
<NodeEditor
  node={selectedNode}
  onSave={handleSave}
  onClose={handleClose}
  open={isOpen}
/>
```

## Example 1: Replace a Default Tab

```tsx
import { TabComponentProps } from './BasicsTab';

// Custom Basic Settings Tab
const CustomBasicsTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Basic Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your custom implementation */}
          <p>This replaces the default Basic tab</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Usage
<NodeEditor
  node={selectedNode}
  onSave={handleSave}
  onClose={handleClose}
  open={isOpen}
  customTabs={[
    {
      id: 'custom-basic',
      label: 'Custom Basic',
      component: CustomBasicsTab,
      replaces: 'basic' // This replaces the default Basic tab
    }
  ]}
/>
```

## Example 2: Add Additional Custom Tabs

```tsx
// Custom Analysis Tab
const AnalysisTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  const handleAnalyze = () => {
    // Custom analysis logic
    console.log('Analyzing node:', node);
  };

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Node Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyze}>
            Run Analysis
          </Button>
          {/* Display analysis results */}
        </CardContent>
      </Card>
    </div>
  );
};

// Performance Tab
const PerformanceTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Performance-specific controls */}
        </CardContent>
      </Card>
    </div>
  );
};

// Usage
<NodeEditor
  node={selectedNode}
  onSave={handleSave}
  onClose={handleClose}
  open={isOpen}
  additionalTabs={[
    {
      id: 'analysis',
      label: 'Analysis',
      component: AnalysisTab
    },
    {
      id: 'performance',
      label: 'Performance',
      component: PerformanceTab
    }
  ]}
/>
```

## Example 3: Combined Usage

```tsx
<NodeEditor
  node={selectedNode}
  onSave={handleSave}
  onClose={handleClose}
  open={isOpen}
  customTabs={[
    {
      id: 'enhanced-arguments',
      label: 'Enhanced Args',
      component: EnhancedArgumentsTab,
      replaces: 'arguments' // Replace default Arguments tab
    }
  ]}
  additionalTabs={[
    {
      id: 'validation',
      label: 'Validation',
      component: ValidationTab
    },
    {
      id: 'testing',
      label: 'Testing',
      component: TestingTab
    }
  ]}
/>
```

## Creating Custom Tab Components

All custom tab components must implement the `TabComponentProps` interface:

```tsx
import { TabComponentProps } from './BasicsTab';

const MyCustomTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  // Update the node when changes are made
  const handleUpdate = (changes: Partial<BaseNode>) => {
    onNodeUpdate({ ...node, ...changes });
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Your custom UI */}
    </div>
  );
};
```

## Key Points

1. **Identical Interface**: All custom tabs must use the same `TabComponentProps` interface
2. **State Management**: Custom tabs manage the full node object internally via `onNodeUpdate`
3. **Reactivity**: Changes in custom tabs automatically reflect in other tabs since they share the same node state
4. **Flexibility**: You can replace any default tab or add entirely new functionality
5. **Type Safety**: All tabs are fully typed with TypeScript

## Default Tab IDs

- `basic` - Basic settings (step name, function type, execution required)
- `arguments` - Function arguments with default values and broker mappings
- `mappings` - Argument mappings between brokers and arguments
- `dependencies` - Workflow dependencies
- `brokers` - Return broker overrides
- `object` - JSON object editor

Use these IDs in the `replaces` field to override specific default tabs. 