"use client";

import React, { useState, useRef } from 'react';
import { useSimpleSocketTask } from "@/lib/redux/socket/hooks/useSimpleSocketTask";
import { Task } from './types';
import { getObjectAtPath, getParentPath, processTasksForSubmission } from './utils';
import TaskFieldEditor from './TaskFieldEditor';
import TaskStructureExplorer from './TaskStructureExplorer';
import NotificationToast from './NotificationToast';
import PathBreadcrumbs from './PathBreadcrumbs';
import ResponseViewer from './ResponseViewer';

const DynamicTaskBuilder = () => {
  // Basic task configuration state
  const [namespace, setNamespace] = useState("UserSession");
  const [eventName, setEventName] = useState("markdown_service");
  const [tasks, setTasks] = useState<Task[]>([{
    task: "",
    index: "0",
    stream: "True",
    taskData: {},
  }]);
  
  // UI state
  const [selectedTask, setSelectedTask] = useState(0);
  const [currentPath, setCurrentPath] = useState("taskData");
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);

  // Socket hook integration 
  const responseRef = useRef<HTMLDivElement>(null);
  const { streamingResponses: rawResponses, handleSend, handleClear, isResponseActive } = useSimpleSocketTask({
    eventName,
    taskName: tasks[0]?.task || "",
    tasksList: tasks.map(task => task.taskData),
  });

  // Navigation functions
  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  // Task management functions
  const addTask = () => {
    setTasks(prev => [
      ...prev,
      {
        task: prev[0]?.task || "",
        index: prev.length.toString(),
        stream: "True",
        taskData: {},
      },
    ]);
  };

  const removeTask = (index: number) => {
    setTasks(prev => {
      const newTasks = prev.filter((_, i) => i !== index);
      return newTasks.map((task, i) => ({
        ...task,
        index: i.toString(),
      }));
    });
    if (selectedTask >= index && selectedTask > 0) {
      setSelectedTask(selectedTask - 1);
    }
  };

  const updateTaskType = (newType: string) => {
    // Update task type for all tasks to keep them consistent
    const newTasks = tasks.map(task => ({
      ...task,
      task: newType,
    }));
    setTasks(newTasks);
  };

  const updateTaskStream = (taskIndex: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[taskIndex] = {
      ...newTasks[taskIndex],
      stream: value,
    };
    setTasks(newTasks);
  };

  // Field management functions
  const addField = (key: string, value: any, type: string) => {
    const updatedTasks = [...tasks];
    const taskToUpdate = { ...updatedTasks[selectedTask] };
    
    // Handle root level properties
    if (!currentPath) {
      taskToUpdate[key] = value;
    } else {
      // Navigate to the correct nested object
      const pathParts = currentPath.split(".");
      let current = taskToUpdate;

      // Create path if it doesn't exist
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      // Add the new field
      current[key] = value;
    }

    updatedTasks[selectedTask] = taskToUpdate;
    setTasks(updatedTasks);
  };

  const removeField = (path: string, key: string) => {
    const updatedTasks = [...tasks];
    const taskToUpdate = { ...updatedTasks[selectedTask] };

    if (!path) {
      // Remove from root
      delete taskToUpdate[key];
    } else {
      // Navigate to the object containing our target
      const pathParts = path.split(".");
      let current = taskToUpdate;

      for (const part of pathParts) {
        if (!current[part]) return; // Path doesn't exist
        current = current[part];
      }

      // Remove the property
      delete current[key];
    }

    updatedTasks[selectedTask] = taskToUpdate;
    setTasks(updatedTasks);
  };

  const editField = (path: string, key: string, value: any) => {
    const updatedTasks = [...tasks];
    const taskToUpdate = {...updatedTasks[selectedTask]};
    
    if (!path) {
      // Root level property
      taskToUpdate[key] = value;
    } else {
      // Navigate to parent object
      const parts = path.split('.');
      let current = taskToUpdate;
      
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Update field
      current[key] = value;
    }
    
    updatedTasks[selectedTask] = taskToUpdate;
    setTasks(updatedTasks);
  };

  // Execute task
  const executeTask = () => {
    // Ensure task name is set for all tasks
    const taskName = tasks[0]?.task;
    if (!taskName) {
      alert("Please set a task type before executing");
      return;
    }

    // Process tasks to fix any string-encoded objects
    const processedTasks = processTasksForSubmission(tasks);
    
    // Update the tasks state with properly processed objects
    setTasks(processedTasks);
    console.log('Processed tasks for execution:', processedTasks);

    // Execute the task using the hook
    handleSend();
  };

  // Reset task
  const resetTask = () => {
    if (isResponseActive) {
      if (!window.confirm("A task is currently running. Are you sure you want to reset?")) {
        return;
      }
      handleClear();
    }
    
    setTasks([{
      task: "",
      index: "0",
      stream: "True",
      taskData: {},
    }]);
    setSelectedTask(0);
    setCurrentPath("taskData");
    showNotificationMessage("Task reset successfully");
  };
  
  // Show notification message
  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
  };

  return (
    <div className="p-4 w-full mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Notification Toast */}
      <NotificationToast 
        message={notificationMessage}
        visible={showNotification}
        onHide={() => setShowNotification(false)}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dynamic Task Builder</h1>
        <button
          onClick={resetTask}
          className="px-4 py-2 bg-orange-500 dark:bg-orange-600 text-white rounded hover:bg-orange-600 dark:hover:bg-orange-700"
        >
          Reset Task
        </button>
      </div>

      {/* Event Configuration */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Event Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Namespace</label>
            <input
              type="text"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isResponseActive}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isResponseActive}
            />
          </div>
        </div>
      </div>

      {/* Task Management */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
          <div className="flex space-x-2">
            <button
              onClick={addTask}
              disabled={isResponseActive}
              className={`px-4 py-2 rounded ${
                isResponseActive
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
              }`}
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Task Tabs */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap -mb-px">
            {tasks.map((task, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedTask(idx);
                  setCurrentPath("taskData");
                }}
                disabled={isResponseActive}
                className={`mr-2 py-2 px-4 font-medium text-sm rounded-t-lg ${
                  selectedTask === idx
                    ? "bg-blue-100 dark:bg-blue-900 border-b-2 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300"
                    : isResponseActive
                    ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Task {idx}
                {idx > 0 && !isResponseActive && (
                  <span
                    className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTask(idx);
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Task Builder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Side: Basic Properties */}
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Task Properties</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Task Type</label>
                <input
                  type="text"
                  value={tasks[selectedTask]?.task || ""}
                  onChange={(e) => updateTaskType(e.target.value)}
                  placeholder="e.g. scrape_web, run_recipe"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isResponseActive}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Stream</label>
                <select
                  value={tasks[selectedTask]?.stream || "True"}
                  onChange={(e) => updateTaskStream(selectedTask, e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isResponseActive}
                >
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              </div>
            </div>

            {/* Go up button */}
            {currentPath && currentPath !== "taskData" && !isResponseActive && (
              <button
                onClick={() => setCurrentPath(getParentPath(currentPath))}
                className="mt-6 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center text-sm"
              >
                <span>↑ Go Up</span>
              </button>
            )}
          </div>

          {/* Middle: Field Builder */}
          <div>
            <PathBreadcrumbs 
              currentPath={currentPath}
              onNavigateTo={navigateTo}
            />
            
            <TaskFieldEditor 
              currentPath={currentPath}
              isResponseActive={isResponseActive}
              onAddField={addField}
            />
          </div>

          {/* Right Side: Structure Explorer */}
          <TaskStructureExplorer
            structure={getObjectAtPath(tasks[selectedTask], currentPath)}
            currentPath={currentPath}
            isResponseActive={isResponseActive}
            onNavigateTo={navigateTo}
            onRemoveField={removeField}
            onEditField={editField}
          />
        </div>
      </div>

      {/* JSON Preview and Execute */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Task Preview</h2>
          <button
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showJsonPreview ? "Hide" : "Show"} JSON
          </button>
        </div>

        {showJsonPreview && (
          <div className="mb-6">
            <pre className="bg-gray-800 dark:bg-gray-900 text-green-400 dark:text-green-300 p-4 rounded overflow-x-auto">
              {JSON.stringify(
                {
                  event_name: eventName,
                  namespace,
                  data: processTasksForSubmission(tasks),
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={executeTask}
            disabled={isResponseActive}
            className={`flex-1 py-3 rounded text-white font-medium ${
              isResponseActive
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800"
            }`}
          >
            {isResponseActive ? "Task Running..." : "Execute Task"}
          </button>

          {isResponseActive && (
            <button
              onClick={handleClear}
              className="px-6 py-3 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 font-medium"
            >
              Stop & Clear
            </button>
          )}
        </div>
      </div>

      {/* Response Section */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow" ref={responseRef}>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Socket Responses
          {isResponseActive && (
            <span className="ml-3 inline-block px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded-full animate-pulse">
              Streaming
            </span>
          )}
        </h2>
        <div className="min-h-48 max-h-96 overflow-y-auto">
          <ResponseViewer 
            responses={rawResponses} 
            isActive={isResponseActive}
            onCopyJson={(json) => {
              navigator.clipboard.writeText(json);
              showNotificationMessage("JSON copied to clipboard");
            }}
          />
        </div>
      </div>
    </div>
  );
};


export default DynamicTaskBuilder;