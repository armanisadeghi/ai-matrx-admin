'use client';

import { useState } from 'react';
import { FunctionDependencies } from '@/utils/ts-function-registry/function-registry';
import { getResultComponent, ResultRendererProps } from '@/utils/ts-function-registry/component-registry';
import FunctionButton from './FunctionButton';

interface SmartFunctionExecutorProps {
  functionName: string;
  data: Record<string, any> | null;
  dependencies: FunctionDependencies;
  resultComponentName: string;
  buttonText?: string;
  context?: Record<string, any>;
  className?: string;
}

export default function SmartFunctionExecutor({
  functionName,
  data,
  dependencies,
  resultComponentName,
  buttonText,
  context = {},
  className
}: SmartFunctionExecutorProps) {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  
  // Get the result component from the registry
  const resultComponent = getResultComponent(resultComponentName);
  
  // Handle function execution
  const handleExecuted = (executionResult: any, executionError?: string) => {
    setResult(executionResult);
    setError(executionError || null);
    setHasExecuted(true);
    
    // You could also do additional processing here if needed
    // For example, transforming the result for specific component types
  };
  
  // Create combined context that includes both the provided context and data
  const fullContext = {
    ...context,
    ...data // Include the function parameters in the context for components that need it
  };
  
  return (
    <div className="smart-function-executor">
      <FunctionButton
        functionName={functionName}
        data={data}
        dependencies={dependencies}
        buttonText={buttonText}
        onExecuted={handleExecuted}
        className={className}
      />
      
      {hasExecuted && resultComponent && (
        <div className="mt-4">
          {resultComponent.render({
            result,
            functionName,
            error,
            context: fullContext
          })}
        </div>
      )}
      
      {hasExecuted && !resultComponent && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-200">
          Result component "{resultComponentName}" not found. Falling back to default display:
          <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 