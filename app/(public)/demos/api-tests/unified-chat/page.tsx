'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, X, Play, Settings2, FileText, FileJson, BarChart3 } from 'lucide-react';
import { TEST_ADMIN_TOKEN } from '../sample-prompt';
import MarkdownStream from '@/components/MarkdownStream';
import { useApiTestConfig, ApiTestConfigPanel } from '@/components/api-test-config';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { useModelControls, getModelDefaults } from '@/features/prompts/hooks/useModelControls';
import { PromptMessage, PromptSettings } from '@/features/prompts/types/core';
import { ModelSettings } from '@/features/prompts/components/configuration/ModelSettings';
import { SettingsJsonEditor } from '@/features/prompts/components/configuration/SettingsJsonEditor';
import { removeNullSettings } from '@/features/prompts/utils/settings-filter';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UsageStatsModal } from '@/components/chat/UsageStatsModal';
import { supabase } from '@/utils/supabase/client';

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  messages: PromptMessage[];
  variable_defaults?: unknown[];
  settings?: PromptSettings;
}

interface Tool {
  name: string;
  description: string;
  category?: string;
}

export default function ChatTestPage() {
  const apiConfig = useApiTestConfig({
    defaultServerType: 'local',
    defaultAuthToken: TEST_ADMIN_TOKEN,
  });

  // Data loading states
  const [models, setModels] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Configuration states
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('e407ba1d-34b4-4a2d-bdca-0566d3171d58');
  const [modelConfig, setModelConfig] = useState<PromptSettings>({});
  const [messages, setMessages] = useState<PromptMessage[]>([
    { role: 'system', content: "You're a helpful assistant. Today's date is " + new Date().toLocaleDateString() + ". Ensure you always include recent and relevant facts in your response." },
    // { role: 'user', content: 'Hello! Can you help me? What is the latest us news?' }
    { role: 'user', content: 'Hello! Can you tell me the biggest AI LLM advancements of 2025 and an outlook for 2026?' }
  ]);
  const [debugMode, setDebugMode] = useState(true);
  const [streamEnabled, setStreamEnabled] = useState(true);

  // Test execution states
  const [isRunning, setIsRunning] = useState(false);
  const [streamOutput, setStreamOutput] = useState<string>('');
  const [streamText, setStreamText] = useState<string>('');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<{
    chunkCount: number;
    totalBytes: number;
    eventCount: number;
    startTime: number | null;
    endTime: number | null;
  }>({ chunkCount: 0, totalBytes: 0, eventCount: 0, startTime: null, endTime: null });

  // Settings panel state
  const [showSettings, setShowSettings] = useState(true);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  
  // Usage stats modal state
  const [usageStatsData, setUsageStatsData] = useState<any>(null);
  const [showUsageStats, setShowUsageStats] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run test
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && selectedModelId && messages.length > 0) {
          runTest();
        }
      }
      // Escape to stop test (if running)
      if (e.key === 'Escape' && isRunning) {
        // Note: Can't actually stop the stream, but this is a placeholder
        // for future implementation if needed
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, selectedModelId, messages]);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);

        // Load models and tools from API routes
        const [modelsRes, toolsRes] = await Promise.all([
          fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
          fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
        ]);

        const loadedModels = modelsRes?.models || [];
        setModels(loadedModels);
        setAvailableTools(toolsRes?.tools || []);

        // Load prompts directly via Supabase client (works for authenticated users)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userPrompts, error } = await supabase
              .from('prompts')
              .select('id, name, messages, settings, variable_defaults, description')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false });

            if (!error && userPrompts) {
              setPrompts(userPrompts as Prompt[]);
            }
          }
        } catch (e) {
          console.error('Error loading prompts:', e);
        }

        // Set default model
        if (loadedModels.length > 0 && !selectedModelId) {
          const defaultModelId = loadedModels[0].id;
          setSelectedModelId(defaultModelId);
          setModelConfig(getModelDefaults(loadedModels[0]));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Get model controls
  const { normalizedControls } = useModelControls(models, selectedModelId);

  // Handle model change
  const handleModelChange = (newModelId: string) => {
    setSelectedModelId(newModelId);
    const newModel = models.find(m => m.id === newModelId);
    if (newModel) {
      const defaults = getModelDefaults(newModel);
      setModelConfig(prev => ({
        ...defaults,
        tools: prev.tools || []
      }));
    }
  };

  // Handle prompt selection - apply full prompt data from already-loaded prompts
  const handlePromptSelect = (promptId: string) => {
    if (!promptId) {
      setSelectedPromptId('');
      return;
    }

    setSelectedPromptId(promptId);

    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    // Apply prompt messages
    if (prompt.messages && Array.isArray(prompt.messages)) {
      setMessages(prompt.messages);
    }

    // Apply prompt settings - completely replace current config with prompt settings
    if (prompt.settings) {
      const { model_id, stream, ...restSettings } = prompt.settings;

      // Set the model from prompt settings
      if (model_id) {
        const matchedModel = models.find(m => m.id === model_id);
        if (matchedModel) {
          setSelectedModelId(model_id);
          // Start with model defaults, then overlay prompt settings
          const defaults = getModelDefaults(matchedModel);
          setModelConfig({ ...defaults, ...restSettings });
        } else {
          // Model not found in loaded models - still apply settings, keep current model
          console.warn(`Model ${model_id} from prompt not found in available models`);
          setModelConfig(prev => ({ ...prev, ...restSettings }));
        }
      } else {
        // No model_id in settings - just apply the rest
        setModelConfig(prev => ({ ...prev, ...restSettings }));
      }

      // Sync stream toggle with prompt settings
      if (typeof stream === 'boolean') {
        setStreamEnabled(stream);
      }
    }
  };

  // Message handlers
  const addMessage = () => {
    const lastRole = messages.length > 0 ? messages[messages.length - 1].role : 'user';
    const nextRole = lastRole === 'user' ? 'assistant' : 'user';
    setMessages([...messages, { role: nextRole, content: '' }]);
  };

  const updateMessage = (index: number, field: 'role' | 'content', value: string) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], [field]: value };
    setMessages(updated);
  };

  const deleteMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
  };

  // Test execution
  const runTest = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStreamOutput('');
    setStreamText('');
    setStreamEvents([]);
    setErrorMessage('');
    setUsageStatsData(null);
    setDebugInfo({ chunkCount: 0, totalBytes: 0, eventCount: 0, startTime: Date.now(), endTime: null });

    try {
      const url = `${apiConfig.baseUrl}/api/chat/unified`;

      // Build request body - flatten settings into root level
      // Filter out null/undefined values before sending
      const cleanedConfig = removeNullSettings(modelConfig);
      const requestBody = {
        messages: messages,
        ai_model_id: selectedModelId,
        ...cleanedConfig,
        stream: streamEnabled,
        debug: debugMode,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          // Handle nested error objects
          if (typeof errorData.error === 'object' && errorData.error !== null) {
            errorMsg = errorData.error.user_visible_message || errorData.error.message || JSON.stringify(errorData.error);
          } else if (typeof errorData.message === 'object' && errorData.message !== null) {
            errorMsg = errorData.message.user_visible_message || errorData.message.message || JSON.stringify(errorData.message);
          } else {
            errorMsg = errorData.error || errorData.message || errorData.details || errorMsg;
          }
        } catch (e) {
          // If can't parse JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) errorMsg = errorText;
          } catch (e2) {
            // Use default error
          }
        }
        throw new Error(errorMsg);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let chunkCount = 0;
      let totalBytes = 0;
      let eventCount = 0;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          chunkCount++;
          totalBytes += value.length;

          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;

          // Process complete lines (JSONL format)
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                eventCount++;

                // Append to JSON output
                setStreamOutput(prev => prev + JSON.stringify(json, null, 2) + '\n\n');

                // Accumulate the event for StreamAwareChatMarkdown
                setStreamEvents(prev => [...prev, json as StreamEvent]);

                // Extract text chunks (keep for backward compatibility with debug view)
                if (json.event === 'chunk' && typeof json.data === 'string') {
                  setStreamText(prev => prev + json.data);
                }
                // Check for error events
                if (json.event === 'error') {
                  const errData = json.data;
                  if (typeof errData === 'object' && errData !== null) {
                    setErrorMessage(errData.user_visible_message || errData.message || JSON.stringify(errData));
                  } else {
                    setErrorMessage(errData || 'Unknown error from stream');
                  }
                }
                // Capture usage stats data
                if (json.event === 'data' && json.data?.status === 'complete') {
                  setUsageStatsData(json.data);
                }
              } catch (e) {
                setStreamOutput(prev => prev + line + '\n');
              }
            }
          }

          setDebugInfo(prev => ({
            ...prev,
            chunkCount,
            totalBytes,
            eventCount,
          }));
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          setStreamOutput(prev => prev + JSON.stringify(json, null, 2) + '\n\n');
          setStreamEvents(prev => [...prev, json as StreamEvent]);
          if (json.event === 'chunk' && typeof json.data === 'string') {
            setStreamText(prev => prev + json.data);
          }
          // Capture usage stats from remaining buffer
          if (json.event === 'data' && json.data?.status === 'complete') {
            setUsageStatsData(json.data);
          }
        } catch (e) {
          setStreamOutput(prev => prev + buffer + '\n');
        }
      }

      setDebugInfo(prev => ({ ...prev, endTime: Date.now() }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      setStreamOutput(prev => prev + `\n\n❌ Error: ${errorMsg}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Clear all
  const clearAll = () => {
    setStreamOutput('');
    setStreamText('');
    setStreamEvents([]);
    setErrorMessage('');
    setDebugInfo({ chunkCount: 0, totalBytes: 0, eventCount: 0, startTime: null, endTime: null });
  };


  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Fixed header section */}
      <div className="flex-shrink-0 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Chat API Test</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            {showSettings ? 'Hide' : 'Show'} Settings
          </Button>
        </div>

        {/* API Configuration */}
        <ApiTestConfigPanel config={apiConfig} />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 p-3">
        <div className="grid grid-cols-12 gap-3 h-full">
          {/* Left: Configuration Panel */}
          {showSettings && (
            <Card className="col-span-3 p-3 h-full overflow-y-auto space-y-3">
              <div className="space-y-2">
                {/* Prompt Selection */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold whitespace-nowrap flex-shrink-0">Load Prompt</Label>
                  <Select value={selectedPromptId} onValueChange={handlePromptSelect}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={prompts.length > 0 ? "Select a prompt..." : "No prompts available"} />
                    </SelectTrigger>
                    <SelectContent>
                      {prompts.length > 0 ? (
                        prompts.map(prompt => (
                          <SelectItem key={prompt.id} value={prompt.id} className="text-xs">
                            {prompt.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                          No prompts found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedPromptId && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handlePromptSelect('')}
                      className="h-7 text-xs px-2 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Model Selection */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold whitespace-nowrap flex-shrink-0">Model</Label>
                  <Select value={selectedModelId} onValueChange={handleModelChange}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id} className="text-xs">
                          {model.common_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stream & Debug Mode Toggles */}
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="stream-mode" 
                      checked={streamEnabled} 
                      onCheckedChange={(checked) => setStreamEnabled(checked as boolean)}
                    />
                    <Label htmlFor="stream-mode" className="text-xs font-medium cursor-pointer">
                      Stream Response
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="debug-mode" 
                      checked={debugMode} 
                      onCheckedChange={(checked) => setDebugMode(checked as boolean)}
                    />
                    <Label htmlFor="debug-mode" className="text-xs font-medium cursor-pointer">
                      Debug Mode
                    </Label>
                  </div>
                </div>

                {/* Model Settings */}
                <div className="space-y-1.5 pt-1">
                  <ModelSettings
                    modelId={selectedModelId}
                    models={models}
                    settings={modelConfig}
                    onSettingsChange={setModelConfig}
                    availableTools={availableTools}
                  />
                </div>

                {/* Messages Configuration */}
                <div className="space-y-1.5 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Messages</Label>
                    <Button size="sm" variant="outline" onClick={addMessage} className="h-6 text-xs px-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Message
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {messages.map((message, index) => (
                      <Card key={index} className="p-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Select
                            value={message.role}
                            onValueChange={(value) => updateMessage(index, 'role', value)}
                          >
                            <SelectTrigger className="h-7 text-xs flex-shrink-0 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system" className="text-xs">System</SelectItem>
                              <SelectItem value="user" className="text-xs">User</SelectItem>
                              <SelectItem value="assistant" className="text-xs">Assistant</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {index + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMessage(index)}
                            className="h-6 w-6 p-0 ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={message.content}
                          onChange={(e) => updateMessage(index, 'content', e.target.value)}
                          placeholder={`Enter ${message.role} message...`}
                          className="min-h-[60px] text-xs font-mono"
                        />
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="space-y-1.5 border-t pt-3">
                  <Label className="text-xs font-semibold">Configuration Summary</Label>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="text-foreground">{models.find(m => m.id === selectedModelId)?.common_name || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages:</span>
                      <span className="text-foreground">{messages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Streaming:</span>
                      <span className={streamEnabled ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                        {streamEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Debug Mode:</span>
                      <span className={debugMode ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                        {debugMode ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {typeof modelConfig.temperature === 'number' && (
                      <div className="flex justify-between">
                        <span>Temperature:</span>
                        <span className="text-foreground">{modelConfig.temperature.toFixed(2)}</span>
                      </div>
                    )}
                    {typeof modelConfig.max_output_tokens === 'number' && (
                      <div className="flex justify-between">
                        <span>Max Tokens:</span>
                        <span className="text-foreground">{modelConfig.max_output_tokens}</span>
                      </div>
                    )}
                    {modelConfig.tools && modelConfig.tools.length > 0 && (
                      <div className="flex justify-between">
                        <span>Tools:</span>
                        <span className="text-foreground">{modelConfig.tools.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Run Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={runTest}
                        disabled={isRunning || !selectedModelId || messages.length === 0}
                        className="w-full"
                        size="sm"
                      >
                        {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Play className="mr-2 h-4 w-4" />
                        {isRunning ? 'Running...' : 'Run Test'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Ctrl/Cmd + Enter
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* JSON Editor Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJsonEditor(true)}
                  className="w-full mt-2"
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Edit Config as JSON
                </Button>
              </div>
            </Card>
          )}

          {/* JSON Editor Modal */}
          <SettingsJsonEditor
            isOpen={showJsonEditor}
            onClose={() => setShowJsonEditor(false)}
            settings={modelConfig}
            onSave={setModelConfig}
          />

          {/* Usage Stats Modal */}
          <UsageStatsModal
            isOpen={showUsageStats}
            onClose={() => setShowUsageStats(false)}
            data={usageStatsData}
          />

          {/* Right: Results Panel */}
          <Card className={`${showSettings ? 'col-span-9' : 'col-span-12'} p-3 h-full overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Results</Label>
                {errorMessage && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Error
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Debug Info */}
                {(isRunning || debugInfo.chunkCount > 0) && (
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <span>Chunks: {debugInfo.chunkCount}</span>
                    <span>Bytes: {debugInfo.totalBytes.toLocaleString()}</span>
                    <span>Events: {debugInfo.eventCount}</span>
                    {debugInfo.startTime && (
                      <span>
                        Time: {debugInfo.endTime 
                          ? `${((debugInfo.endTime - debugInfo.startTime) / 1000).toFixed(2)}s`
                          : `${((Date.now() - debugInfo.startTime) / 1000).toFixed(2)}s`
                        }
                      </span>
                    )}
                  </div>
                )}
                {usageStatsData && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowUsageStats(true)} 
                    className="h-7 text-xs px-2"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Usage Stats
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={clearAll} className="h-7 text-xs px-2">
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <Tabs defaultValue="rendered" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="rendered" className="text-xs">Rendered</TabsTrigger>
                <TabsTrigger value="json" className="text-xs">JSON Stream</TabsTrigger>
                <TabsTrigger value="request" className="text-xs">Request Body</TabsTrigger>
              </TabsList>

              <TabsContent value="rendered" className="flex-1 overflow-y-auto mt-2 p-3 bg-textured rounded border">
                {errorMessage && (
                  <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <div className="font-semibold mb-1">❌ Error</div>
                    <div className="font-mono">{errorMessage}</div>
                  </div>
                )}
                {streamEvents.length > 0 ? (
                  <MarkdownStream
                    events={streamEvents}
                    isStreamActive={isRunning}
                    role="assistant"
                    className="text-sm"
                    onError={(error) => setErrorMessage(error)}
                    hideCopyButton={false}
                  />
                ) : !errorMessage ? (
                  <div className="text-xs text-muted-foreground">No response yet...</div>
                ) : null}
              </TabsContent>

              <TabsContent value="json" className="flex-1 overflow-y-auto mt-2 p-3 bg-muted rounded border">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {streamOutput || 'No JSON data yet...'}
                </pre>
              </TabsContent>

              <TabsContent value="request" className="flex-1 overflow-y-auto mt-2 p-3 bg-muted rounded border">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify({
                    messages: messages,
                    ai_model_id: selectedModelId,
                    ...modelConfig,
                    stream: streamEnabled,
                    debug: debugMode,
                  }, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

