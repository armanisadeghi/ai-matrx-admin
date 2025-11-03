# Resource Management System

## Overview

This system provides a structured way to attach and display various types of resources (notes, tasks, tables, files, webpages, etc.) in LLM conversations. Resources are formatted as XML for the AI model and displayed as interactive components in the UI.

## Architecture

### Core Components

1. **Type Definitions** (`types/resources.ts`)
   - Defines interfaces for all resource types
   - Provides unified `Resource` union type
   - Includes configuration interfaces

2. **Formatting Utilities** (`utils/resource-formatting.ts`)
   - Converts Resource objects to XML for LLM consumption
   - Handles metadata extraction and content formatting
   - Manages settings attachments (URLs, etc.)

3. **Parsing Utilities** (`utils/resource-parsing.ts`)
   - Parses XML resources from message content
   - Extracts resources for display
   - Splits messages into text and resource segments

4. **Data Fetching** (`utils/resource-data-fetcher.ts`)
   - Fetches full data for resources that need it
   - Handles table data loading
   - Enriches resources before formatting

5. **Display Components** (`components/resource-display/`)
   - `ResourceDisplay.tsx` - Renders individual resources
   - `ResourceChips.tsx` - Shows resource chips in input
   - `ResourcePreviewSheet.tsx` - Full resource preview

6. **Integration Hook** (`hooks/useResourceMessageFormatter.ts`)
   - Hook for formatting messages with resources
   - Handles async data fetching
   - Returns formatted message and settings attachments

## Resource Types

### Content Resources (Included in Message)

These resources are formatted as XML and included directly in the message content:

- **Note** - User notes with content
- **Task** - Tasks with title, status, description
- **Project** - Projects with description
- **Table** - Data table references (4 types):
  - `full_table` - Entire table with rows (up to 100)
  - `table_row` - Single row from a table
  - `table_column` - Single column values from a table
  - `table_cell` - Single cell value from a table
- **File** - File attachments with content
- **Webpage** - Scraped web content
- **Audio** - Audio files with transcripts

### Settings Resources (Added to Model Config)

These resources are added to model settings/config rather than message content:

- **YouTube** - YouTube video URLs
- **Image URL** - Direct image URLs
- **File URL** - Direct file URLs

## XML Format

Resources are formatted with the following XML structure:

```xml
<attached_resources>
<resource type="note" id="uuid">
<metadata>
<label>Sample Note</label>
<folder>Projects</folder>
</metadata>
<instructions>
This is a user note that can be referenced, quoted, or analyzed. 
If you need to update, delete, or create notes, you should use the appropriate note management tools.
</instructions>
<content>
Note content goes here...
</content>
</resource>

<resource type="task" id="uuid">
<metadata>
<title>Task Name</title>
<status>incomplete</status>
</metadata>
<instructions>
This is a task from the user's task list. You can reference it, check its status, or suggest updates.
</instructions>
<content>
Task description...
</content>
</resource>
</attached_resources>
```

## Usage

### Basic Usage in Components

```typescript
import { useResourceMessageFormatter } from '@/features/prompts/hooks/useResourceMessageFormatter';
import { Resource } from '@/features/prompts/types/resources';

function MyComponent() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [chatInput, setChatInput] = useState('');
    const { formatMessageWithResources } = useResourceMessageFormatter();
    
    const handleSend = async () => {
        // Format message with resources
        const { formattedMessage, settingsAttachments } = 
            await formatMessageWithResources(chatInput, resources);
        
        // Use formattedMessage for API
        // Use settingsAttachments for model config
        
        // Clear resources after sending
        setResources([]);
    };
    
    return (
        <PromptInput
            resources={resources}
            onResourcesChange={setResources}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSend}
            // ... other props
        />
    );
}
```

### Displaying Messages with Resources

The `PromptUserMessage` component automatically parses and displays resources:

```typescript
import { PromptUserMessage } from '@/features/prompts/components/builder/PromptUserMessage';

// Messages with XML resources are automatically parsed and displayed nicely
<PromptUserMessage 
    content={messageContentWithXML} 
    messageIndex={0}
/>
```

### Adding New Resource Types

To add a new resource type:

1. **Define the type** in `types/resources.ts`:
```typescript
export interface MyResourceData {
    id: string;
    name: string;
    content: string;
}

// Add to Resource union type
export type Resource = 
    | { type: "my_resource"; data: MyResourceData }
    | // ... other types
```

2. **Add formatting config** in `utils/resource-formatting.ts`:
```typescript
export const RESOURCE_FORMAT_CONFIG: Record<string, ResourceFormatConfig> = {
    my_resource: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "Instructions for the AI about this resource type...",
        extractMetadata: (data: MyResourceData) => ({
            name: data.name,
        }),
        extractContent: (data: MyResourceData) => data.content,
    },
    // ... other configs
};
```

3. **Update display info** in `components/resource-display/ResourceDisplay.tsx`:
```typescript
function getResourceDisplayInfo(type: string) {
    switch (type) {
        case "my_resource":
            return {
                icon: MyIcon,
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-50 dark:bg-blue-950/20",
                borderColor: "border-blue-300 dark:border-blue-800",
                label: "My Resource"
            };
        // ... other cases
    }
}
```

4. **Add to resource picker** in `components/resource-picker/ResourcePickerMenu.tsx`

## Table References

The system supports four types of table references, each fetched using dedicated RPC functions:

### Full Table (`full_table`)
- Uses `list_table_rows` RPC
- Fetches up to 100 rows with all fields
- Formatted as markdown table in XML

### Table Row (`table_row`)
- Uses `get_table_row` RPC
- Fetches a specific row by ID
- Formatted as key-value pairs

### Table Column (`table_column`)
- Uses `get_table_column` RPC
- Fetches column definition and all row values for that column
- Formatted as a numbered list of values

### Table Cell (`table_cell`)
- Uses `get_table_cell` RPC
- Fetches a single cell value
- Formatted with table name, column name, row ID, and value

All table data fetching is done efficiently using the existing RPC infrastructure, avoiding unnecessary full table loads.

## Best Practices

### 1. Keep Instructions Concise

Resource instructions should be brief but informative, telling the AI:
- What the resource is
- What it can do with it
- What tools to use for modifications

### 2. Minimize Data Overhead

Only include essential metadata and content:
- Use meaningful field names
- Avoid redundant information
- Truncate very large content if needed

### 3. Handle Errors Gracefully

- Always provide fallbacks for missing data
- Log errors but don't break the user experience
- Show user-friendly error messages

### 4. Optimize Data Fetching

- Fetch data only when needed
- Use parallel fetching for multiple resources
- Cache when appropriate

### 5. Test Resource Parsing

Ensure XML is valid and parseable:
- Escape special characters
- Use consistent formatting
- Validate before sending

## Implementation Details

### Message Flow

1. User selects resources using resource picker
2. Resources stored in component state
3. User types message and clicks send
4. `formatMessageWithResources` is called:
   - Fetches any needed data (e.g., table rows)
   - Formats resources to XML
   - Appends XML to message content
   - Extracts settings attachments
5. Formatted message sent to API
6. Resources cleared from state

### Display Flow

1. Message received with XML content
2. `PromptUserMessage` parses XML
3. Resources extracted using `parseResourcesFromMessage`
4. Text content extracted using `extractMessageWithoutResources`
5. Resources displayed using `ResourceDisplay` component
6. Text displayed normally

## Testing

### Manual Testing

To test the resource system:

1. **Test Note Resource:**
   - Add a note using resource picker
   - Send message
   - Verify XML formatting in API request
   - Verify nice display in UI

2. **Test Table Resource:**
   - Add a table reference
   - Verify table data is fetched
   - Verify markdown table in XML
   - Verify table display in UI

3. **Test Multiple Resources:**
   - Add multiple different resource types
   - Verify all are formatted correctly
   - Verify display order and styling

### Debugging

Enable debug mode to see raw resource data:
- Set debug mode in Redux: `adminDebugSlice`
- Resource debug modal shows full resource objects
- Check browser console for parsing errors

## Future Enhancements

### Planned Features

1. **Resource Caching** - Cache fetched table data
2. **Resource Templates** - Pre-configured resource sets
3. **Resource Search** - Quick search across all resource types
4. **Resource Relationships** - Link related resources
5. **Resource Versions** - Track resource changes over time
6. **Bulk Operations** - Add/remove multiple resources at once
7. **Resource Favorites** - Quick access to frequently used resources

### Known Limitations

1. Table data limited to 100 rows for performance
2. File content only included for text-based files
3. No real-time resource updates
4. Resource state not persisted across page reloads

## Troubleshooting

### Resources Not Appearing in Message

- Check that resource type has `includeInContent: true`
- Verify resource data structure matches interface
- Check console for formatting errors
- Ensure `formatMessageWithResources` is called before sending

### Resources Not Displaying Correctly

- Verify XML is valid (no unescaped special characters)
- Check that `PromptUserMessage` is being used
- Ensure ResourceDisplay component is imported correctly
- Check browser console for parsing errors

### Table Data Not Loading

- Verify table_id is correct
- Check Supabase permissions
- Ensure RPC functions are available
- Check network tab for failed requests

### Performance Issues

- Reduce number of resources per message
- Limit table rows (default 100)
- Optimize resource picker queries
- Use pagination for large resource lists

## Related Files

- `features/prompts/types/resources.ts` - Type definitions
- `features/prompts/utils/resource-formatting.ts` - XML formatting
- `features/prompts/utils/resource-parsing.ts` - XML parsing
- `features/prompts/utils/resource-data-fetcher.ts` - Data fetching
- `features/prompts/hooks/useResourceMessageFormatter.ts` - Formatting hook
- `features/prompts/components/resource-display/` - Display components
- `features/prompts/components/resource-picker/` - Selection components
- `features/prompts/components/PromptInput.tsx` - Input component
- `features/prompts/components/builder/PromptUserMessage.tsx` - Message display

## Support

For questions or issues with the resource system:
1. Check this documentation
2. Review code comments in related files
3. Check browser console for errors
4. Enable debug mode for detailed logging

