"use client";

import React from 'react';
import { TaskProvider } from './context/TaskContext';
import TaskApp from './components/TaskApp';

// https://claude.ai/chat/3aa6a56c-53d7-4b53-b1ef-4931c5f9d13d

// Main App Entry Point
export default function App() {
  return (
    <TaskProvider>
      <TaskApp />
    </TaskProvider>
  );
}