'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import {
  selectIsDebugMode,
  selectPromptDebugIndicator,
  selectResourceDebugIndicator,
  hidePromptDebugIndicator,
  hideResourceDebugIndicator,
} from '@/lib/redux/slices/adminDebugSlice';
import { DebugIndicator } from './DebugIndicator';
import { ResourceDebugIndicator } from './ResourceDebugIndicator';

/**
 * Centralized manager for all debug indicators
 * Place this at the app layout level so indicators float above everything
 */
export function DebugIndicatorManager() {
  const dispatch = useAppDispatch();
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const promptDebug = useAppSelector(selectPromptDebugIndicator);
  const resourceDebug = useAppSelector(selectResourceDebugIndicator);

  // Only render if debug mode is enabled
  if (!isDebugMode) return null;

  return (
    <>
      {/* Prompt Debug Indicator */}
      {promptDebug?.isOpen && promptDebug.data && (
        <DebugIndicator
          debugData={promptDebug.data}
          onClose={() => dispatch(hidePromptDebugIndicator())}
        />
      )}

      {/* Resource Debug Indicator */}
      {resourceDebug?.isOpen && resourceDebug.resources && (
        <ResourceDebugIndicator
          resources={resourceDebug.resources}
          chatInput={resourceDebug.chatInput}
          variableDefaults={resourceDebug.variableDefaults}
          onClose={() => dispatch(hideResourceDebugIndicator())}
        />
      )}
    </>
  );
}

