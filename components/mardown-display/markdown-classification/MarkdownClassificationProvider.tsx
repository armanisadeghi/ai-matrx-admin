"use client";

import { useEffect, useState, ReactNode } from 'react';
import { initializeCustomProcessors } from './json-config-system/register-custom-processor';

interface MarkdownClassificationProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes all custom processors
 * Wrap your application or markdown components with this to ensure
 * all custom processors are registered.
 */
export default function MarkdownClassificationProvider({ children }: MarkdownClassificationProviderProps) {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!initialized) {
      // Initialize custom processors
      initializeCustomProcessors();
      setInitialized(true);
    }
  }, [initialized]);
  
  return <>{children}</>;
} 