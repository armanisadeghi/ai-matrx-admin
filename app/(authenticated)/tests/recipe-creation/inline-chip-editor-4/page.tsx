'use client';

import React, { useState, useEffect } from 'react';
import { StructuredEditor } from './components/StructuredEditor';
import type { DocumentState, ContentBlock } from './types';

const ChipList: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  const chipBlocks = blocks.filter(block => block.type === 'chip');
  
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Chips in Document</h3>
      <div className="space-y-2">
        {chipBlocks.map((chip) => (
          <div key={chip.id} className="flex items-center justify-between p-2 bg-textured rounded-lg">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {chip.content}
            </span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Position: {chip.position}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 gap-8">
          {/* Editor Section */}
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Editor</h2>
            <StructuredEditor onStateChange={handleStateChange} showControls={true} />
          </div>

          {/* State Reconstruction Test */}
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-16 text-gray-900 dark:text-gray-100">State Reconstruction Test</h2>
            <StructuredEditor 
              initialState={documentState} 
              showControls={false}
              key={`reconstruction-${documentState.version}`} // Force remount on state changes
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          {/* Debug View */}
          <div className="w-full">
            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Document State</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(documentState, null, 2)}
              </pre>
            </div>
          </div>

          {/* Chips List */}
          <div className="w-full">
            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <ChipList blocks={documentState.blocks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}