'use client';

import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  errors: string[];
  className?: string;
}

/**
 * Standard component for displaying validation errors
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, className = '' }) => {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {errors.length === 1 ? (
          <div>{errors[0]}</div>
        ) : (
          <div className="space-y-1">
            <div className="font-medium">Validation errors:</div>
            {errors.map((error, index) => (
              <div key={index} className="text-sm">• {error}</div>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay; 