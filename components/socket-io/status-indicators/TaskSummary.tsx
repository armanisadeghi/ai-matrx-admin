import React from "react";
import { useAppSelector } from "@/lib/redux";
import { 
  selectTaskStatus, 
  selectTaskValidationState,
  selectTaskListenerIds,
  selectTaskError,
  selectIsTaskComplete,
  selectResponseEndedByListenerId,
  selectHasResponseErrorsByListenerId,
} from "@/lib/redux/socket-io";
import { MultiStateStatusIndicator } from "./MultiStateStatusIndicator";
import { CompactListDisplay } from "./CompactListDisplay";
// Import Lucide React icons
import { 
  CheckCircle, 
  ClipboardList, 
  ArrowDown, 
  Check, 
  AlertTriangle, 
  X, 
  Loader 
} from "lucide-react";

// Component to display a complete task summary
export const TaskSummary = ({ taskId }: { taskId: string }) => {
  const status = useAppSelector(state => selectTaskStatus(state, taskId));
  const { isValid, validationErrors } = useAppSelector(state => selectTaskValidationState(state, taskId));
  const listenerIds = useAppSelector(state => selectTaskListenerIds(state, taskId));
  const taskError = useAppSelector(state => selectTaskError(taskId)(state));
  const isComplete = useAppSelector(state => selectIsTaskComplete(taskId)(state));
  
  // Status options
  const taskStatusOptions = [
    { 
      value: "ready", 
      label: "Ready", 
      icon: <CheckCircle className="w-4 h-4" />, 
      color: "blue-500" 
    },
    { 
      value: "submitted", 
      label: "Submitted", 
      icon: <ClipboardList className="w-4 h-4" />, 
      color: "blue-500" 
    },
    { 
      value: "building", 
      label: "Building", 
      icon: <ArrowDown className="w-4 h-4 animate-pulse" />, 
      color: "purple-500" 
    },
    { 
      value: "completed", 
      label: "Completed", 
      icon: <Check className="w-4 h-4" />, 
      color: "green-500" 
    },
    { 
      value: "error", 
      label: "Error", 
      icon: <AlertTriangle className="w-4 h-4" />, 
      color: "red-500" 
    },
    { 
      value: "not_found", 
      label: "Not Found", 
      icon: <X className="w-4 h-4" />, 
      color: "gray-500" 
    }
  ];
  // Validation options
  const validationOptions = [
    { 
      value: "valid", 
      label: "Valid", 
      icon: <Check className="w-4 h-4" />, 
      color: "green-500" 
    },
    { 
      value: "invalid", 
      label: "Invalid", 
      icon: <X className="w-4 h-4" />, 
      color: "red-500" 
    }
  ];
  return (
    <div className="p-4 border rounded-lg bg-textured shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium mb-4">Task #{taskId.substring(0, 8)}</h3>
          
          <div className="space-y-3">
            {/* Task Status */}
            <MultiStateStatusIndicator 
              options={taskStatusOptions} 
              currentValue={status} 
              label="Status"
            />
            
            {/* Validation Status */}
            <MultiStateStatusIndicator 
              options={validationOptions} 
              currentValue={isValid ? "valid" : "invalid"} 
              label="Validation"
            />
            
            {/* Completion Status */}
            <div className="flex items-center space-x-2">
              <div className={`text-${isComplete ? "green-500" : "blue-500"}`}>
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Loader className="w-4 h-4 animate-spin" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Completion</span>
                <span className="text-sm font-medium">{isComplete ? "Complete" : "In Progress"}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-500 mb-1">Validation Errors</h4>
              <ul className="text-sm text-red-400 pl-5 list-disc">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Task Error */}
          {taskError && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-500 mb-1">Error</h4>
              <div className="text-sm text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {JSON.stringify(taskError, null, 2)}
              </div>
            </div>
          )}
          
          {/* Listener IDs */}
          <div className="mt-4">
            <CompactListDisplay
              items={listenerIds}
              label="Listener IDs"
              displayCount={1}
              isCopyable={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
// Component to display stream status
export const StreamStatusIndicator = ({ listenerId }: { listenerId: string }) => {
  const hasErrors = useAppSelector(state => selectHasResponseErrorsByListenerId(listenerId)(state));
  const isEnded = useAppSelector(state => selectResponseEndedByListenerId(listenerId)(state));
  
  // Stream status options
  const streamStatusOptions = [
    { 
      value: "completed", 
      label: "Completed", 
      icon: <Check className="w-4 h-4" />, 
      color: "green-500" 
    },
    { 
      value: "streaming", 
      label: "Streaming", 
      icon: <ArrowDown className="w-4 h-4 animate-pulse" />, 
      color: "blue-500" 
    },
    { 
      value: "error", 
      label: "Error", 
      icon: <AlertTriangle className="w-4 h-4" />, 
      color: "red-500" 
    }
  ];
  
  let currentValue = "streaming";
  
  if (isEnded) {
    currentValue = hasErrors ? "error" : "completed";
  }
  
  return (
    <MultiStateStatusIndicator 
      options={streamStatusOptions} 
      currentValue={currentValue} 
      label={`Stream ${listenerId.substring(0, 8)}`}
    />
  );
};
// Component for task and all of its streams
export const TaskWithStreams = ({ taskId }: { taskId: string }) => {
  const listenerIds = useAppSelector(state => selectTaskListenerIds(state, taskId));
  
  return (
    <div className="space-y-4">
      <TaskSummary taskId={taskId} />
      
      {listenerIds.length > 0 && (
        <div className="border rounded-lg p-4 bg-textured">
          <h4 className="text-sm font-medium mb-3">Stream Statuses</h4>
          <div className="space-y-2">
            {listenerIds.map(id => (
              <StreamStatusIndicator key={id} listenerId={id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};