"use client";

import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

/**
 * A hook to render a React component in a non-React DOM node
 * This allows us to maintain React state while rendering in different DOM locations
 */
export function useDOMPortal(id: string, Component: React.ReactNode) {
  const componentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the mount point in the DOM
    const mountPoint = document.getElementById(`mount-point-${id}`);
    if (!mountPoint) return;

    // Remember the DOM element for cleanup
    componentRef.current = mountPoint;
    
    // Create a portal to render the component at the mount point
    ReactDOM.render(Component, mountPoint);

    // Clean up when component unmounts
    return () => {
      if (componentRef.current) {
        ReactDOM.unmountComponentAtNode(componentRef.current);
      }
    };
  }, [id, Component]);

  return null;
}

/**
 * Component to render field components at specific DOM locations
 */
export const FieldPortal: React.FC<{
  brokerId: string;
  children: React.ReactNode;
}> = ({ brokerId, children }) => {
  useDOMPortal(brokerId, children);
  return null;
};