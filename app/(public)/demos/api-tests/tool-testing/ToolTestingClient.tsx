'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useApiTestConfig, ApiTestConfigPanel } from '@/components/api-test-config';
import { ToolListSidebar } from './components/ToolListSidebar';
import { ToolConfigPanel } from './components/ToolConfigPanel';
import { buildDefaults } from './components/ArgumentForm';
import { ResultsPanel } from './components/ResultsPanel';
import { fetchToolsFromDatabase, executeToolTest, initTestSession } from './streaming-client';
import type {
  ToolDefinition,
  ToolStreamEvent,
  FinalPayload,
  StreamLine,
  ExecutionStatus,
} from './types';

export default function ToolTestingClient() {
  const apiConfig = useApiTestConfig({
    defaultServerType: 'local',
    requireToken: true,
  });

  // ─── Tool list state ────────────────────────────────────────────────────
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);

  // ─── Argument form state ────────────────────────────────────────────────
  const [argValues, setArgValues] = useState<Record<string, unknown>>({});

  // ─── Session state ──────────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // ─── Execution state ────────────────────────────────────────────────────
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [toolEvents, setToolEvents] = useState<ToolStreamEvent[]>([]);
  const [rawLines, setRawLines] = useState<StreamLine[]>([]);
  const [rawJsonLog, setRawJsonLog] = useState('');
  const [finalPayload, setFinalPayload] = useState<FinalPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────────
  const selectedTool = tools.find((t) => t.name === selectedToolName) ?? null;

  // ─── Load tools from Supabase (source of truth) ────────────────────────
  const loadTools = useCallback(async () => {
    setLoadingTools(true);
    try {
      const data = await fetchToolsFromDatabase();
      setTools(data);
      toast.success(`Loaded ${data.length} tools`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tools';
      toast.error(msg);
    } finally {
      setLoadingTools(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // ─── Init test session once API config is ready ─────────────────────────
  useEffect(() => {
    if (sessionInitialized || !apiConfig.hasToken || apiConfig.isCheckingLocalhost) return;

    const init = async () => {
      try {
        const session = await initTestSession(apiConfig.baseUrl, apiConfig.authToken);
        setConversationId(session.conversation_id);
        setSessionInitialized(true);
        console.log(`[ToolTest] Session initialized: conversation_id=${session.conversation_id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to init session';
        console.warn(`[ToolTest] Session init failed (non-blocking): ${msg}`);
        // Non-blocking — execute will auto-create if conversation_id is missing
      }
    };

    init();
  }, [apiConfig.hasToken, apiConfig.isCheckingLocalhost, apiConfig.baseUrl, apiConfig.authToken, sessionInitialized]);

  // ─── Tool selection ─────────────────────────────────────────────────────
  const handleSelectTool = (toolName: string) => {
    setSelectedToolName(toolName);
    const tool = tools.find((t) => t.name === toolName);
    if (tool) {
      setArgValues(buildDefaults(tool.parameters));
    }
    // Clear previous results
    clearResults();
  };

  // ─── Clear results ──────────────────────────────────────────────────────
  const clearResults = () => {
    setToolEvents([]);
    setRawLines([]);
    setRawJsonLog('');
    setFinalPayload(null);
    setErrorMessage(null);
    setExecutionStatus('idle');
  };

  // ─── Reset form ─────────────────────────────────────────────────────────
  const handleReset = () => {
    if (selectedTool) {
      setArgValues(buildDefaults(selectedTool.parameters));
    }
    clearResults();
  };

  // ─── Execute tool ───────────────────────────────────────────────────────
  const handleExecute = async () => {
    if (!selectedTool || !apiConfig.hasToken) return;

    // Clear previous results
    clearResults();
    setExecutionStatus('connecting');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strip empty string values from args (don't send empty optional fields)
    const cleanedArgs: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(argValues)) {
      if (val === '' || val === undefined) continue;
      cleanedArgs[key] = val;
    }

    const targetUrl = `${apiConfig.baseUrl}/api/tools/test/execute`;
    console.log(`[ToolTest] Executing "${selectedTool.name}" via ${targetUrl} (server: ${apiConfig.serverType})`);

    try {
      await executeToolTest(
        apiConfig.baseUrl,
        apiConfig.authToken,
        selectedTool.name,
        cleanedArgs,
        {
          onStatusUpdate: (data) => {
            setExecutionStatus('running');
          },
          onToolEvent: (event) => {
            setExecutionStatus('running');
            setToolEvents((prev) => [...prev, event]);

            if (event.event === 'tool_error') {
              setErrorMessage(event.message ?? 'Tool execution failed');
            }
          },
          onFinalResult: (payload) => {
            setFinalPayload(payload);
            if (payload.full_result?.success === false) {
              setErrorMessage(
                payload.full_result.error?.message ?? 'Tool returned error',
              );
              setExecutionStatus('error');
            } else {
              setExecutionStatus('complete');
            }
          },
          onError: (error) => {
            const msg =
              (error.user_visible_message as string) ??
              (error.message as string) ??
              'Stream error';
            setErrorMessage(msg);
            setExecutionStatus('error');
          },
          onEnd: () => {
            setExecutionStatus((prev) =>
              prev === 'running' || prev === 'connecting' ? 'complete' : prev,
            );
          },
          onRawLine: (line) => {
            setRawLines((prev) => [...prev, line]);
            setRawJsonLog((prev) => prev + JSON.stringify(line, null, 2) + '\n\n');
          },
        },
        controller.signal,
        conversationId ?? undefined,
      );
    } catch (err) {
      if (controller.signal.aborted) {
        setExecutionStatus('cancelled');
        toast.info('Execution cancelled');
      } else {
        const msg = err instanceof Error ? err.message : 'Execution failed';
        setErrorMessage(msg);
        setExecutionStatus('error');
      }
    }
  };

  // ─── Cancel execution ───────────────────────────────────────────────────
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // ─── Keyboard shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (
          selectedTool &&
          apiConfig.hasToken &&
          executionStatus !== 'running' &&
          executionStatus !== 'connecting'
        ) {
          handleExecute();
        }
      }
      if (e.key === 'Escape' && (executionStatus === 'running' || executionStatus === 'connecting')) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTool, apiConfig.hasToken, executionStatus, argValues]);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Header: API config */}
        <div className="flex-shrink-0 px-3 py-1">
          <ApiTestConfigPanel
            config={apiConfig}
            title={<h1 className="text-lg font-bold">Tool Testing Dashboard</h1>}
            actions={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadTools}
                    disabled={loadingTools}
                    className="h-6 text-xs px-2 gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingTools ? 'animate-spin' : ''}`} />
                    {loadingTools ? 'Loading...' : 'Reload Tools'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Reload active tools from database
                </TooltipContent>
              </Tooltip>
            }
          />
        </div>

        {/* Three-panel layout */}
        <div className="flex-1 min-h-0 px-3 py-1">
          <div className="grid grid-cols-12 gap-2 h-full">
            {/* Left: Tool list (col-span-2) */}
            <Card className="col-span-2 h-full overflow-hidden">
              <ToolListSidebar
                tools={tools}
                loading={loadingTools}
                selectedTool={selectedToolName}
                onSelectTool={handleSelectTool}
              />
            </Card>

            {/* Center: Config / Form (col-span-4) */}
            <Card className="col-span-4 h-full overflow-hidden">
              <ToolConfigPanel
                tool={selectedTool}
                argValues={argValues}
                onArgValuesChange={setArgValues}
                executionStatus={executionStatus}
                onExecute={handleExecute}
                onCancel={handleCancel}
                onReset={handleReset}
                serverInfo={{ type: apiConfig.serverType, baseUrl: apiConfig.baseUrl }}
              />
            </Card>

            {/* Right: Results (col-span-6) */}
            <Card className="col-span-6 h-full overflow-hidden">
              <ResultsPanel
                toolName={selectedToolName ?? ''}
                args={argValues}
                toolEvents={toolEvents}
                rawLines={rawLines}
                finalPayload={finalPayload}
                rawJsonLog={rawJsonLog}
                executionStatus={executionStatus}
                errorMessage={errorMessage}
                onClear={clearResults}
              />
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
