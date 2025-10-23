# Task Manager - Database Integration

This task manager is now fully connected to Supabase with real-time updates.

## Features

✅ **Database Connected** - All tasks and projects are persisted in Supabase  
✅ **Real-time Updates** - Changes sync instantly across all sessions  
✅ **User Authentication** - Tasks are automatically associated with the logged-in user  
✅ **Simple API** - Easy task creation from anywhere in your app  
✅ **AI-Friendly** - Minimal required fields for quick task generation  

## Database Tables

### `projects`
- User's projects with tasks organized underneath
- Fields: `id`, `name`, `description`, `created_by`, `created_at`, `updated_at`

### `tasks`
- Individual tasks that can be assigned to projects
- Fields: `id`, `title`, `description`, `project_id`, `status`, `due_date`, `user_id`, `created_at`, `updated_at`

### Supporting Tables
- `task_attachments` - For file attachments (coming soon)
- `task_comments` - For task comments (coming soon)
- `task_assignments` - For assigning tasks to team members (coming soon)

## Usage

### Using the Task Manager UI

Navigate to `/demo/task-manager` to use the full task management interface.

### Creating Tasks from Other Parts of Your App

#### Option 1: Using the Hook (in React Components)

```tsx
import { useQuickTask } from '@/app/(authenticated)/demo/task-manager/hooks/useQuickTask';

function MyAIComponent() {
  const { quickCreate, creating } = useQuickTask();
  
  const handleAIResponse = async (aiGeneratedText: string) => {
    // Create a task with just a title
    await quickCreate("Review AI-generated content");
    
    // Or with a description
    await quickCreate(
      "Analyze user feedback",
      aiGeneratedText
    );
  };
  
  return (
    <button onClick={handleAIResponse} disabled={creating}>
      Create Task
    </button>
  );
}
```

#### Option 2: Using the Service (anywhere)

```tsx
import { createTask, quickCreateTask } from '@/app/(authenticated)/demo/task-manager/services/taskService';

// In any async function
async function handleAIGeneration() {
  // Simple version
  await quickCreateTask("Review the document");
  
  // With more details
  await createTask({
    title: "Complete quarterly report",
    description: "Include Q3 sales data and projections",
    due_date: "2025-11-15"
  });
  
  // With project assignment
  await createTask({
    title: "Fix bug in authentication",
    description: "Users are unable to log in with Google",
    project_id: "project-uuid-here",
    due_date: "2025-10-25"
  });
}
```

#### Option 3: Direct Import in Server Actions

```tsx
// In a server action
'use server';

import { createTask } from '@/app/(authenticated)/demo/task-manager/services/taskService';

export async function createTaskFromAI(aiOutput: string) {
  const task = await createTask({
    title: "Review AI output",
    description: aiOutput,
  });
  
  return task;
}
```

## API Reference

### `createTask(input: CreateTaskInput)`

Create a task with flexible options.

**Parameters:**
- `title` (required): Task title
- `description` (optional): Task description
- `project_id` (optional): Assign to a specific project
- `due_date` (optional): Due date in ISO format (YYYY-MM-DD)
- `user_id` (optional): Assign to a specific user (defaults to current user)

**Returns:** `Promise<DatabaseTask | null>`

### `quickCreateTask(title: string, description?: string)`

Simplified task creation with just title and optional description.

**Parameters:**
- `title` (required): Task title
- `description` (optional): Task description

**Returns:** `Promise<DatabaseTask | null>`

### `useQuickTask()` Hook

React hook for creating tasks with loading state.

**Returns:**
- `createTask(input)`: Full task creation function
- `quickCreate(title, description?)`: Quick task creation
- `creating`: Boolean loading state
- `error`: Error message if creation failed
- `lastCreatedTask`: The last successfully created task

## Real-time Updates

The task manager automatically subscribes to database changes and updates the UI in real-time. No manual refresh needed!

## Future Enhancements

- [ ] File attachments support
- [ ] Task comments
- [ ] Task assignments to team members
- [ ] Task labels/tags
- [ ] Task priorities
- [ ] Recurring tasks
- [ ] Task templates

## Examples

### AI Chat Integration

```tsx
function AIChatComponent() {
  const { quickCreate } = useQuickTask();
  
  const handleAIMessage = async (message: string) => {
    // AI suggests creating a task
    if (message.includes("create task")) {
      const taskTitle = extractTaskTitle(message);
      await quickCreate(taskTitle);
      return "✅ Task created! View it in your task manager.";
    }
  };
}
```

### Batch Task Creation

```tsx
async function createMultipleTasks(tasks: string[]) {
  const results = await Promise.all(
    tasks.map(title => quickCreateTask(title))
  );
  
  console.log(`Created ${results.filter(Boolean).length} tasks`);
}
```

### Integration with Forms

```tsx
function TaskCreationForm() {
  const { createTask, creating } = useQuickTask();
  
  const handleSubmit = async (formData: FormData) => {
    await createTask({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      due_date: formData.get('dueDate') as string,
    });
  };
}
```

