"use client";

import React, { useCallback, useRef, useState } from "react";
import { MatrxEditor, MatrxEditorRef } from "./MatrxEditor";
import type { DocumentState } from "./types";
import EditorToolbar from "./components/EditorToolbar";
import { InsertBrokerButton } from "./broker/InsertBrokerButton";
import { ConvertBrokerButton } from "./broker/ConvertBrokerButton";
import type { Broker } from "@/providers/brokers/BrokersProvider";
import SmartBrokerButton from "./broker/SmartBrokerButton";

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

  const handleBrokerCreate = useCallback((broker: Broker) => {
    editorRef.current?.insertBroker(broker);
  }, []);

  const handleBrokerConvert = useCallback((broker: Broker) => {
    editorRef.current?.convertToBroker(broker);
  }, []);

  const handleSelectionChange = useCallback((selection: string | null) => {
    setSelectedText(selection);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2">
        <SmartBrokerButton
          getSelectedText={() => selectedText}
          onBrokerCreate={handleBrokerCreate}
          onBrokerConvert={handleBrokerConvert}
        />

        <InsertBrokerButton onBrokerCreate={handleBrokerCreate} />
        <ConvertBrokerButton
          selectedText={selectedText}
          onBrokerConvert={handleBrokerConvert}
        />
        <EditorToolbar editorRef={editorRef} />
      </div>
      <div className="flex-1 min-h-0">
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

export default MatrxEditorWithControls;
