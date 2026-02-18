/**
 * Stream Event Classifier
 *
 * Case-based pattern for detecting, categorizing, and sub-typing stream events.
 * Designed for easy extension — add new event types or sub-classifiers by adding a case.
 *
 * Updated for V2 protocol: no more tool_update or info events.
 * New events: completion, heartbeat, tool_event.
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
  /** Optional secondary classification (e.g. tool_event sub-type) */
  subType: string | null;
  /** For tool_event events, the tool call id to group by */
  groupId: string | null;
}

export type EventCategory =
  | 'status_update'
  | 'chunk'
  | 'tool_event'
  | 'completion'
  | 'data'
  | 'error'
  | 'end'
  | 'heartbeat'
  | 'broker'
  | 'unknown';

// ─── Sub-type classifiers ────────────────────────────────────────────────────

/** Determine the sub-type of a `data` event */
function classifyDataEvent(data: Record<string, unknown>): string {
  if (typeof data.status === 'string') return `data_${data.status}`;
  return 'data_generic';
}

/** Determine the sub-type of a `tool_event` event */
function classifyToolEvent(data: Record<string, unknown>): string {
  const event = data.event as string | undefined;
  switch (event) {
    case 'tool_started':
      return 'tool_started';
    case 'tool_progress':
      return 'tool_progress';
    case 'tool_step':
      return 'tool_step';
    case 'tool_result_preview':
      return 'tool_result_preview';
    case 'tool_completed':
      return 'tool_completed';
    case 'tool_error':
      return 'tool_error';
    default:
      return event ? `tool_${event}` : 'tool_unknown';
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
      // New chunk payload has { text: string }
      subType = typeof data.text === 'string' && data.text.includes('<reasoning>')
        ? 'chunk_reasoning'
        : 'chunk_content';
      break;

    case 'status_update':
      category = 'status_update';
      subType = classifyStatusUpdate(data);
      break;

    case 'tool_event':
      category = 'tool_event';
      subType = classifyToolEvent(data);
      groupId = (data.call_id as string) ?? null;
      break;

    case 'completion':
      category = 'completion';
      subType = 'completion';
      break;

    case 'data':
      category = 'data';
      subType = classifyDataEvent(data);
      break;

    case 'error':
      category = 'error';
      subType = ((data.error_type ?? data.error ?? data.type) as string) ?? 'error';
      break;

    case 'end':
      category = 'end';
      subType = 'end';
      break;

    case 'heartbeat':
      category = 'heartbeat';
      subType = 'heartbeat';
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

/** Group tool_event events by their groupId (tool call id) */
export function groupToolEventsById(events: TimestampedEvent[]): Map<string, TimestampedEvent[]> {
  const map = new Map<string, TimestampedEvent[]>();
  for (const evt of events) {
    const key = evt.groupId ?? '__ungrouped__';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }
  return map;
}

/** @deprecated Use groupToolEventsById */
export const groupToolUpdatesById = groupToolEventsById;

// ─── Display helpers ─────────────────────────────────────────────────────────

/** Human-friendly label for a category */
export function categoryLabel(cat: EventCategory): string {
  switch (cat) {
    case 'status_update': return 'Status Updates';
    case 'chunk': return 'Text Chunks';
    case 'tool_event': return 'Tool Events';
    case 'completion': return 'Completion';
    case 'data': return 'Data';
    case 'error': return 'Errors';
    case 'end': return 'End';
    case 'heartbeat': return 'Heartbeat';
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
    // Tool events
    tool_started: 'Tool Started',
    tool_progress: 'Progress',
    tool_step: 'Step',
    tool_result_preview: 'Result Preview',
    tool_completed: 'Tool Completed',
    tool_error: 'Tool Error',
    tool_unknown: 'Unknown Tool',
    // Data
    data_generic: 'Generic Data',
    // Completion
    completion: 'Completion',
    // Others
    error: 'Error',
    end: 'Stream End',
    heartbeat: 'Heartbeat',
    broker: 'Broker',
  };
  return labels[subType] ?? subType;
}

/** Badge color class for a category */
export function categoryColor(cat: EventCategory): string {
  switch (cat) {
    case 'status_update': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25';
    case 'chunk': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    case 'tool_event': return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25';
    case 'completion': return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25';
    case 'data': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25';
    case 'error': return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25';
    case 'end': return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/25';
    case 'heartbeat': return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25';
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
