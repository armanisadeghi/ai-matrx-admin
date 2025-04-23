import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectConnectionStatus, selectTaskStatus } from "@/lib/redux/socket-io/selectors";

// Define the status option type
interface StatusOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface MultiStateStatusIndicatorProps {
  options: StatusOption[];
  currentValue: string;
  label?: string;
}

export const MultiStateStatusIndicator = ({ 
  options, 
  currentValue, 
  label 
}: MultiStateStatusIndicatorProps) => {
  // Find the matching option or default to the first one
  const currentOption = options.find(opt => opt.value === currentValue) || options[0];

  return (
    <div className="flex items-center space-x-2">
      <div className={`text-${currentOption.color}`}>
        {currentOption.icon}
      </div>
      <div className="flex flex-col">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-medium">{currentOption.label}</span>
      </div>
    </div>
  );
};

// Pre-built component for connection status
export const ConnectionStatusIndicator = () => {
  const connectionStatus = useAppSelector(selectConnectionStatus);
  
  const connectionOptions: StatusOption[] = [
    { 
      value: "connected", 
      label: "Connected", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>, 
      color: "green-500" 
    },
    { 
      value: "connecting", 
      label: "Connecting", 
      icon: <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, 
      color: "yellow-500" 
    },
    { 
      value: "disconnected", 
      label: "Disconnected", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>, 
      color: "red-500" 
    },
    { 
      value: "error", 
      label: "Connection Error", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, 
      color: "red-500" 
    }
  ];

  return (
    <MultiStateStatusIndicator 
      options={connectionOptions} 
      currentValue={connectionStatus} 
      label="Socket Connection"
    />
  );
};

// Pre-built component for task status
export const TaskStatusIndicator = ({ taskId }: { taskId: string }) => {
  const taskStatus = useAppSelector(state => selectTaskStatus(state, taskId));
  
  const taskStatusOptions: StatusOption[] = [
    { 
      value: "ready", 
      label: "Ready", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      color: "blue-500" 
    },
    { 
      value: "submitted", 
      label: "Submitted", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, 
      color: "blue-500" 
    },
    { 
      value: "building", 
      label: "Building", 
      icon: <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>, 
      color: "purple-500" 
    },
    { 
      value: "completed", 
      label: "Completed", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>, 
      color: "green-500" 
    },
    { 
      value: "error", 
      label: "Error", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, 
      color: "red-500" 
    },
    { 
      value: "not_found", 
      label: "Not Found", 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>, 
      color: "gray-500" 
    }
  ];

  return (
    <MultiStateStatusIndicator 
      options={taskStatusOptions} 
      currentValue={taskStatus} 
      label="Task Status"
    />
  );
};