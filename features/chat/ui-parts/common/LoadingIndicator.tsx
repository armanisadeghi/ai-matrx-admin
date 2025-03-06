import React from "react";

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "AI is responding...",
  className = ""
}) => {
  return (
    <div className={`flex justify-center py-2 ${className}`}>
      <div className="bg-zinc-300/50 dark:bg-zinc-700/50 rounded-full px-4 py-1">
        <span className="text-sm text-gray-700 dark:text-gray-300">{message}</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;