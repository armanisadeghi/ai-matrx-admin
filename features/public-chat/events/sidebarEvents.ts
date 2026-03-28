// features/public-chat/events/sidebarEvents.ts
//
// Lightweight pub/sub bus for cross-component sidebar communication.
// Previously lived inside DEPRECATED-AgentsContext — extracted to a standalone
// module so it can be used without the deprecated context.

interface SidebarEventMap {
  "conversation-created": { id: string; title: string };
  "conversation-updated": { id: string };
}

type SidebarEventType = keyof SidebarEventMap;

export class SidebarEvents {
  private handlers = new Map<string, Set<Function>>();

  on<T extends SidebarEventType>(
    event: T,
    handler: (data: SidebarEventMap[T]) => void,
  ) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit<T extends SidebarEventType>(event: T, data: SidebarEventMap[T]) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}

// Singleton instance — shared across the chat layout
export const sidebarEvents = new SidebarEvents();
