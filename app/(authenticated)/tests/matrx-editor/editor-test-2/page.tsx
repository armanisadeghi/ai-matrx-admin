"use client";

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

  const renderDocumentText = () => {
    return documentState.blocks
      .map((block) => {
        if (block.type === "chip") {
          return `{${block.content}}!`;
        } else if (block.type === "lineBreak") {
          return "\n";
        }
        return block.content;
      })
      .join("");
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-screen flex flex-col gap-4 p-4 bg-background">
      {/* Top row with editor and rendered document */}
      <div className="flex gap-4 h-[400px]"> {/* Adjust height as needed */}
        <div className="flex-1 border rounded-lg shadow-sm p-4 bg-background">
          <MatrxEditorWithControls
            editorId="editor-1"
            onStateChange={handleStateChange}
          />
        </div>
        <div className="flex-1 border rounded-lg p-4 bg-muted">
          <textarea
            value={renderDocumentText()}
            readOnly
            className="w-full h-full resize-none rounded-md border bg-background text-foreground p-2 font-mono text-sm"
          />
        </div>
      </div>

      {/* Bottom row with table and JSON */}
      <div className="flex gap-4 flex-1">
        {/* Table */}
        <div className="flex-1 border rounded-lg shadow-sm p-4 bg-background overflow-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="border px-2 py-1">Position</th>
                <th className="border px-2 py-1">Type</th>
                <th className="border px-2 py-1">Content</th>
                <th className="border px-2 py-1">ID</th>
              </tr>
            </thead>
            <tbody>
              {documentState.blocks.map((block, index) => (
                <tr key={index} className="odd:bg-background even:bg-muted">
                  <td className="border px-2 py-1">{block.position || "-"}</td>
                  <td className="border px-2 py-1">{block.type}</td>
                  <td className="border px-2 py-1">{block.content}</td>
                  <td className="border px-2 py-1">{block.id || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* JSON */}
        <div className="flex-1 border rounded-lg p-4 bg-muted overflow-auto">
          <pre className="whitespace-pre-wrap text-foreground text-sm">
            {JSON.stringify(documentState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}