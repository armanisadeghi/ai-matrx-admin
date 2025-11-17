# Add to Tasks Feature Implementation

## Overview
Added a simple "Add to Tasks" option to the MessageOptionsMenu that allows users to quickly create a task from an AI response message with a single click.

## Changes Made

### 1. MessageOptionsMenu.tsx
**Added:**
- Import `CheckSquare` icon from lucide-react
- Import `useQuickActions` hook
- New `metadata` prop to accept taskId, runId, messageId, and other contextual data
- `handleAddToTasks()` function that prepares task data and opens QuickTasksSheet
- New menu item "Add to Tasks" in the Actions category

**Data Flow:**
```typescript
const handleAddToTasks = () => {
  const taskData = {
    content,
    metadata,
    prePopulate: {
      title: 'AI Response',
      description: content,
      metadataInfo: metadata ? `\n\n---\n**Origin Info:**\n${JSON.stringify(metadata, null, 2)}` : ''
    }
  };
  
  openQuickTasks(taskData);
  onClose();
};
```

### 2. QuickTasksSheet.tsx
**Added:**
- Import `useAppSelector` and `selectOverlay` from Redux
- State variable `hasPrePopulated` to ensure pre-population happens only once
- Access to overlay data via Redux selector
- `useEffect` hook to pre-populate task fields when overlay data is present

**Pre-population Logic:**
```typescript
const overlayData = useAppSelector((state) => selectOverlay(state, 'quickTasks'));

useEffect(() => {
  if (overlayData?.data?.prePopulate && !hasPrePopulated) {
    const { title, description, metadataInfo } = overlayData.data.prePopulate;
    
    if (title) {
      setNewTaskTitle(title);
    }
    
    if (description || metadataInfo) {
      const fullDescription = description + (metadataInfo || '');
      setQuickAddDescription(fullDescription);
      setShowQuickAddDescription(true);
    }
    
    setHasPrePopulated(true);
  }
}, [overlayData, hasPrePopulated, setNewTaskTitle]);
```

### 3. AssistantMessage.tsx
**Updated:**
- MessageOptionsMenu now receives metadata prop with taskId and messageId

```typescript
<MessageOptionsMenu 
  isOpen={showOptions}
  content={content} 
  onClose={() => setShowOptions(false)}
  onShowHtmlPreview={handleShowHtmlPreview}
  onEditContent={handleEditClick}
  anchorElement={moreOptionsButtonRef.current}
  metadata={{
    taskId: taskId,
    messageId: message.id,
  }}
/>
```

## User Flow

1. User receives an AI response in chat
2. User clicks "More options" (⋯) button on the message
3. User selects "Add to Tasks" from the menu
4. QuickTasksSheet opens with pre-populated fields:
   - **Title**: "AI Response"
   - **Description**: Full message content + metadata info (taskId, messageId)
5. User can:
   - Modify the title/description
   - Select a project/folder
   - Add the task immediately or make further edits

## Data Structure

### Metadata Object
```typescript
{
  taskId?: string;      // The AI task/conversation ID
  runId?: string;       // Optional run ID
  messageId?: string;   // The specific message ID
  [key: string]: any;   // Extensible for future needs
}
```

### Task Data Passed to Overlay
```typescript
{
  content: string;               // Full message content
  metadata: object;              // Contextual metadata
  prePopulate: {
    title: string;               // Pre-filled title
    description: string;         // Pre-filled description
    metadataInfo: string;        // Formatted metadata (stringified JSON)
  }
}
```

## Future Enhancements

### Possible Improvements:
1. **Better metadata formatting**: Instead of JSON.stringify, create a more readable format
2. **Smart title generation**: Use AI to generate a meaningful task title from the content
3. **Automatic project selection**: Infer the best project based on context or tags
4. **Link back to source**: Add a clickable link in the task that takes user back to the original message
5. **Attachments**: If the message has code blocks or images, attach them to the task
6. **Due date inference**: If the message mentions a deadline, pre-populate the due date
7. **Priority detection**: Analyze content for urgency keywords and set priority accordingly
8. **Tags**: Auto-generate tags based on message content analysis

### Code Structure for Future:
- Consider creating a dedicated task creation utility that handles formatting and preprocessing
- Add a proper database relationship between tasks and messages (requires schema changes)
- Create a "view source" feature in tasks that shows the original AI response

## Testing Checklist

- [x] Menu item appears in MessageOptionsMenu
- [x] Click opens QuickTasksSheet
- [x] Title is pre-populated with "AI Response"
- [x] Description contains full message content
- [x] Metadata is appended to description in readable format
- [x] User can modify all fields before creating task
- [x] Task is created successfully when user clicks "Add Task"
- [ ] Test with different message types (with/without taskId, with/without runId)
- [ ] Test with very long messages
- [ ] Test with messages containing special characters or markdown

## Notes

- Implementation is intentionally simple and non-breaking
- All changes are additive - no existing functionality was modified
- Metadata is stored as stringified JSON in task description for now (placeholder for future proper implementation)
- The overlay system cleanly separates the triggering component from the task creation UI

