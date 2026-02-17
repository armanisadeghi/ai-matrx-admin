'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Eye,
  FileText,
  ShieldCheck,
  DollarSign,
  FileJson,
  Copy,
  Check,
  X,
  BarChart3,
  Timer,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { StreamEventTimeline } from './StreamEventTimeline';
import { SchemaValidator } from './SchemaValidator';
import { CostEstimateTable } from './CostEstimateTable';
import { ToolRendererPreview } from './ToolRendererPreview';
import type {
  ToolStreamEvent,
  FinalPayload,
  StreamLine,
  ExecutionStatus,
} from '../types';

// ─── Copy button ────────────────────────────────────────────────────────────

function CopyButton({ content, label = 'Copy' }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs px-2 gap-1"
      onClick={handleCopy}
      disabled={!content}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface ResultsPanelProps {
  toolName: string;
  args: Record<string, unknown>;
  toolEvents: ToolStreamEvent[];
  rawLines: StreamLine[];
  finalPayload: FinalPayload | null;
  rawJsonLog: string;
  executionStatus: ExecutionStatus;
  errorMessage: string | null;
  onClear: () => void;
}

export function ResultsPanel({
  toolName,
  args,
  toolEvents,
  rawLines,
  finalPayload,
  rawJsonLog,
  executionStatus,
  errorMessage,
  onClear,
}: ResultsPanelProps) {
  const isRunning = executionStatus === 'running' || executionStatus === 'connecting';
  const isComplete = executionStatus === 'complete';
  const isError = executionStatus === 'error';
  const duration = finalPayload?.full_result?.duration_ms;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold flex-shrink-0">Results</span>
          {isRunning && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Running
            </Badge>
          )}
          {isComplete && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1 bg-success text-success-foreground">
              <Check className="h-2.5 w-2.5" />
              Complete
            </Badge>
          )}
          {isError && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Error
            </Badge>
          )}
          {duration !== undefined && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Timer className="h-2.5 w-2.5" />
              {(duration / 1000).toFixed(2)}s
            </span>
          )}
          {finalPayload?.call_id && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]" title={finalPayload.call_id}>
              {finalPayload.call_id}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {finalPayload?.cost_estimate && (
            <span className="text-[10px] text-muted-foreground font-mono">
              ~{finalPayload.cost_estimate.estimated_tokens.toLocaleString()} tokens
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-6 text-xs px-1.5"
            disabled={isRunning}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="flex-shrink-0 mx-3 mt-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          <span className="font-semibold">Error: </span>
          <span className="font-mono">{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="stream" className="flex-1 flex flex-col overflow-hidden min-h-0 px-3 pt-2">
        <TabsList className="grid w-full grid-cols-6 h-8 flex-shrink-0">
          <TabsTrigger value="stream" className="text-[10px] gap-1">
            <Activity className="h-3 w-3" />
            Events
          </TabsTrigger>
          <TabsTrigger value="rendered" className="text-[10px] gap-1">
            <Eye className="h-3 w-3" />
            Rendered
          </TabsTrigger>
          <TabsTrigger value="model-facing" className="text-[10px] gap-1">
            <FileText className="h-3 w-3" />
            Model
          </TabsTrigger>
          <TabsTrigger value="schema" className="text-[10px] gap-1">
            <ShieldCheck className="h-3 w-3" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="cost" className="text-[10px] gap-1">
            <DollarSign className="h-3 w-3" />
            Cost
          </TabsTrigger>
          <TabsTrigger value="json" className="text-[10px] gap-1">
            <FileJson className="h-3 w-3" />
            JSON
          </TabsTrigger>
        </TabsList>

        {/* Stream Events */}
        <TabsContent value="stream" className="flex-1 overflow-hidden mt-2 rounded border bg-card">
          <StreamEventTimeline
            toolEvents={toolEvents}
            rawLines={rawLines}
            isRunning={isRunning}
          />
        </TabsContent>

        {/* Rendered Result (via tool renderer system) */}
        <TabsContent value="rendered" className="flex-1 overflow-y-auto mt-2 rounded border bg-card">
          <ToolRendererPreview
            toolName={toolName}
            args={args}
            toolEvents={toolEvents}
            finalPayload={finalPayload}
            isRunning={isRunning}
          />
        </TabsContent>

        {/* Model-Facing Result */}
        <TabsContent value="model-facing" className="flex-1 flex flex-col overflow-hidden mt-2 rounded border bg-muted/30">
          <div className="flex justify-between items-center px-3 py-1.5 border-b flex-shrink-0">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Model-Facing Result
            </span>
            <CopyButton
              content={finalPayload?.model_facing_result?.content ?? ''}
              label="Copy"
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {finalPayload?.model_facing_result ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={finalPayload.model_facing_result.is_error ? 'destructive' : 'outline'}
                    className="text-[10px]"
                  >
                    {finalPayload.model_facing_result.is_error ? 'Error' : 'Success'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    call_id: {finalPayload.model_facing_result.call_id}
                  </span>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-3 border border-border">
                  {finalPayload.model_facing_result.content}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                No model-facing result yet. Execute a tool to see results.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Schema Validation */}
        <TabsContent value="schema" className="flex-1 overflow-y-auto mt-2 rounded border bg-card">
          <SchemaValidator
            output={finalPayload?.full_result?.output ?? null}
            schema={finalPayload?.output_schema ?? null}
            success={finalPayload?.full_result?.success ?? false}
          />
        </TabsContent>

        {/* Cost Estimate */}
        <TabsContent value="cost" className="flex-1 overflow-y-auto mt-2 rounded border bg-card">
          <CostEstimateTable costEstimate={finalPayload?.cost_estimate ?? null} />
        </TabsContent>

        {/* JSON Stream */}
        <TabsContent value="json" className="flex-1 flex flex-col overflow-hidden mt-2 rounded border bg-muted/30">
          <div className="flex justify-between items-center px-3 py-1.5 border-b flex-shrink-0">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Raw NDJSON Stream
            </span>
            <CopyButton content={rawJsonLog} label="Copy JSON" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            <pre className="text-[10px] font-mono whitespace-pre-wrap text-foreground/70">
              {rawJsonLog || 'No JSON data yet...'}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
