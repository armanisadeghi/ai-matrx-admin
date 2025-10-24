# Tasks - Quick Start Guide

## 🚀 Creating Tasks from Anywhere in Your App

### The Simplest Way (Perfect for AI)

```tsx
import { quickCreateTask } from '@/features/tasks';

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
import { useQuickTask } from '@/features/tasks';

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
import { createTask } from '@/features/tasks';

await createTask({
  title: "Complete quarterly report",
  description: "Include Q3 sales data and projections",
  due_date: "2025-11-15",
  project_id: "optional-project-uuid"
});
```

## 📍 Access the Task Manager

View and manage all your tasks at: **`/tasks`**

## 🎯 Perfect for AI Integration

```tsx
// In your AI chat handler
async function handleAIMessage(message: string) {
  if (message.includes("create task")) {
    const taskTitle = extractTitle(message);
    await quickCreateTask(taskTitle);
    return "✅ Task created!";
  }
}
```

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

## 📦 What You Get

✅ Database persistence - Tasks never disappear  
✅ Real-time updates - Changes sync instantly  
✅ Project organization - Group tasks together  
✅ Due dates & descriptions - Full task details  
✅ Status tracking - Mark tasks complete  
✅ Simple API - One-line task creation  

## 🔗 Import Paths

All imports come from `@/features/tasks`:

```tsx
// Task creation
import { quickCreateTask, createTask, useQuickTask } from '@/features/tasks';

// Advanced usage
import { TaskService, ProjectService } from '@/features/tasks';

// Context (for task manager UI)
import { TaskProvider, useTaskContext } from '@/features/tasks';

// Types
import type { Task, Project, CreateTaskInput } from '@/features/tasks';
```

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

## 🆘 Need Help?

The task creation API is designed to be as simple as possible. If you can't figure it out, just use:

```tsx
import { quickCreateTask } from '@/features/tasks';
await quickCreateTask("Your task title here");
```

That's it! Everything else is optional.

