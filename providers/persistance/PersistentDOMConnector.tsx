"use client";
import React, { useEffect, useRef } from "react";

/**
 * Component that connects persistent components to their placeholders in the DOM
 * This ensures that components are rendered at their correct locations when visible
 */
export const PersistentDOMConnector: React.FC = () => {
  const observerRef = useRef<MutationObserver | null>(null);
  
  // Function to move persistent components to their placeholders
  const positionComponents = () => {
    // Find all component containers
    const containers = document.querySelectorAll('[data-component-id]');
    
    containers.forEach(container => {
      const id = container.getAttribute('data-component-id');
      if (!id) return;
      
      // Find placeholder for this component
      const placeholder = document.querySelector(`[data-placeholder-for="${id}"]`);
      if (!placeholder) return;
      
      // Check if component is visible
      const isVisible = (container as HTMLElement).style.display !== 'none';
      
      // Only move if visible and not already in the correct place
      if (isVisible && !placeholder.contains(container)) {
        // Clone any existing content to prevent loss
        const existingContent = Array.from(placeholder.childNodes);
        
        // Clear placeholder and append the component
        placeholder.innerHTML = '';
        placeholder.appendChild(container);
        
        // Log successful positioning
        console.log(`Positioned component ${id} in its placeholder`);
      }
    });
  };
  
  useEffect(() => {
    // Run initial positioning
    setTimeout(() => {
      positionComponents();
      console.log("Initial positioning complete");
    }, 100);
    
    // Set up observer to watch for DOM changes
    observerRef.current = new MutationObserver(() => {
      positionComponents();
    });
    
    // Observe the entire document body for changes
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-placeholder-for', 'data-component-id', 'class']
    });
    
    // Also position on visibility changes and DOM content loaded
    window.addEventListener('visibilitychange', positionComponents);
    document.addEventListener('DOMContentLoaded', positionComponents);
    
    // Position components after tab switches
    const handleTabChange = () => {
      setTimeout(positionComponents, 50);
    };
    
    // Look for tab triggers and add click handlers
    const tabTriggers = document.querySelectorAll('[role="tab"]');
    tabTriggers.forEach(trigger => {
      trigger.addEventListener('click', handleTabChange);
    });
    
    // Cleanup on unmount
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('visibilitychange', positionComponents);
      document.removeEventListener('DOMContentLoaded', positionComponents);
      
      tabTriggers.forEach(trigger => {
        trigger.removeEventListener('click', handleTabChange);
      });
    };
  }, []);
  
  return null;
};