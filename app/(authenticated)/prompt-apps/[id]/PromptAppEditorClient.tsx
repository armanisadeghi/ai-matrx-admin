'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { PromptAppEditor } from '@/features/prompt-apps/components/PromptAppEditor';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { PromptApp } from '@/features/prompt-apps/types';

export default function PromptAppEditorClient() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<PromptApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function fetchApp() {
      try {
        // RLS ensures user can only fetch their own apps
        const { data, error } = await supabase
          .from('prompt_apps')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned - either doesn't exist or user doesn't own it
            setAccessDenied(true);
          }
          console.error('Error fetching prompt app:', error);
          setApp(null);
        } else {
          setApp(data);
        }
      } catch (error) {
        console.error('Error fetching prompt app:', error);
        setApp(null);
      } finally {
        setLoading(false);
      }
    }

    fetchApp();
  }, [id]);

  if (loading) {
    return (
      <div className="h-page flex items-center justify-center bg-textured">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied || !app) {
    return (
      <div className="h-page flex items-center justify-center bg-textured">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
              This app doesn't exist or you don't have permission to edit it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <PromptAppEditor app={app} />;
}

