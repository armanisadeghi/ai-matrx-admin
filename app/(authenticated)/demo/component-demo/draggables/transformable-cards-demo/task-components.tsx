'use client'
import React from "react";
import { cn } from "@/lib/utils";
import { Book, Briefcase, Clock, CalendarCheck, Users, FileCheck } from "lucide-react";

// Task card content component
export const TaskCard = ({ 
  title, 
  description, 
  icon, 
  status,
  dueDate,
  priority 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  status?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high'; 
}) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
    </div>
    
    <p className="text-gray-600 dark:text-gray-400 flex-1">
      {description}
    </p>
    
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2 text-sm">
      {priority && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Priority:</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs",
            priority === 'high' ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" :
            priority === 'medium' ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" :
            "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
          )}>
            {priority}
          </span>
        </div>
      )}
      
      {dueDate && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Due:</span>
          <span className="text-gray-700 dark:text-gray-300">{dueDate}</span>
        </div>
      )}
      
      {status && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Status:</span>
          <span className="text-gray-700 dark:text-gray-300">{status}</span>
        </div>
      )}
    </div>
  </div>
);

// Pill view for tasks
export const TaskPill = ({ 
  title, 
  icon, 
  priority 
}: { 
  title: string; 
  icon: React.ReactNode; 
  priority?: 'low' | 'medium' | 'high';
}) => (
  <div className="flex items-center gap-2">
    <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
      {icon}
    </div>
    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
      {title}
    </span>
    {priority && (
      <div className={cn(
        "w-2 h-2 rounded-full",
        priority === 'high' ? "bg-red-500" :
        priority === 'medium' ? "bg-yellow-500" :
        "bg-green-500"
      )} />
    )}
  </div>
);

// Export the task icons for convenience
export const taskIcons = {
  research: <Book size={20} />,
  design: <Briefcase size={20} />,
  development: <FileCheck size={20} />,
  testing: <Clock size={20} />,
  meeting: <Users size={20} />,
  documentation: <CalendarCheck size={20} />
};

// Small icons for pills
export const pillIcons = {
  research: <Book size={16} />,
  design: <Briefcase size={16} />,
  development: <FileCheck size={16} />,
  testing: <Clock size={16} />,
  meeting: <Users size={16} />,
  documentation: <CalendarCheck size={16} />
}; 