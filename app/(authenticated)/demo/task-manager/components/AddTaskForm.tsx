import React from 'react';
import { PlusCircle } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export default function AddTaskForm() {
  const { newTaskTitle, setNewTaskTitle, addTask } = useTaskContext();

  return (
    <form onSubmit={addTask} className="mb-6">
      <div className="flex items-center">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          onKeyPress={(e) => e.key === 'Enter' && addTask(e)}
        />
        <div
          onClick={addTask}
          className={`ml-2 p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 ${
            !newTaskTitle.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <PlusCircle size={18} />
        </div>
      </div>
    </form>
  );
}
