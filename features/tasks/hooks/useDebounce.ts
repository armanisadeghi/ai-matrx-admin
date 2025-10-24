// Debounce hook for performance optimization
import { useEffect, useState } from 'react';

/**
 * Debounce a value - delays updating until user stops typing
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default 1000ms)
 */
export function useDebounce<T>(value: T, delay: number = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

