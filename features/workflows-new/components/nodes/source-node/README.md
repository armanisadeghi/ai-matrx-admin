# Source Node Architecture

## Overview

The source node system has been refactored to use a base component pattern that eliminates code duplication and provides a consistent interface for all source node types.

## Base Components

### `BaseSourceNode`

The `BaseSourceNode` component handles all common functionality:

- **Card structure** (compact and detailed modes)
- **Active toggle switch**
- **Status icons** (execution required, status)
- **Handles** (left and right with proper positioning)
- **Toolbar integration**
- **Settings modal integration**
- **Display mode switching**
- **Common styling and interactions**

### Key Benefits

1. **No Code Duplication**: Common elements are implemented once
2. **Consistent Behavior**: All nodes behave the same way
3. **Easy Customization**: Custom content slots for node-specific functionality
4. **Type Safety**: Proper TypeScript interfaces for all props
5. **Maintainability**: Changes to common behavior update all nodes

## Creating New Source Node Types

### Example: UserDataSourceNode

```typescript
const UserDataSourceNodeComponent: React.FC<UserDataSourceNodeProps> = (props) => {
    const { data } = props;
    const { brokerId, workflowId } = data;
    
    // Get data from Redux
    const userDataSource = useAppSelector((state) => 
        workflowSelectors.userDataSourceByBrokerId(state, brokerId)
    );
    
    // Custom compact content (optional)
    const CompactContent = useCallback(() => (
        <div className="relative">
            <Database className="w-4 h-4 text-foreground" />
            {selectedTable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
            )}
        </div>
    ), [selectedTable]);

    // Custom detailed content (optional)
    const DetailedContent = useCallback(({ leftHandleLabel, rightHandleLabel }) => (
        <>
            {/* Custom UI for table selection */}
            <div className="space-y-2 mb-2">
                {selectedTable ? (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
                        <Database className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-foreground truncate">
                                {selectedTable.description || selectedTable.table_name}
                            </div>
                        </div>
                        <TableReferenceIcon onReferenceSelect={handleReferenceSelect} />
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 border-2 border-dashed border-muted-foreground/30 rounded">
                        <Database className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-muted-foreground">
                                No table selected
                            </div>
                        </div>
                        <TableReferenceIcon onReferenceSelect={handleReferenceSelect} />
                    </div>
                )}
            </div>
        </>
    ), [selectedTable, handleReferenceSelect]);

    return (
        <BaseSourceNode
            {...props}
            icon={Database}
            displayText={displayText}
            brokerDisplayName={brokerDisplayName}
            CompactContent={CompactContent}
            DetailedContent={DetailedContent}
            onActiveToggle={(active) => {
                // Handle active state changes
            }}
        />
    );
};
```

## Integration with TableReferenceIcon

The `UserDataSourceNode` demonstrates perfect integration with the `TableReferenceIcon`:

1. **Easy Setup**: Just pass `onReferenceSelect` callback
2. **Automatic State Management**: Selected table is stored in Redux
3. **Visual Feedback**: Shows selected table details or selection prompt
4. **Consistent UX**: Same table selection experience across the app

### TableReferenceIcon Usage

```typescript
<TableReferenceIcon
    onReferenceSelect={handleReferenceSelect}
    size="sm"
    variant="outline"
    title="Select Table Reference"
/>
```

When a table is selected, the callback receives a `UserDataReference` object that can be directly stored in Redux.

## Migration Path

### From Old Pattern

```typescript
// OLD: 300+ lines of duplicated code per node
const MySourceNode = () => {
    // Duplicate card structure
    // Duplicate active toggle
    // Duplicate status icons
    // Duplicate handles
    // Duplicate toolbar
    // Custom content mixed with common elements
    return <Card>...</Card>;
};
```

### To New Pattern

```typescript
// NEW: 50-100 lines focused on unique functionality
const MySourceNode = () => {
    // Only custom logic
    const CustomContent = () => <div>My custom UI</div>;
    
    return (
        <BaseSourceNode
            icon={MyIcon}
            displayText="My Node"
            DetailedContent={CustomContent}
            {...commonProps}
        />
    );
};
```

## Available Props

### BaseSourceNode Props

- `icon`: Icon component to display
- `displayText`: Text shown in header and tooltip
- `brokerDisplayName`: Broker name for handle labels
- `leftHandleLabel`/`rightHandleLabel`: Custom handle labels
- `CompactContent`: Custom compact mode content
- `DetailedContent`: Custom detailed mode content
- `ToolbarComponent`: Custom toolbar component
- `SettingsComponent`: Custom settings modal
- `onActiveToggle`: Active state change handler
- `onDoubleClick`: Double-click handler
- `onSettings`: Settings button handler

### Content Component Props

Both `CompactContent` and `DetailedContent` receive:

- `leftHandleLabel`: Label for left handle
- `rightHandleLabel`: Label for right handle

## Best Practices

1. **Keep Custom Content Focused**: Only implement what's unique to your node type
2. **Use Redux for State**: Store node-specific data in Redux, not local state
3. **Leverage Existing Components**: Use components like `TableReferenceIcon` for common patterns
4. **Consistent Styling**: Follow the established design patterns
5. **Type Safety**: Always provide proper TypeScript interfaces

## Future Enhancements

- **Settings Templates**: Common settings patterns for different node types
- **Validation Helpers**: Built-in validation for common data types
- **Animation Presets**: Standardized animations for state changes
- **Accessibility**: Enhanced keyboard navigation and screen reader support 