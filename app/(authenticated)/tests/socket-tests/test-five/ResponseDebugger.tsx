"use client";

import React, { useEffect, useState } from 'react';
import { useSimpleSocketTask } from "@/lib/redux/socket/hooks/useSimpleSocketTask";

// A simple component that just shows raw response data
const ResponseDebugger = () => {
  const [namespace, setNamespace] = useState("UserSession");
  const [eventName, setEventName] = useState("simple_recipe");
  const [taskName, setTaskName] = useState("run_recipe"); 
  const [taskData, setTaskData] = useState({
    recipe_id: "e2049ce6-c340-4ff7-987e-deb24a977853",
    broker_values: [],
    overrides: {
      model_override: "gpt-4o",
      processor_overrides: {},
      other_overrides: {}
    }
  });

  // For tracking response data
  const [rawResponseStr, setRawResponseStr] = useState('No response yet');
  const [typeInfo, setTypeInfo] = useState('No type info yet');
  const [stringified, setStringified] = useState('No stringified yet');
  
  // Socket hook
  const { streamingResponses, handleSend, handleClear, isResponseActive } = useSimpleSocketTask({
    eventName,
    taskName,
    tasksList: [taskData],
  });

  // Monitor changes to responses
  useEffect(() => {
    if (Object.keys(streamingResponses).length > 0) {
      // Get first response
      const firstResponse = streamingResponses[0];
      
      // Set raw display
      setRawResponseStr(String(firstResponse));
      
      // Get type info
      setTypeInfo(`
Type: ${typeof firstResponse}
isObject: ${typeof firstResponse === 'object' && firstResponse !== null}
isArray: ${Array.isArray(firstResponse)}
Constructor: ${firstResponse?.constructor?.name || 'unknown'}
Keys: ${typeof firstResponse === 'object' && firstResponse !== null ? Object.keys(firstResponse).join(', ') : 'none'}
      `);
      
      // Try to stringify properly
      try {
        if (typeof firstResponse === 'object' && firstResponse !== null) {
          const properStringified = JSON.stringify(firstResponse, null, 2);
          setStringified(properStringified);
        } else {
          setStringified('Not an object');
        }
      } catch (err) {
        setStringified(`Stringify error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [streamingResponses]);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Response Debugger</h1>
      
      <div className="space-y-2">
        <button 
          onClick={handleSend}
          disabled={isResponseActive}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send Test Request
        </button>
        
        <button 
          onClick={handleClear}
          className="ml-2 px-4 py-2 bg-red-500 text-white rounded"
        >
          Clear
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-bold">Raw Response Display</h2>
          <pre className="bg-gray-100 p-2 mt-2 rounded">
            {rawResponseStr}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-bold">Type Information</h2>
          <pre className="bg-gray-100 p-2 mt-2 rounded">
            {typeInfo}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-bold">Properly Stringified</h2>
          <pre className="bg-gray-100 p-2 mt-2 rounded">
            {stringified}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-bold">All Responses (Debug)</h2>
          <pre className="bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-96">
            {Object.entries(streamingResponses).map(([key, value]) => (
              <div key={key} className="mb-4">
                <h3>Response #{key}</h3>
                <div className="pl-4 border-l-2 border-blue-500">
                  <div>Type: {typeof value}</div>
                  <div>Raw toString: {String(value)}</div>
                  <div>Stringified: {typeof value === 'object' && value !== null ? 
                    JSON.stringify(value, null, 2) : 'Not an object'}</div>
                </div>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ResponseDebugger;