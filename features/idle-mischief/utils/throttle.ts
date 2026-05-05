// features/idle-mischief/utils/throttle.ts
//
// Tiny leading-edge throttle. Calls fn at most once every wait ms.

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  }) as T;
}
