# Tasks Feature

Full-featured task management system with database integration and real-time updates.

## 📍 Route

Main interface: **`/tasks`**

## 🚀 Quick Start

### Creating Tasks from Anywhere

```tsx
// Simplest way - perfect for AI!
import { quickCreateTask } from '@/features/tasks';

await quickCreateTask("Review the document");
```

### Using in React Components

```tsx
import { useQuickTask } from '@/features/tasks';

function MyComponent() {
  const { quickCreate, creating } = useQuickTask();
  
  return (
    <button onClick={() => quickCreate("My task")}>
      Create Task
    </button>
  );
}
```

### Advanced Usage

```tsx
import { createTask } from '@/features/tasks';

await createTask({
  title: "Complete report",
  description: "Q3 analysis",
  due_date: "2025-11-15",
  project_id: "optional-uuid"
});
```

## 📁 Structure

```
features/tasks/
├── index.ts                 # Main exports
├── components/              # UI components
│   ├── Sidebar.tsx
│   ├── TaskContent.tsx
│   ├── TaskHeader.tsx
│   ├── TaskList.tsx
│   ├── TaskItem.tsx
│   ├── TaskDetails.tsx
│   └── AddTaskForm.tsx
├── context/
│   └── TaskContext.tsx      # State management
├── hooks/
│   ├── useQuickTask.ts      # ⭐ Easy task creation
│   └── useTaskManager.ts    # Database hooks
├── services/
│   ├── taskService.ts       # Task CRUD
│   └── projectService.ts    # Project CRUD
└── types/
    ├── index.ts             # Main types
    └── database.ts          # DB types
```

## ✨ Features

- ✅ Database persistence with Supabase
- ✅ Real-time updates across all sessions
- ✅ Project organization
- ✅ Task filtering (all, completed, incomplete, overdue)
- ✅ Due dates
- ✅ Task descriptions
- ✅ Simple API for external task creation
- ✅ Perfect for AI integration

## 📚 Full Documentation

See the old demo folder for additional examples:
- `app/(authenticated)/demo/task-manager/README.md` - Full documentation
- `app/(authenticated)/demo/task-manager/QUICK_START.md` - Quick reference

## 🗄️ Database Tables

### `projects`
- User projects with tasks organized underneath
- Fields: `id`, `name`, `description`, `created_by`, timestamps

### `tasks`
- Individual tasks with status tracking
- Fields: `id`, `title`, `description`, `project_id`, `status`, `due_date`, `user_id`, timestamps

### Future Tables
- `task_attachments` - File attachments
- `task_comments` - Task comments
- `task_assignments` - Team member assignments

## 🎯 Perfect for AI

The API is designed to work seamlessly with AI systems:

```tsx
async function handleAIMessage(message: string) {
  if (message.includes("create task")) {
    const title = extractTitle(message);
    await quickCreateTask(title);
    return "✅ Task created!";
  }
}
```

## 🔗 Key Exports

```tsx
// Task creation (most common)
import { 
  quickCreateTask,        // Simple: just title + optional description
  createTask,             // Full options
  useQuickTask            // React hook with loading state
} from '@/features/tasks';

// Services (advanced)
import { 
  TaskService,            // All task operations
  ProjectService          // All project operations
} from '@/features/tasks';

// Context (for UI)
import { 
  TaskProvider, 
  useTaskContext 
} from '@/features/tasks';

// Hooks (custom UIs)
import { 
  useTasks,               // Tasks only
  useProjects,            // Projects only
  useProjectsWithTasks    // Combined view
} from '@/features/tasks';
```

## 📝 Examples

### AI Task Generation

```tsx
const tasks = await extractTasksFromAI(aiResponse);
await Promise.all(tasks.map(t => quickCreateTask(t)));
```

### Email to Task

```tsx
async function emailToTask(email: Email) {
  await createTask({
    title: email.subject,
    description: email.body,
    due_date: email.dueDate
  });
}
```

### Quick Notes

```tsx
<button onClick={() => quickCreate("Remember to...")}>
  Quick Note
</button>
```

