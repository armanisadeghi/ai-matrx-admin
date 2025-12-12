'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BasicInput } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { get_prompt_sample, TEST_ADMIN_TOKEN } from './sample-prompt';
import MarkdownStream from '@/components/MarkdownStream';

type ServerType = 'local' | 'production';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export default function ApiTestsPage() {
  const [serverType, setServerType] = useState<ServerType>('local');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ApiResponse>>({});
  const [streamOutput, setStreamOutput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [authToken, setAuthToken] = useState<string>(TEST_ADMIN_TOKEN);
  const [chatStreamOutput, setChatStreamOutput] = useState<string>('');
  const [chatStreamText, setChatStreamText] = useState<string>('');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [streamDebugInfo, setStreamDebugInfo] = useState<{
    chunkCount: number;
    totalBytes: number;
    lastChunkTime: number | null;
    jsonEventCount: number;
  }>({ chunkCount: 0, totalBytes: 0, lastChunkTime: null, jsonEventCount: 0 });

  const getBaseUrl = () => {
    if (serverType === 'local') {
        
      return process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000';
    }
    return process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL || 'https://server.app.matrxserver.com';
  };

  const testEndpoint = async (endpoint: string, method: string = 'GET', body?: any) => {
    const key = `${method} ${endpoint}`;
    setLoading(key);
    setResults(prev => ({ ...prev, [key]: { success: false, error: 'Loading...' } }));

    try {
      const url = `${getBaseUrl()}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

      setResults(prev => ({
        ...prev,
        [key]: {
          success: response.ok,
          data,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          status: response.status,
        },
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const testStreamingEndpoint = async () => {
    const endpoint = '/api/stream/text?message=React+Streaming+Test&chunks=50&delay=0.1';
    const url = `${getBaseUrl()}${endpoint}`;
    
    setStreamOutput('');
    setIsStreaming(true);
    setLoading('STREAMING');

    try {
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          // Update state with new chunk - this triggers a re-render for every chunk
          setStreamOutput(prev => prev + chunk);
        }
      }
      
    } catch (error) {
       setStreamOutput(prev => prev + `\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
      setLoading(null);
    }
  };

  const testChatDirectEndpoint = async () => {
    const endpoint = '/api/chat/direct';
    const url = `${getBaseUrl()}${endpoint}`;
    
    setChatStreamOutput('');
    setChatStreamText('');
    setIsChatStreaming(true);
    setLoading('CHAT_STREAMING');
    setStreamDebugInfo({ chunkCount: 0, totalBytes: 0, lastChunkTime: null, jsonEventCount: 0 });

    try {
      // Build request body from sample prompt
      const promptSample = get_prompt_sample('small_test_prompt');
      if (!promptSample) throw new Error('No prompt sample found');
      
      // Flatten the structure: spread settings into the root level
      const requestBody = {
        messages: promptSample.messages,
        ...promptSample.settings,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let chunkCount = 0;
      let totalBytes = 0;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          chunkCount++;
          totalBytes += value.length;
          const timestamp = Date.now();
          
          // Decode chunk and add to buffer
          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;
          
          console.log(`[Chunk ${chunkCount}] Received ${value.length} bytes at ${timestamp}, buffer length: ${buffer.length}`);
          
          // Process complete lines (JSONL format - newline-delimited JSON)
          const lines = buffer.split('\n');
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          let jsonEventsInChunk = 0;
          
          // Process each complete line
          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                jsonEventsInChunk++;
                const jsonTimestamp = Date.now();
                console.log(`[JSON ${jsonTimestamp}] Parsed event: ${json.event}, data type: ${typeof json.data}, data length: ${typeof json.data === 'string' ? json.data.length : 'N/A'}`);
                
                // Format and append to JSON output
                setChatStreamOutput(prev => prev + JSON.stringify(json, null, 2) + '\n\n');
                
                // Extract chunk events and accumulate text
                if (json.event === 'chunk' && typeof json.data === 'string') {
                  console.log(`[Chunk Text] Adding ${json.data.length} chars: "${json.data.substring(0, 50)}${json.data.length > 50 ? '...' : ''}"`);
                  setChatStreamText(prev => prev + json.data);
                }
              } catch (e) {
                // If JSON parse fails, just append the raw line
                setChatStreamOutput(prev => prev + line + '\n');
              }
            }
          }
          
          // Update debug info after processing
          setStreamDebugInfo(prev => ({
            chunkCount,
            totalBytes,
            lastChunkTime: timestamp,
            jsonEventCount: prev.jsonEventCount + jsonEventsInChunk,
          }));
        }
      }
      
      console.log(`[Stream Complete] Total chunks: ${chunkCount}, Total bytes: ${totalBytes}`);
      
      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          setChatStreamOutput(prev => prev + JSON.stringify(json, null, 2) + '\n\n');
          
          // Extract chunk events from remaining buffer
          if (json.event === 'chunk' && typeof json.data === 'string') {
            setChatStreamText(prev => prev + json.data);
          }
        } catch (e) {
          setChatStreamOutput(prev => prev + buffer + '\n');
        }
      }
      
    } catch (error) {
       setChatStreamOutput(prev => prev + `\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChatStreaming(false);
      setLoading(null);
    }
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-3 pb-48">
        <div className="w-full space-y-2">
        <div>
          <h1 className="text-lg font-bold">FastAPI Test Page</h1>
        </div>

        {/* Server Selection */}
        <div className="flex items-center gap-3 py-1.5 border-b">
          <span className="text-xs font-semibold w-24">Server:</span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={serverType === 'local' ? 'default' : 'outline'}
              onClick={() => setServerType('local')}
              className="h-7 text-xs px-2"
            >
              Localhost
            </Button>
            <Button
              size="sm"
              variant={serverType === 'production' ? 'default' : 'outline'}
              onClick={() => setServerType('production')}
              className="h-7 text-xs px-2"
            >
              Production
            </Button>
          </div>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {getBaseUrl()}
          </span>
        </div>

        {/* Auth Token */}
        <div className="flex items-center gap-3 py-1.5 border-b">
          <span className="text-xs font-semibold w-24">Auth Token:</span>
          <BasicInput
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter auth token"
            className="h-7 text-xs flex-1"
          />
        </div>

        {/* Health Check */}
        <div className="flex items-center gap-3 py-1.5 border-b">
          <span className="text-xs font-semibold w-24">Health:</span>
          <Button
            size="sm"
            onClick={() => testEndpoint('/api/health')}
            disabled={loading === 'GET /api/health'}
            className="h-7 text-xs px-2"
          >
            {loading === 'GET /api/health' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Test /api/health
          </Button>
          {results['GET /api/health'] && (
            <div className="flex items-center gap-2 ml-2">
              <span className={`text-xs font-semibold ${results['GET /api/health'].success ? 'text-success' : 'text-destructive'}`}>
                {results['GET /api/health'].success ? '✓' : '✗'}
                {results['GET /api/health'].status && ` ${results['GET /api/health'].status}`}
              </span>
              <details className="text-xs font-mono">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View JSON</summary>
                <pre className="mt-1 p-1.5 bg-muted rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(results['GET /api/health'].data || results['GET /api/health'].error, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Examples Endpoints */}
        <div className="flex items-center gap-3 py-1.5 border-b">
          <span className="text-xs font-semibold w-24">Examples:</span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() => testEndpoint('/api/examples')}
              disabled={loading === 'GET /api/examples'}
              className="h-7 text-xs px-2"
            >
              {loading === 'GET /api/examples' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              GET
            </Button>
            <Button
              size="sm"
              onClick={() => testEndpoint('/api/examples', 'POST', {
                name: 'Test Item',
                description: 'A test item',
                price: 9.99,
                tags: ['test', 'demo'],
              })}
              disabled={loading === 'POST /api/examples'}
              className="h-7 text-xs px-2"
            >
              {loading === 'POST /api/examples' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              POST
            </Button>
          </div>
          {Object.entries(results)
            .filter(([key]) => key.startsWith('GET /api/examples') || key.startsWith('POST /api/examples'))
            .map(([key, result]) => (
              <div key={key} className="flex items-center gap-2 ml-2">
                <span className={`text-xs font-semibold ${result.success ? 'text-success' : 'text-destructive'}`}>
                  {key.split(' ')[0]} {result.success ? '✓' : '✗'}
                  {result.status && ` ${result.status}`}
                </span>
                <details className="text-xs font-mono">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View</summary>
                  <pre className="mt-1 p-1.5 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
        </div>

        {/* Streaming Test */}
        <div className="py-1.5 border-b">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold w-24">Stream Test:</span>
            <Button 
              size="sm"
              onClick={testStreamingEndpoint} 
              disabled={isStreaming}
              className="h-7 text-xs px-2"
            >
              {isStreaming && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {isStreaming ? 'Streaming...' : 'Start'}
            </Button>
          </div>
          <div className="ml-28 p-1.5 bg-muted rounded text-xs font-mono h-32 overflow-y-auto whitespace-pre-wrap">
            {streamOutput || "No stream data yet..."}
          </div>
        </div>

        {/* Chat Direct Streaming Test */}
        <div className="py-1.5 border-b">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold w-24">Chat Stream:</span>
            <Button 
              size="sm"
              onClick={testChatDirectEndpoint} 
              disabled={isChatStreaming}
              className="h-7 text-xs px-2"
            >
              {isChatStreaming && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {isChatStreaming ? 'Streaming...' : 'Start'}
            </Button>
            
            {/* Debug Info */}
            {(isChatStreaming || streamDebugInfo.chunkCount > 0) && (
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span>Chunks: {streamDebugInfo.chunkCount}</span>
                <span>Bytes: {streamDebugInfo.totalBytes.toLocaleString()}</span>
                <span>Events: {streamDebugInfo.jsonEventCount}</span>
                <span>
                  {isChatStreaming
                    ? streamDebugInfo.lastChunkTime
                      ? `${((Date.now() - streamDebugInfo.lastChunkTime) / 1000).toFixed(2)}s ago`
                      : 'Starting...'
                    : 'Complete'}
                </span>
              </div>
            )}
          </div>
          
          <div className="ml-28 grid grid-cols-2 gap-2">
            {/* Left side: JSON output */}
            <div className="p-1.5 bg-muted rounded text-xs font-mono overflow-y-auto max-h-96 whitespace-pre-wrap">
              {chatStreamOutput || "No JSON data yet..."}
            </div>
            
            {/* Right side: Streaming text from chunks (rendered as markdown) */}
            <div className="p-1.5 bg-textured overflow-y-auto max-h-96">
              {chatStreamText ? (
                <MarkdownStream 
                  content={chatStreamText} 
                  isStreamActive={isChatStreaming}
                  role="assistant"
                  className="text-xs"
                />
              ) : (
                <div className="text-xs text-muted-foreground">No streaming text yet...</div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

