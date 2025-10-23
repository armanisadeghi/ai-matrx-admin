/**
 * Example: Creating tasks from an AI chat or other component
 * 
 * This demonstrates how easy it is to create tasks from anywhere in your app.
 */
'use client';

import { useState } from 'react';
import { useQuickTask } from '../hooks/useQuickTask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function QuickTaskExample() {
  const { quickCreate, createTask, creating, error, lastCreatedTask } = useQuickTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Example 1: Simple quick creation
  const handleQuickCreate = async () => {
    await quickCreate(title, description);
    setTitle('');
    setDescription('');
  };

  // Example 2: AI-style task generation
  const handleAIGenerate = async () => {
    const aiGeneratedTasks = [
      "Review user feedback from last week",
      "Prepare Q4 budget proposal",
      "Schedule team meeting for sprint planning"
    ];

    for (const taskTitle of aiGeneratedTasks) {
      await quickCreate(taskTitle);
    }
  };

  // Example 3: Full task creation with details
  const handleAdvancedCreate = async () => {
    await createTask({
      title: title,
      description: description,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    });
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Task Creation Examples</CardTitle>
          <CardDescription>
            Create tasks from anywhere in your app with minimal code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Example 1: Simple Form */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Example 1: Quick Task Form
            </h3>
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleQuickCreate}
              disabled={!title.trim() || creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>

          {/* Example 2: AI-Style Generation */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Example 2: AI Task Generation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Simulate AI generating multiple tasks at once
            </p>
            <Button 
              onClick={handleAIGenerate}
              disabled={creating}
              variant="secondary"
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Tasks...
                </>
              ) : (
                'Generate 3 AI Tasks'
              )}
            </Button>
          </div>

          {/* Example 3: Advanced Creation */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Example 3: Advanced Task Creation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create task with due date (7 days from now)
            </p>
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <Button 
              onClick={handleAdvancedCreate}
              disabled={!title.trim() || creating}
              variant="outline"
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task with Due Date'
              )}
            </Button>
          </div>

          {/* Success Message */}
          {lastCreatedTask && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">Task Created!</p>
                  <p className="text-sm">{lastCreatedTask.title}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Simple Usage:
            </h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`import { useQuickTask } from '@/app/(authenticated)/demo/task-manager';

function MyComponent() {
  const { quickCreate } = useQuickTask();
  
  return (
    <button onClick={() => quickCreate("My Task")}>
      Create Task
    </button>
  );
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Non-React Usage:
            </h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`import { quickCreateTask } from '@/app/(authenticated)/demo/task-manager';

async function myFunction() {
  await quickCreateTask("Task from anywhere!");
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

