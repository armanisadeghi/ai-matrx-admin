import React from 'react';
import { SocketHook } from '@/lib/redux/socket/hooks/useSocket';


const SocketDebugPanel = ({ socketHook }: { socketHook: SocketHook }) => {
  const {
    namespace,
    service,
    taskType,
    streamEnabled,
    tasks,
    streamingResponse,
    responses,
    isResponseActive,
    isConnected,
    isAuthenticated
  } = socketHook;

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-400 dark:border-gray-600 rounded-md overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Connection Status Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Connection Status</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="font-semibold">Connected:</div>
            <div className={isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {isConnected ? "Yes" : "No"}
            </div>
            <div className="font-semibold">Authenticated:</div>
            <div className={isAuthenticated ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {isAuthenticated ? "Yes" : "No"}
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Configuration</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="font-semibold">Namespace:</div>
            <div className="truncate">{namespace}</div>
            <div className="font-semibold">Service:</div>
            <div className="truncate">{service || <span className="italic text-gray-400 dark:text-gray-500">Empty</span>}</div>
            <div className="font-semibold">Task Type:</div>
            <div className="truncate">{taskType || <span className="italic text-gray-400 dark:text-gray-500">Empty</span>}</div>
            <div className="font-semibold">Stream Enabled:</div>
            <div>{streamEnabled ? "Yes" : "No"}</div>
          </div>
        </div>

        {/* Response Status Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Response Status</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="font-semibold">Active Response:</div>
            <div className={isResponseActive ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>
              {isResponseActive ? "Yes" : "No"}
            </div>
            <div className="font-semibold">Responses Count:</div>
            <div>{responses.length}</div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm col-span-1 md:col-span-2 lg:col-span-3">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Tasks ({tasks.length})</h3>
          <div className="overflow-auto max-h-32">
            {tasks.map((task, idx) => (
              <div key={idx} className="mb-1 p-1 bg-gray-50 dark:bg-gray-700 rounded-sm text-xs">
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-semibold">Task {idx}:</div>
                  <div>{task.task || <span className="italic text-gray-400 dark:text-gray-500">Empty</span>}</div>
                  <div className="font-semibold">Index:</div>
                  <div>{task.index}</div>
                  <div className="font-semibold">Stream:</div>
                  <div>{task.stream ? "Yes" : "No"}</div>
                  <div className="font-semibold">Task Data:</div>
                  <div className="truncate">
                    {Object.keys(task.taskData).length > 0 
                      ? JSON.stringify(task.taskData) 
                      : <span className="italic text-gray-400 dark:text-gray-500">Empty Object</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streaming Response Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm col-span-1 md:col-span-2 lg:col-span-1">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Streaming Response</h3>
          <div className="overflow-auto max-h-32 bg-gray-50 dark:bg-gray-700 p-1 rounded-sm">
            <pre className="text-xs whitespace-pre-wrap">{streamingResponse || <span className="italic text-gray-400 dark:text-gray-500">No streaming data</span>}</pre>
          </div>
        </div>

        {/* Responses Section */}
        <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm col-span-1 md:col-span-2 lg:col-span-2">
          <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Responses Array ({responses.length})</h3>
          <div className="overflow-auto max-h-32 bg-gray-50 dark:bg-gray-700 p-1 rounded-sm">
            {responses.length > 0 ? (
              responses.map((response, idx) => (
                <div key={idx} className="mb-1 text-xs">
                  <div className="font-semibold">Response {idx}:</div>
                  <pre className="pl-2 text-xs whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
                </div>
              ))
            ) : (
              <span className="italic text-gray-400 dark:text-gray-500 text-xs">No responses</span>
            )}
          </div>
        </div>

        {/* Split State Data Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 col-span-1 md:col-span-2 lg:col-span-3">
          {/* All State Data */}
          <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm">
            <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">All State Data</h3>
            <div className="overflow-auto max-h-48 bg-gray-50 dark:bg-gray-700 p-1 rounded-sm">
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify({
                namespace,
                service,
                taskType,
                streamEnabled,
                isResponseActive,
                isConnected,
                isAuthenticated,
                streamingResponse,
                responsesCount: responses.length
              }, null, 2)}</pre>
            </div>
          </div>
          
          {/* Tasks Object */}
          <div className="p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-sm">
            <h3 className="text-xs font-bold mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">Tasks Object</h3>
            <div className="overflow-auto max-h-48 bg-gray-50 dark:bg-gray-700 p-1 rounded-sm">
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(tasks, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocketDebugPanel;