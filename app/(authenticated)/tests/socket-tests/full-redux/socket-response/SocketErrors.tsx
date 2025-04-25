import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import { selectResponseErrorsByListenerId } from '@/lib/redux/socket-io/selectors';
import { SocketErrorObject } from '@/lib/redux/socket-io/socket.types';

// Helper function to safely format JSON with proper indentation
const formatJson = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return 'Error formatting JSON';
  }
};

// Individual property display component
const ErrorProperty = ({ 
  label, 
  value, 
  isJson = false 
}: { 
  label: string; 
  value: any; 
  isJson?: boolean;
}) => {
  if (value === undefined || value === null) return null;
  
  return (
    <div className="mb-2">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}: </span>
      {isJson ? (
        <pre className="whitespace-pre-wrap break-words text-sm mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
          {formatJson(value)}
        </pre>
      ) : (
        <span className="text-gray-800 dark:text-gray-200">{String(value)}</span>
      )}
    </div>
  );
};

// Individual error item component
const ErrorItem = ({ error, index }: { error: SocketErrorObject; index: number }) => {
    if (!error) return null;
    const { type, message, user_visible_message, code, details } = error;
    const hasDetails = details !== undefined && details !== null;
    
    return (
      <div className="border border-red-200 dark:border-red-800 rounded-md p-3 mb-3 bg-red-50 dark:bg-red-900/20">
        <div className="font-bold text-red-700 dark:text-red-400 mb-2">Error #{index + 1}</div>
        
        <ErrorProperty label="Type" value={type} />
        <ErrorProperty label="Message" value={message} />
        <ErrorProperty label="User Message" value={user_visible_message} />
        <ErrorProperty label="Code" value={code} />
        
        {hasDetails && (
          <div className="mt-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Details:</span>
            <pre className="whitespace-pre-wrap break-words text-sm mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              {formatJson(details)}
            </pre>
          </div>
        )}
      </div>
    );
  };
  
// Main errors component with memoization to prevent unnecessary re-renders
const SocketAdminErrorDisplay = memo(({ eventName }: { eventName: string }) => {
  const errors = useSelector(selectResponseErrorsByListenerId(eventName));
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  
  return (
    <div className="text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md p-4">
      <div className="font-medium text-lg mb-2 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Admin Error Console
      </div>
      
      {hasErrors ? (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <ErrorItem key={`error-${index}`} error={error} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-gray-400 dark:text-gray-500 italic">No errors to display</div>
      )}
    </div>
  );
});

// Add display name for debugging
SocketAdminErrorDisplay.displayName = 'SocketAdminErrorDisplay';

export default SocketAdminErrorDisplay;