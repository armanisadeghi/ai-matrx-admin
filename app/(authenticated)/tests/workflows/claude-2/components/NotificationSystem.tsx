// 11. Notification System
// src/components/common/NotificationSystem.jsx
import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { useWorkflow } from './WorkflowContext';

const NotificationSystem = () => {
  const { notification } = useWorkflow();

  if (!notification) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center p-4 rounded-lg shadow-lg z-50 
      ${notification.type === 'success' 
        ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
        : 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200'
      }`}
    >
      {notification.type === 'success' ? <Check className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
      <span>{notification.message}</span>
    </div>
  );
};

export default NotificationSystem;
