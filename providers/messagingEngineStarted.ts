/**
 * providers/messagingEngineStarted.ts — "the inbox has been asked for", as a REACTIVE fact.
 *
 * `engine.isStarted()` is a plain read: nothing re-renders a component when `start()` runs, so a
 * gate written as `host.engine.isStarted() || …` only opened on the next unrelated store emission.
 * This subscribes to the start itself (wrapping `start` once per engine) so a reader re-renders the
 * moment the inbox is first opened, and the default-kind knob is read at that first list open.
 */

interface StartableEngine {
  start(): Promise<void>;
  isStarted(): boolean;
}

const listeners = new WeakMap<object, Set<() => void>>();

function watch(engine: StartableEngine): Set<() => void> {
  const existing = listeners.get(engine);
  if (existing) return existing;
  const set = new Set<() => void>();
  listeners.set(engine, set);
  const original = engine.start.bind(engine);
  try {
    engine.start = () => {
      const wasStarted = engine.isStarted();
      // `start()` flips its started flag synchronously, before its first await.
      const result = original();
      if (!wasStarted && engine.isStarted()) for (const listener of [...set]) listener();
      return result;
    };
  } catch {
    // A sealed engine cannot be wrapped: readers still re-check on every store emission.
  }
  return set;
}

/** `useSyncExternalStore` subscribe for the engine's start. */
export function subscribeEngineStart(engine: StartableEngine | null, listener: () => void): () => void {
  if (engine === null) return () => undefined;
  const set = watch(engine);
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}
