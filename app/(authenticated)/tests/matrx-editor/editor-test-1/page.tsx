"use client";

import { MatrxEditor } from "@/components/matrx-editor/MatrxEditor";
import { MatrxEditorWithControls } from "@/components/matrx-editor/MatrxEditorWithControls";
import { DocumentState } from "@/components/matrx-editor/types";
import React, { useState, useEffect } from "react";

export default function EditorPage() {
  const [isClient, setIsClient] = useState(false);
  const [documentState, setDocumentState] = useState<DocumentState>({
    blocks: [],
    version: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleStateChange = (newState: DocumentState) => {
    setDocumentState(newState);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-screen grid grid-cols-2 gap-4 p-4 bg-background">
      {/* Left side */}
      <div className="grid grid-rows-3 gap-4 h-full">
        {/* Top section */}
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-muted-foreground">Left Top Section Placeholder</p>
        </div>
        
        {/* Middle section with editor */}
        <div className="border rounded-lg shadow-sm p-4 bg-background">
          <MatrxEditorWithControls
            editorId="editor-1"
            onStateChange={handleStateChange}
          />
        </div>
        
        {/* Bottom section */}
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-muted-foreground">Left Bottom Section Placeholder</p>
        </div>
      </div>

      {/* Right side */}
      <div className="grid grid-rows-3 gap-4 h-full">
        {/* Top section with textarea */}
        <div className="border rounded-lg shadow-sm p-4 bg-background">
          <textarea 
            value={JSON.stringify(documentState, null, 2)}
            readOnly
            className="w-full h-full resize-none rounded-md border bg-background text-foreground p-2 font-mono text-sm"
          />
        </div>
        
        {/* Middle section */}
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-muted-foreground">Right Middle Section Placeholder</p>
        </div>
        
        {/* Bottom section */}
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-muted-foreground">Right Bottom Section Placeholder</p>
        </div>
      </div>
    </div>
  );
}