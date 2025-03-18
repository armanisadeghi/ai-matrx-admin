"use client";
import { useState } from "react";
import { useChatSocket } from "@/lib/redux/socket/schema/hooks/useChatSocket";
import { usePrepConversationSocket } from "@/lib/redux/socket/schema/hooks/usePrepConversationSocket";

export default function ChatSocketTest() {
  // State for inputs
  const [conversationId, setConversationId] = useState("7ac4403c-020f-4a2e-b15d-9d07a211cbd2");
  const [messageJson, setMessageJson] = useState(
    JSON.stringify({
      id: "z9639103-f4b0-406c-a031-49d1c3a8a6a0",
      role: "user",
      content: "Wow this is great. Are you able to maybe give me some data on the next top 10?",
      type: "text"
    }, null, 2)
  );
  // Timing metrics
  const [metrics, setMetrics] = useState({
    requestStartTime: null as number | null,
    firstTokenTime: null as number | null,
    completionTime: null as number | null,
    totalCharacters: 0,
    charsPerSecond: "0", // Changed to string to match later updates
    ttft: null as string | null, // Time to first token
    totalStreamTime: null as string | null // Total streaming time
  });
  // Log important events
  const [events, setEvents] = useState([]);
  
  // Prep conversation response state
  const [prepResponse, setPrepResponse] = useState("");
  
  // Log an important event with timestamp
  const logEvent = (message) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setEvents(prev => [`${timestamp} - ${message}`, ...prev.slice(0, 19)]);
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
      const now = Date.now();
      
      // Capture first token time
      if (!metrics.firstTokenTime && metrics.requestStartTime) {
        const ttft = (now - metrics.requestStartTime) / 1000;
        setMetrics(prev => ({
          ...prev,
          firstTokenTime: now,
          ttft: ttft.toFixed(3)
        }));
        
        logEvent(`First token received after ${ttft.toFixed(3)}s`);
      }
      
      // Update total characters
      setMetrics(prev => ({
        ...prev,
        totalCharacters: text.length
      }));
      
      // If streaming has stopped, calculate final metrics
      if (!isStreaming && metrics.firstTokenTime && !metrics.completionTime && metrics.requestStartTime) {
        const streamTime = (now - metrics.firstTokenTime) / 1000;
        const totalTime = (now - metrics.requestStartTime) / 1000;
        const charsPerSecond = (text.length / streamTime).toFixed(2);
        
        setMetrics(prev => ({
          ...prev,
          completionTime: now,
          totalStreamTime: streamTime.toFixed(3),
          charsPerSecond: charsPerSecond
        }));
        
        logEvent(`Response completed after ${totalTime.toFixed(3)}s total`);
        logEvent(`Stream time: ${streamTime.toFixed(3)}s (${charsPerSecond} chars/sec)`);
      }
    },
    onError: (err) => {
      logEvent(`ERROR: ${err}`);
    }
  });
  
  // Use the prep conversation socket hook
  const {
    prepConversation,
    streamingResponse: prepStreamingResponse,
    isLoading: isPrepLoading,
    error: prepError
  } = usePrepConversationSocket({
    onResponse: (response) => {
      setPrepResponse(response);
      logEvent(`Prep conversation response received`);
    },
    onError: (err) => {
      logEvent(`PREP ERROR: ${err}`);
    }
  });
  
  // Parse message from JSON input
  const parseMessage = () => {
    try {
      return JSON.parse(messageJson);
    } catch (err) {
      console.error("Invalid JSON:", err);
      return null;
    }
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
    
    // Reset metrics
    const startTime = Date.now();
    setMetrics({
      requestStartTime: startTime,
      firstTokenTime: null,
      completionTime: null,
      totalCharacters: 0,
      charsPerSecond: "0",
      ttft: null,
      totalStreamTime: null
    });
    
    // Clear previous events and log start
    setEvents([]);
    logEvent(`Request sent: ${message.content.substring(0, 30)}...`);
    
    // Submit the message
    submitSocketMessage(message);
  };
  
  // Handle prep conversation request
  const handlePrepConversation = () => {
    if (!conversationId) {
      alert("Please enter a conversation ID");
      return;
    }
    
    setPrepResponse("");
    logEvent(`Prep conversation request sent for ID: ${conversationId}`);
    prepConversation(conversationId);
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Chat Socket Performance Test</h1>
      
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
            rows={8}
            placeholder="Enter message JSON"
          />
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-4">
          {/* Submit button */}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
            disabled={isLoading || !conversationId}
          >
            {isLoading ? "Waiting for response..." : "Send Message"}
          </button>
          
          {/* Prep Conversation button */}
          <button
            type="button"
            onClick={handlePrepConversation}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600"
            disabled={isPrepLoading || !conversationId}
          >
            {isPrepLoading ? "Preparing..." : "Prep Conversation"}
          </button>
        </div>
      </form>
      
      {/* Performance metrics */}
      <div className="mb-6 p-4 border rounded border-gray-700 bg-gray-800">
        <h2 className="text-xl font-bold mb-3">Performance Metrics</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div>
            <span className="text-gray-400">Time to First Token:</span> 
            <span className="ml-2 font-mono">{metrics.ttft ? `${metrics.ttft}s` : 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Stream Time:</span> 
            <span className="ml-2 font-mono">{metrics.totalStreamTime ? `${metrics.totalStreamTime}s` : 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Characters:</span> 
            <span className="ml-2 font-mono">{metrics.totalCharacters.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Characters Per Second:</span> 
            <span className="ml-2 font-mono">{metrics.charsPerSecond ? `${metrics.charsPerSecond}` : 'N/A'}</span>
          </div>
        </div>
      </div>
      
      {/* Current status indicators */}
      <div className="mb-6 flex space-x-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isLoading ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
          <span>Loading</span>
        </div>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isStreaming ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span>Streaming</span>
        </div>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isPrepLoading ? 'bg-purple-400' : 'bg-gray-500'}`}></div>
          <span>Prep Loading</span>
        </div>
      </div>
      
      {/* Error displays */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded">
          <h3 className="font-bold">Chat Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {prepError && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded">
          <h3 className="font-bold">Prep Error:</h3>
          <p>{prepError}</p>
        </div>
      )}
      
      {/* Response displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Chat response */}
        <div>
          <h2 className="text-xl font-bold mb-2">Chat Response:</h2>
          <div className="p-4 border rounded bg-gray-800 border-gray-700 min-h-32 whitespace-pre-wrap font-mono text-green-400 overflow-auto max-h-80">
            {streamingResponse || "No response yet"}
          </div>
        </div>
        
        {/* Prep response */}
        <div>
          <h2 className="text-xl font-bold mb-2">Prep Response:</h2>
          <div className="p-4 border rounded bg-gray-800 border-gray-700 min-h-32 whitespace-pre-wrap font-mono text-purple-400 overflow-auto max-h-80">
            {prepResponse || "No prep response yet"}
          </div>
        </div>
      </div>
      
      {/* Event log - now only showing important events */}
      <div>
        <h2 className="text-xl font-bold mb-2">Event Log:</h2>
        <div className="p-4 border rounded bg-gray-800 border-gray-700 min-h-32 font-mono text-xs text-gray-300 overflow-auto max-h-60">
          {events.length > 0 ? (
            events.map((event, index) => <div key={index}>{event}</div>)
          ) : (
            "No events logged yet"
          )}
        </div>
      </div>
    </div>
  );
}