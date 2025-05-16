'use client';

import { useState, useEffect } from 'react';
import { executeFunction, FunctionDependencies } from '@/utils/ts-function-registry/function-registry';

interface FunctionButtonProps {
  // The name of the registered function to execute
  functionName: string;
  
  // Data to be used as parameters (can be null if not available yet)
  data: Record<string, any> | null;
  
  // Dependencies required by functions
  dependencies: FunctionDependencies;
  
  // Optional custom button text
  buttonText?: string;
  
  // Optional callback for when execution completes
  onExecuted?: (result: any, error?: string) => void;
  
  // Optional custom classes for the button
  className?: string;
}

export default function FunctionButton({
  functionName,
  data,
  dependencies,
  buttonText,
  onExecuted,
  className = ''
}: FunctionButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Default button text uses the function name if not provided
  const displayText = buttonText || `Execute ${functionName}`;
  
  // Handle button click to execute the function
  const handleExecute = async () => {
    if (!data || isExecuting) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      // Execute the registered function with the provided data and dependencies
      const executionResult = await executeFunction(
        functionName,
        data,
        dependencies
      );
      
      setResult(executionResult);
      
      // Call the callback if provided
      if (onExecuted) {
        onExecuted(executionResult);
      }
    } catch (err) {
      console.error(`Error executing function ${functionName}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Call the callback with error if provided
      if (onExecuted) {
        onExecuted(null, errorMessage);
      }
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Generate button classes based on state
  const buttonClasses = `
    px-4 py-2 rounded-md shadow-sm
    ${data ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
    ${isExecuting ? 'opacity-70' : ''}
    ${className}
  `;
  
  return (
    <button
      onClick={handleExecute}
      disabled={!data || isExecuting}
      className={buttonClasses}
    >
      {isExecuting ? 'Executing...' : displayText}
    </button>
  );
} 