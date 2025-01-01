// components/MatrxEditorWithControls.tsx
"use client";

import React, { useCallback, useRef, useState } from "react";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';
import { MatrxEditor, MatrxEditorRef } from "./MatrxEditor";
import { BrokerActionButtons } from "./broker/BrokerActionButtons";
import type { DocumentState } from "./types";

interface MatrxEditorWithControlsProps {
  editorId: string;
  onStateChange?: (state: DocumentState) => void;
  showDebugControls?: boolean;
}

export const MatrxEditorWithControls: React.FC<
  MatrxEditorWithControlsProps
> = ({ editorId, onStateChange, showDebugControls = false }) => {
  const editorRef = useRef<MatrxEditorRef>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const { createBroker, convertSelectionToBroker } = useBrokers();

  const handleBrokerCreate = () => {
    const broker = createBroker();
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
    <div className="flex flex-col h-full gap-4">
      <div className="flex-none">
        {" "}
        <BrokerActionButtons
          onBrokerCreate={handleBrokerCreate}
          onBrokerConvert={handleBrokerConvert}
          getSelectedText={() => selectedText}
        />
      </div>
      <div className="flex-1 min-h-0">
        {" "}
        <MatrxEditor
          ref={editorRef}
          editorId={editorId}
          onStateChange={onStateChange}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </div>
  );
};
