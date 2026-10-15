// TEST/DEV ONLY. Gives real-test runners a way to read how much client state a page has piled up and to
// start fresh without losing the sign-in. Never user-facing: the installer is only called when
// NODE_ENV !== "production" AND the page is on a localhost host (see providers/StoreProvider.tsx), and
// nothing in the app calls the reset on its own.
//
// From the browser's javascript tool:
//   __matrxTestMemory.heapMb()          -> JS heap in MB (performance.memory.usedJSHeapSize)
//   __matrxTestMemory.sizes(15)         -> the biggest Redux slices (approx bytes, node counts)
//   __matrxTestMemory.reset()           -> reload the page (session cookie survives, so still signed in)
//   __matrxTestMemory.reset({ clear: ["sliceName"] }) -> also empty those top-level slices first, then reload

type AnyStore = { getState: () => unknown };

interface SliceSize {
  slice: string;
  approxKb: number;
  nodes: number;
  biggestChildren: Array<{ key: string; approxKb: number; nodes: number }>;
}

const NODE_CAP = 3_000_000;

function measure(root: unknown): { bytes: number; nodes: number } {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [root];
  let bytes = 0;
  let nodes = 0;
  while (stack.length && nodes < NODE_CAP) {
    const v = stack.pop();
    if (typeof v === "string") bytes += v.length * 2;
    else if (typeof v === "number") bytes += 8;
    else if (v && typeof v === "object") {
      if (seen.has(v as object)) continue;
      seen.add(v as object);
      nodes++;
      bytes += 32;
      if (v instanceof Map) {
        for (const [k, x] of v) {
          stack.push(k);
          stack.push(x);
        }
      } else if (v instanceof Set) {
        for (const x of v) stack.push(x);
      } else {
        for (const k of Object.keys(v as object)) {
          bytes += k.length * 2;
          stack.push((v as Record<string, unknown>)[k]);
        }
      }
    }
  }
  return { bytes, nodes };
}

function heapMb(): number | null {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round((m.usedJSHeapSize / 1048576) * 10) / 10 : null;
}

export function installTestMemoryGuard(store: AnyStore): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".localhost")) return;

  const sizes = (top = 15): SliceSize[] => {
    const state = store.getState() as Record<string, unknown>;
    return Object.keys(state)
      .map((slice) => {
        const total = measure(state[slice]);
        const kids =
          state[slice] && typeof state[slice] === "object"
            ? Object.keys(state[slice] as object)
                .map((key) => {
                  const m = measure((state[slice] as Record<string, unknown>)[key]);
                  return { key, approxKb: Math.round(m.bytes / 1024), nodes: m.nodes };
                })
                .sort((a, b) => b.approxKb - a.approxKb)
                .slice(0, 3)
            : [];
        return {
          slice,
          approxKb: Math.round(total.bytes / 1024),
          nodes: total.nodes,
          biggestChildren: kids,
        };
      })
      .sort((a, b) => b.approxKb - a.approxKb)
      .slice(0, top);
  };

  const reset = (opts: { clear?: string[]; reload?: boolean } = {}) => {
    if (opts.clear?.length) {
      (store as unknown as { dispatch: (a: unknown) => void }).dispatch({
        type: "@@matrxTestMemory/clear",
        payload: opts.clear,
      });
    }
    if (opts.reload !== false) window.location.reload();
  };

  (window as unknown as Record<string, unknown>).__matrxTestMemory = { heapMb, sizes, reset };
}
