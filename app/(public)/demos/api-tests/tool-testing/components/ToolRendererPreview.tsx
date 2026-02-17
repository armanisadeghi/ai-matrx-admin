'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, Eye } from 'lucide-react';
import type { ToolCallObject } from '@/lib/redux/socket-io/socket.types';
import {
  getInlineRenderer,
  getToolDisplayName,
  hasCustomRenderer,
} from '@/features/chat/components/response/tool-renderers/registry';
import { GenericRenderer } from '@/features/chat/components/response/tool-renderers/GenericRenderer';
import type { ToolStreamEvent, FinalPayload } from '../types';

/**
 * Bridge streaming tool test events into the ToolCallObject[] format
 * that our existing tool renderer system expects.
 */
function buildToolCallObjects(
  toolName: string,
  args: Record<string, unknown>,
  toolEvents: ToolStreamEvent[],
  finalPayload: FinalPayload | null,
): ToolCallObject[] {
  const objects: ToolCallObject[] = [];

  // 1. mcp_input — always first
  objects.push({
    id: toolEvents[0]?.call_id ?? 'test-call',
    type: 'mcp_input',
    mcp_input: {
      name: toolName,
      arguments: args,
    },
  });

  // 2. Map tool events to step_data / user_visible_message
  for (const event of toolEvents) {
    switch (event.event) {
      case 'tool_progress':
      case 'tool_step': {
        const msg = (event as { message?: string; user_message?: string; user_visible_message?: string }).user_message || (event as { message?: string; user_message?: string; user_visible_message?: string }).user_visible_message || event.message;
        if (msg) {
          objects.push({
            id: event.call_id,
            type: 'user_visible_message',
            user_message: msg,
            user_visible_message: msg,
          });
        }
        if (Object.keys(event.data).length > 0) {
          objects.push({
            id: event.call_id,
            type: 'step_data',
            step_data: {
              type: event.event,
              content: event.data,
            },
          });
        }
        break;
      }
      case 'tool_result_preview':
        if (event.data.preview) {
          objects.push({
            id: event.call_id,
            type: 'step_data',
            step_data: {
              type: 'result_preview',
              content: event.data,
            },
          });
        }
        break;
      case 'tool_started': {
        const startedMsg = (event as { message?: string; user_message?: string; user_visible_message?: string }).user_message || (event as { message?: string; user_message?: string; user_visible_message?: string }).user_visible_message || event.message;
        if (startedMsg) {
          objects.push({
            id: event.call_id,
            type: 'user_visible_message',
            user_message: startedMsg,
            user_visible_message: startedMsg,
          });
        }
        break;
      }
      case 'tool_error':
        objects.push({
          id: event.call_id,
          type: 'mcp_error',
          mcp_error: event.message ?? 'Tool execution failed',
        });
        break;
    }
  }

  // 3. mcp_output — from final payload
  if (finalPayload?.full_result) {
    objects.push({
      id: toolEvents[0]?.call_id ?? 'test-call',
      type: 'mcp_output',
      mcp_output: {
        result: finalPayload.full_result.output,
      },
    });
  }

  return objects;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ToolRendererPreviewProps {
  toolName: string;
  args: Record<string, unknown>;
  toolEvents: ToolStreamEvent[];
  finalPayload: FinalPayload | null;
  isRunning: boolean;
}

export function ToolRendererPreview({
  toolName,
  args,
  toolEvents,
  finalPayload,
  isRunning,
}: ToolRendererPreviewProps) {
  const hasRenderer = hasCustomRenderer(toolName);
  const displayName = getToolDisplayName(toolName);
  const InlineRenderer = useMemo(() => getInlineRenderer(toolName), [toolName]);

  const toolCallObjects = useMemo(
    () => buildToolCallObjects(toolName, args, toolEvents, finalPayload),
    [toolName, args, toolEvents, finalPayload],
  );

  if (toolCallObjects.length <= 1 && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <Eye className="h-6 w-6 opacity-40" />
        <p className="text-xs">Execute a tool to see rendered results here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Renderer info */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold">Rendered via:</span>
        {hasRenderer ? (
          <Badge variant="default" className="text-[10px]">
            {displayName} (Custom)
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            GenericRenderer (Fallback)
          </Badge>
        )}
      </div>

      {/* The renderer */}
      <div className="rounded-lg border border-border bg-card p-3">
        <InlineRenderer
          toolUpdates={toolCallObjects}
          currentIndex={toolCallObjects.length - 1}
          toolGroupId="test-preview"
        />
      </div>

      {/* Data bridge info */}
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>
          <Info className="h-3 w-3 inline mr-1" />
          {toolCallObjects.length} ToolCallObject(s) generated from{' '}
          {toolEvents.length} stream events
        </p>
        {!hasRenderer && (
          <p>
            No custom renderer registered for &quot;{toolName}&quot;. Create one
            using the tool renderer skill to get a richer display.
          </p>
        )}
      </div>
    </div>
  );
}
