# Tool Updates Overlay

This component system displays MCP (Model Context Protocol) tool updates in a dynamic tabbed overlay.

## Features

- **Dynamic Tabs**: Each tool update automatically generates its own tab
- **Type-Based Rendering**: Different visual treatments for each update type
- **Custom Components**: Registered components for specific step_data types
- **Space Efficient**: Minimal chrome, maximum content

## Tool Update Types

### 1. `mcp_input` - Tool Input
Shows tool name and arguments with blue styling

### 2. `mcp_output` - Tool Output  
Shows results with green success styling

### 3. `mcp_error` - Tool Error
Shows error messages with red error styling

### 4. `step_data` - Step Data
Uses custom registered components when available, otherwise shows raw JSON

### 5. `user_visible_message` - User Message
Shows messages with purple styling

## Adding New Step Data Components

To add a new custom component for a `step_data` type:

### 1. Create Your Component

Create your component in `features/workflows/results/registered-components/`:

```tsx
// YourComponent.tsx
interface YourDataType {
    type: string;
    content: {
        // your specific content structure
    };
}

interface YourComponentProps {
    data: YourDataType;
}

const YourComponent: React.FC<YourComponentProps> = ({ data }) => {
    // Your custom rendering logic
    return <div>...</div>;
};

export default YourComponent;
```

### 2. Register Your Component

Add it to `stepDataRegistry.tsx`:

```tsx
import YourComponent from "@/features/workflows/results/registered-components/YourComponent";

export const stepDataRegistry: Record<string, React.ComponentType<{ data: any }>> = {
    "brave_search": BraveSearchDisplay,
    "your_step_type": YourComponent,  // Add this line
};
```

**That's it!** The overlay will automatically use your component when it encounters step_data with `type: "your_step_type"`.

## Usage Example

```tsx
import { ToolUpdatesOverlay } from "@/features/chat/components/response/tool-updates";

const MyComponent = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toolUpdates = useAppSelector(selectResponseToolUpdatesByListenerId(listenerId));

    return (
        <>
            <button onClick={() => setIsOpen(true)}>View Tools</button>
            <ToolUpdatesOverlay
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                toolUpdates={toolUpdates}
            />
        </>
    );
};
```

## Component Files

- **`ToolUpdatesOverlay.tsx`** - Main overlay component with tab generation and rendering
- **`stepDataRegistry.tsx`** - Registry mapping step types to components
- **`index.ts`** - Barrel export file
- **`README.md`** - This documentation

