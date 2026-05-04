'use client';
import { useEffect, useState, useCallback } from 'react';
import { listImages } from '../../services/image.service';
import type { ImageRecord } from '../../types';

export function useImages(folderPath: string) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listImages(folderPath);
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load images'));
    } finally {
      setLoading(false);
    }
  }, [folderPath]);

  useEffect(() => { load(); }, [load]);

  return { images, loading, error, refresh: load };
}
