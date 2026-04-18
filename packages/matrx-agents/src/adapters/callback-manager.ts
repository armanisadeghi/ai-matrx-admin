/**
 * CallbackManagerLike — id-based one-shot trigger.
 *
 * The host app's callback manager stores function references keyed by id
 * and fires them exactly once. The package only needs the trigger-by-id
 * surface; registration is an app-level concern (the app registers before
 * dispatching, the package fires at the right lifecycle point).
 *
 * The simplest consumer implementation is a `Map<string, (data) => void>`
 * with a `trigger(id, data)` method that looks up, invokes, and deletes.
 */

export interface CallbackManagerLike {
  /**
   * Invoke the callback registered under `id` with `data` and remove the
   * entry. No-op if the id is not registered. The package never retains
   * the callback reference; the manager owns the lifecycle.
   */
  trigger<T>(id: string, data: T): void;
}
