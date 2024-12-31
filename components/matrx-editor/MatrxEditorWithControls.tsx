// components/MatrxEditorWithControls.tsx
"use client";

import React, { useCallback, useRef, useState } from 'react';
import { MatrxEditor, MatrxEditorRef } from './MatrxEditor';
import { BrokerActionButtons } from './BrokerActionButtons';
import type { DocumentState } from './types';
import { useMatrxEditor } from './MatrxEditorContext';

interface MatrxEditorWithControlsProps {
  editorId: string;
  onStateChange?: (state: DocumentState) => void;
  showDebugControls?: boolean;
}

export const MatrxEditorWithControls: React.FC<MatrxEditorWithControlsProps> = ({
  editorId,
  onStateChange,
  showDebugControls = false
}) => {
  const editorRef = useRef<MatrxEditorRef>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const { createNewBroker, convertSelectionToBroker } = useMatrxEditor();

  const handleBrokerCreate = () => {
    const broker = createNewBroker();
    editorRef.current?.insertBroker(broker);
  };

  const handleBrokerConvert = () => {
    if (selectedText) {
      const broker = convertSelectionToBroker(selectedText);
      editorRef.current?.convertToBroker(broker);
    }
  };

  const handleSelectionChange = useCallback((selection: string | null) => {
    setSelectedText(selection);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <BrokerActionButtons
        onBrokerCreate={handleBrokerCreate}
        onBrokerConvert={handleBrokerConvert}
        getSelectedText={() => selectedText}
      />
      <MatrxEditor
        ref={editorRef}
        editorId={editorId}
        onStateChange={onStateChange}
        showDebugControls={showDebugControls}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
};