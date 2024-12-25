  // useStorageList.ts
  import { useState, useEffect } from 'react';
  import { supabase } from "@/utils/supabase/client";
  import { TreeItem } from './types';
  import { sortStorageItems } from './utils';
  
  export function useStorageList(bucketName: string, path: string = '') {
    const [items, setItems] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  
    useEffect(() => {
      if (!bucketName || (path && !path.trim())) {
        setItems([]);
        return;
      }
  
      async function loadItems() {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .storage
            .from(bucketName)
            .list(path);
  
          if (error) throw error;
  
          const formattedItems: TreeItem[] = data.map(item => ({
            name: item.name,
            id: item.id,
            type: item.id === null ? 'folder' : 'file',
            metadata: item.metadata
          }));
  
          setItems(formattedItems.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
          }));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load contents');
        } finally {
          setLoading(false);
        }
      }
  
      loadItems();
    }, [bucketName, path]);
  
    return { items, loading, error };
  }
  