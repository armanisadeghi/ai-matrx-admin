/**
 * Stream Event Classifier
 *
 * Case-based pattern for detecting, categorizing, and sub-typing stream events.
 * Designed for easy extension — add new event types or sub-classifiers by adding a case.
 */

// ─── Classified Event Envelope ───────────────────────────────────────────────

export interface TimestampedEvent {
  /** Original parsed JSON event */
  raw: Record<string, unknown>;
  /** When this event was received (ms since epoch) */
  receivedAt: number;
  /** Offset in ms from stream start */
  offsetMs: number;
  /** Primary category derived from `event` field */
  category: EventCategory;
  /** Optional secondary classification (e.g. tool_update sub-type) */
  subType: string | null;
  /** For tool_update events, the tool call id to group by */
  groupId: string | null;
}

export type EventCategory =
  | 'status_update'
  | 'chunk'
  | 'tool_update'
  | 'data'
  | 'error'
  | 'end'
  | 'info'
  | 'broker'
  | 'unknown';

// ─── Sub-type classifiers ────────────────────────────────────────────────────

/** Determine the sub-type of a `data` event */
function classifyDataEvent(data: Record<string, unknown>): string {
  if (data.status === 'complete') return 'usage_complete';
  if (typeof data.status === 'string') return `data_${data.status}`;
  return 'data_generic';
}

/** Determine the sub-type of a `tool_update` event */
function classifyToolUpdate(data: Record<string, unknown>): string {
  const type = data.type as string | undefined;
  switch (type) {
    case 'mcp_input':
      return 'tool_input';
    case 'mcp_output':
      return 'tool_output';
    case 'mcp_error':
      return 'tool_error';
    case 'step_data': {
      const stepData = data.step_data as Record<string, unknown> | null;
      if (stepData?.type === 'web_result_summary') return 'tool_web_summary';
      if (stepData?.status === 'summarizing') return 'tool_summarizing';
      return 'tool_step_data';
    }
    case 'user_visible_message':
      return 'tool_progress';
    default:
      return type ? `tool_${type}` : 'tool_unknown';
  }
}

/** Determine the sub-type of a `status_update` event */
function classifyStatusUpdate(data: Record<string, unknown>): string {
  const status = data.status as string | undefined;
  switch (status) {
    case 'connected':
      return 'status_connected';
    case 'processing':
      return data.metadata ? 'status_iteration' : 'status_processing';
    case 'complete':
      return 'status_complete';
    case 'error':
      return 'status_error';
    default:
      return status ? `status_${status}` : 'status_generic';
  }
}

// ─── Main classifier ─────────────────────────────────────────────────────────

/**
 * Classify a single raw stream event into a `TimestampedEvent`.
 *
 * @param raw       The parsed JSON object from the NDJSON stream
 * @param now       `Date.now()` when the event was received
 * @param streamStart  `Date.now()` from when the stream was initiated
 */
export function classifyEvent(
  raw: Record<string, unknown>,
  now: number,
  streamStart: number,
): TimestampedEvent {
  const eventName = (raw.event as string) ?? 'unknown';
  const data = (raw.data ?? {}) as Record<string, unknown>;

  let category: EventCategory;
  let subType: string | null = null;
  let groupId: string | null = null;

  switch (eventName) {
    case 'chunk':
      category = 'chunk';
      subType = typeof raw.data === 'string' && raw.data.includes('<reasoning>')
        ? 'chunk_reasoning'
        : 'chunk_content';
      break;

    case 'status_update':
      category = 'status_update';
      subType = classifyStatusUpdate(data);
      break;

    case 'tool_update':
      category = 'tool_update';
      subType = classifyToolUpdate(data);
      groupId = (data.id as string) ?? null;
      break;

    case 'data':
      category = 'data';
      subType = classifyDataEvent(data);
      break;

    case 'error':
      category = 'error';
      subType = 'error';
      break;

    case 'end':
      category = 'end';
      subType = 'end';
      break;

    case 'info':
      category = 'info';
      subType = 'info';
      break;

    case 'broker':
      category = 'broker';
      subType = 'broker';
      break;

    default:
      category = 'unknown';
      subType = eventName;
      break;
  }

  return {
    raw,
    receivedAt: now,
    offsetMs: now - streamStart,
    category,
    subType,
    groupId,
  };
}

// ─── Grouping helpers ────────────────────────────────────────────────────────

/** Group events by their primary category */
export function groupByCategory(events: TimestampedEvent[]): Record<EventCategory, TimestampedEvent[]> {
  const groups: Record<string, TimestampedEvent[]> = {};
  for (const evt of events) {
    if (!groups[evt.category]) groups[evt.category] = [];
    groups[evt.category].push(evt);
  }
  return groups as Record<EventCategory, TimestampedEvent[]>;
}

/** Group tool_update events by their groupId (tool call id) */
export function groupToolUpdatesById(events: TimestampedEvent[]): Map<string, TimestampedEvent[]> {
  const map = new Map<string, TimestampedEvent[]>();
  for (const evt of events) {
    const key = evt.groupId ?? '__ungrouped__';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }
  return map;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/** Human-friendly label for a category */
export function categoryLabel(cat: EventCategory): string {
  switch (cat) {
    case 'status_update': return 'Status Updates';
    case 'chunk': return 'Text Chunks';
    case 'tool_update': return 'Tool Updates';
    case 'data': return 'Data / Usage';
    case 'error': return 'Errors';
    case 'end': return 'End';
    case 'info': return 'Info';
    case 'broker': return 'Broker';
    case 'unknown': return 'Unknown';
  }
}

/** Human-friendly label for a sub-type */
export function subTypeLabel(subType: string): string {
  const labels: Record<string, string> = {
    // Status
    status_connected: 'Connected',
    status_processing: 'Processing',
    status_iteration: 'Iteration Update',
    status_complete: 'Complete',
    status_error: 'Error',
    status_generic: 'Generic',
    // Chunks
    chunk_reasoning: 'Reasoning',
    chunk_content: 'Content',
    // Tool updates
    tool_input: 'Tool Input',
    tool_output: 'Tool Output',
    tool_error: 'Tool Error',
    tool_progress: 'Progress Message',
    tool_web_summary: 'Web Result Summary',
    tool_summarizing: 'Summarizing',
    tool_step_data: 'Step Data',
    tool_unknown: 'Unknown Tool',
    // Data
    usage_complete: 'Usage / Complete',
    data_generic: 'Generic Data',
    // Others
    error: 'Error',
    end: 'Stream End',
    info: 'Info',
    broker: 'Broker',
  };
  return labels[subType] ?? subType;
}

/** Badge color class for a category */
export function categoryColor(cat: EventCategory): string {
  switch (cat) {
    case 'status_update': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25';
    case 'chunk': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    case 'tool_update': return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25';
    case 'data': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25';
    case 'error': return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25';
    case 'end': return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/25';
    case 'info': return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/25';
    case 'broker': return 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/25';
    case 'unknown': return 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25';
  }
}

/** Format milliseconds into a human-readable duration */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}
