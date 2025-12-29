# Tool Updates Overlay

> **⚠️ DEPRECATED DOCUMENTATION**: This README describes the old `step_data` type-based system.  
> **Please use the new tool-renderers system instead**: See `features/chat/components/response/tool-renderers/README.md`

This component displays MCP (Model Context Protocol) tool updates in a dynamic tabbed overlay. It now uses the tool-renderers registry system for custom displays.

## Migration Notice

The old `stepDataRegistry.tsx` system has been replaced with a more powerful tool-name-based registry system located at:

**`features/chat/components/response/tool-renderers/`**

### Key Changes

- **Old**: Matched on `step_data.type` (e.g., `"brave_default_page"`)
- **New**: Matches on `mcp_input.name` (e.g., `"brave_search"`)
- **Old**: Only overlay components
- **New**: Both inline (compact) and overlay (detailed) components

## Adding New Tool Displays

**Please refer to the new documentation:**

📚 **[Tool Renderers README](../tool-renderers/README.md)**

This new system provides:
- Inline and overlay renderers for each tool
- Better organization and scalability
- Easier to add new tools
- Full TypeScript support
- Comprehensive examples

## Legacy `stepDataRegistry.tsx`

The old file is kept for backward compatibility but should not be used for new tools.

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

