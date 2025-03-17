"use client";

import { useState, useEffect } from "react";
import { useChatSocket } from "@/lib/redux/socket/task-managers/hooks/useChatSocket";
import { Message } from "@/types/chat/chat.types";

export default function ChatSocketTest() {
  // State for inputs
  const [conversationId, setConversationId] = useState("7ac4403c-020f-4a2e-b15d-9d07a211cbd2");
  const [messageJson, setMessageJson] = useState(
    JSON.stringify({
      id: "z9639103-f4b0-406c-a031-49d1c3a8a6a0",
      role: "user",
      content: "Can you give me some more information including some more tables and just more facts?",
      type: "text"
    }, null, 2)
  );

  // Debug state tracking
  const [requestSent, setRequestSent] = useState(false);
  const [requestTimestamp, setRequestTimestamp] = useState<number | null>(null);
  const [responseStarted, setResponseStarted] = useState(false);
  const [responseUpdates, setResponseUpdates] = useState(0);
  const [socketEvents, setSocketEvents] = useState<string[]>([]);

  // Parse message from JSON input
  const parseMessage = (): Message | null => {
    try {
      return JSON.parse(messageJson);
    } catch (err) {
      console.error("Invalid JSON:", err);
      return null;
    }
  };

  // Log socket events
  const logSocketEvent = (event: string) => {
    setSocketEvents(prev => [
      `${new Date().toISOString().substring(11, 23)} - ${event}`,
      ...prev.slice(0, 19)
    ]);
  };

  // Use the chat socket hook
  const {
    submitSocketMessage,
    streamingResponse,
    isLoading,
    isStreaming,
    error
  } = useChatSocket({
    conversationId,
    onResponse: (text) => {
      if (!responseStarted) {
        setResponseStarted(true);
        logSocketEvent(`First response received (${text.length} chars)`);
      }
      
      setResponseUpdates(prev => prev + 1);
      logSocketEvent(`Response update #${responseUpdates + 1} (${text.length} chars)`);
    },
    onError: (err) => {
      logSocketEvent(`ERROR: ${err}`);
    }
  });

  // Reset debug states
  const resetDebugState = () => {
    setRequestSent(false);
    setRequestTimestamp(null);
    setResponseStarted(false);
    setResponseUpdates(0);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!conversationId) {
      alert("Please enter a conversation ID");
      return;
    }
    
    const message = parseMessage();
    if (!message) {
      alert("Invalid message JSON");
      return;
    }
    
    // Reset debug state
    resetDebugState();
    
    // Log the request
    setRequestSent(true);
    setRequestTimestamp(Date.now());
    logSocketEvent(`Request sent: ${message.content.substring(0, 30)}...`);
    
    // Submit the message
    console.log("Submitting message:", message);
    submitSocketMessage(message);
  };

  // Calculate time elapsed since request
  const getElapsedTime = () => {
    if (!requestTimestamp) return null;
    const elapsed = Math.floor((Date.now() - requestTimestamp) / 1000);
    return elapsed;
  };

  // Update elapsed time display
  useEffect(() => {
    if (!requestTimestamp || !requestSent || responseStarted) return;
    
    const timer = setInterval(() => {
      // Force re-render to update elapsed time
      setRequestTimestamp(prev => prev);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [requestTimestamp, requestSent, responseStarted]);

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Chat Socket Test</h1>
      
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        {/* Conversation ID input */}
        <div>
          <label className="block mb-1">Conversation ID:</label>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            className="w-full p-2 border rounded bg-gray-800 text-white border-gray-700"
            placeholder="Enter conversation ID"
          />
        </div>
        
        {/* Message JSON textarea */}
        <div>
          <label className="block mb-1">Message JSON:</label>
          <textarea
            value={messageJson}
            onChange={(e) => setMessageJson(e.target.value)}
            className="w-full p-2 border rounded font-mono text-sm bg-gray-800 text-white border-gray-700"
            rows={10}
            placeholder="Enter message JSON"
          />
        </div>
        
        {/* Submit button */}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
          disabled={isLoading || !conversationId}
        >
          {isLoading ? "Waiting for response..." : "Send Message"}
        </button>
      </form>
      
      {/* Detailed state indicators */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="p-3 border rounded border-gray-700 bg-gray-800">
          <h3 className="font-bold mb-2">Socket States:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isLoading ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
              <span>isLoading: {isLoading ? 'True' : 'False'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isStreaming ? 'bg-green-400' : 'bg-gray-500'}`}></div>
              <span>isStreaming: {isStreaming ? 'True' : 'False'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${requestSent ? 'bg-blue-400' : 'bg-gray-500'}`}></div>
              <span>Request Sent: {requestSent ? 'True' : 'False'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${responseStarted ? 'bg-green-400' : 'bg-gray-500'}`}></div>
              <span>Response Started: {responseStarted ? 'True' : 'False'}</span>
            </div>
          </div>
        </div>
        
        <div className="p-3 border rounded border-gray-700 bg-gray-800">
          <h3 className="font-bold mb-2">Timing Info:</h3>
          <div className="space-y-2 text-sm">
            <div>Request Time: {requestTimestamp ? new Date(requestTimestamp).toISOString().substring(11, 23) : 'N/A'}</div>
            <div>Waiting Time: {requestSent && !responseStarted ? `${getElapsedTime()} seconds` : 'N/A'}</div>
            <div>Updates Received: {responseUpdates}</div>
            <div>Response Length: {streamingResponse.length} characters</div>
          </div>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {/* Response display */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Response:</h2>
        <div className="p-4 border rounded bg-gray-800 border-gray-700 min-h-32 whitespace-pre-wrap font-mono text-green-400 overflow-auto max-h-80">
          {streamingResponse || "No response yet"}
        </div>
      </div>
      
      {/* Event log */}
      <div>
        <h2 className="text-xl font-bold mb-2">Event Log:</h2>
        <div className="p-4 border rounded bg-gray-800 border-gray-700 min-h-32 font-mono text-xs text-gray-300 overflow-auto max-h-60">
          {socketEvents.length > 0 ? (
            socketEvents.map((event, index) => <div key={index}>{event}</div>)
          ) : (
            "No events logged yet"
          )}
        </div>
      </div>
    </div>
  );
}