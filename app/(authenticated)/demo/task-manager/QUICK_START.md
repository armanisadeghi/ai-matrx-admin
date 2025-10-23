# Task Manager - Quick Start Guide

## 🚀 Creating Tasks from Anywhere in Your App

The task manager is now fully database-connected with a super simple API for creating tasks from any part of your application.

### The Simplest Way (Recommended for AI/Quick Tasks)

```tsx
import { quickCreateTask } from '@/app/(authenticated)/demo/task-manager';

// That's it! Just one line:
await quickCreateTask("Review the AI-generated report");

// Or with a description:
await quickCreateTask(
  "Analyze user feedback", 
  "Check the comments from last week's survey"
);
```

### Using in React Components

```tsx
import { useQuickTask } from '@/app/(authenticated)/demo/task-manager';

function MyComponent() {
  const { quickCreate, creating } = useQuickTask();
  
  return (
    <button 
      onClick={() => quickCreate("My task")} 
      disabled={creating}
    >
      Create Task
    </button>
  );
}
```

### Advanced Usage (With All Options)

```tsx
import { createTask } from '@/app/(authenticated)/demo/task-manager';

await createTask({
  title: "Complete quarterly report",
  description: "Include Q3 sales data and projections",
  due_date: "2025-11-15",
  project_id: "optional-project-uuid"
});
```

## 📋 What's Included

✅ **Automatic user association** - Tasks are linked to the logged-in user  
✅ **Real-time updates** - Changes sync instantly across all sessions  
✅ **Optional project assignment** - Organize tasks into projects  
✅ **Due dates** - Set deadlines for tasks  
✅ **Descriptions** - Add detailed information  
✅ **Status tracking** - Incomplete/Completed status  

## 🎯 Perfect for AI Integration

The API is designed to work great with AI:

```tsx
// In your AI chat handler
async function handleAIMessage(message: string) {
  if (message.includes("create task")) {
    const taskTitle = extractTitle(message); // Your extraction logic
    await quickCreateTask(taskTitle);
    return "✅ Task created!";
  }
}
```

## 📂 File Structure

```
app/(authenticated)/demo/task-manager/
├── index.ts                    # Easy imports
├── services/
│   ├── taskService.ts         # Task CRUD operations
│   └── projectService.ts      # Project CRUD operations
├── hooks/
│   ├── useQuickTask.ts        # React hook for task creation
│   └── useTaskManager.ts      # Advanced database hooks
├── context/
│   └── TaskContext.tsx        # Full UI context (with DB)
├── types/
│   └── database.ts            # Database type definitions
└── examples/
    └── QuickTaskExample.tsx   # Live examples
```

## 🔗 Database Tables

### `tasks` table
- `id` - UUID
- `title` - Task title (required)
- `description` - Task details (optional)
- `status` - 'incomplete' or 'completed'
- `due_date` - ISO date string (optional)
- `project_id` - Link to project (optional)
- `user_id` - Owner of the task
- Timestamps: `created_at`, `updated_at`

### `projects` table
- `id` - UUID
- `name` - Project name (required)
- `description` - Project details (optional)
- `created_by` - User who created it
- Timestamps: `created_at`, `updated_at`

## 💡 Common Use Cases

### 1. AI Task Generation
```tsx
const tasks = await extractTasksFromAI(aiResponse);
await Promise.all(tasks.map(t => quickCreateTask(t)));
```

### 2. Email to Task
```tsx
async function emailToTask(email: Email) {
  await createTask({
    title: email.subject,
    description: email.body,
    due_date: email.dueDate
  });
}
```

### 3. Quick Notes
```tsx
<button onClick={() => quickCreate("Remember to...")}>
  Quick Note
</button>
```

## 🎨 View Tasks

Users can view and manage all their tasks at:
`/demo/task-manager`

## 🆘 Need Help?

See the full [README.md](./README.md) for detailed documentation.

