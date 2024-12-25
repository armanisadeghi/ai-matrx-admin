'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabase/client";

export function useStorageBuckets() {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchBuckets() {
      try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        setBuckets(data.map(bucket => bucket.name));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch buckets');
      } finally {
        setLoading(false);
      }
    }

    fetchBuckets();
  }, []);

  return { buckets, loading, error };
}