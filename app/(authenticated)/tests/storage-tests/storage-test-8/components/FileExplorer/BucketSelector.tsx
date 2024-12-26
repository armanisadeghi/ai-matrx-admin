// components/FileExplorer/BucketSelector.tsx
import React from 'react';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BucketSelector() {
  const { availableBuckets, activeBucket, setActiveBucket } = useFileSystem();

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium">Storage Bucket:</label>
      <Select
        value={activeBucket}
        onValueChange={(value: any) => setActiveBucket(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select bucket" />
        </SelectTrigger>
        <SelectContent>
          {availableBuckets.map((bucket) => (
            <SelectItem key={bucket} value={bucket}>
              {bucket}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

