import React from 'react';
import { cn } from "@/lib/utils";

interface ValidationMessageProps {
  message?: string;
  touched?: boolean;
  className?: string;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  touched = false,
  className
}) => {
  if (!message || !touched) {
    return null;
  }

  return (
    <div className={cn(
      "text-red-500 dark:text-red-400 text-sm mt-1",
      className
    )}>
      {message}
    </div>
  );
};

export default ValidationMessage; 