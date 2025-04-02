import { useEffect, useRef, RefObject } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

/**
 * Hook that handles click outside of the passed ref
 * @param handler Function to call on outside click
 * @param active Whether the hook is active (default: true)
 * @returns React ref to attach to the element
 */
function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  handler: Handler, 
  active: boolean = true
): RefObject<T> {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // If the ref isn't assigned to an element or if the clicked element is inside the ref, do nothing
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      
      handler(event);
    };
    
    // Add both mouse and touch listeners for better mobile support
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      // Clean up listeners on unmount
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler, active]); // Re-run effect if handler or active state changes
  
  return ref;
}

export default useOnClickOutside;