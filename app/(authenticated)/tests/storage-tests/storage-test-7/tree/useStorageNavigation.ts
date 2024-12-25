// hooks/useStorageNavigation.ts
import { useState } from 'react';
import { TreeItem } from './types';

export function useStorageNavigation() {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [isViewingBuckets, setIsViewingBuckets] = useState(true);

  const handleBucketSelect = (bucket: string) => {
    setSelectedBucket(bucket);
    setIsViewingBuckets(false);
  };

  const handleBackToBuckets = () => {
    setIsViewingBuckets(true);
  };

  return {
    selectedBucket,
    isViewingBuckets,
    handleBucketSelect,
    handleBackToBuckets
  };
}
