'use client';

import React, { useState } from 'react';
import MobileFilesList from './MobileFilesList';
import MobileFileDetails from './MobileFileDetails';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';

type MobileView = 'list' | 'details';

export default function MobileFilesView() {
  const [currentView, setCurrentView] = useState<MobileView>('list');
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(null);

  const handleFileSelect = (node: FileSystemNode, bucket: AvailableBuckets | null) => {
    setSelectedNode(node);
    setSelectedBucket(bucket);
    setCurrentView('details');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedNode(null);
  };

  return (
    <div className="h-page w-full bg-background overflow-hidden relative touch-pan-y">
      {/* Files List View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === 'list' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <MobileFilesList onFileSelect={handleFileSelect} />
      </div>

      {/* File Details View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === 'details' ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNode && (
          <MobileFileDetails 
            selectedNode={selectedNode} 
            selectedBucket={selectedBucket}
            onBack={handleBack} 
          />
        )}
      </div>
    </div>
  );
}

