import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { PromptAppEditor } from '@/features/prompt-apps/components/PromptAppEditor';

interface PromptAppPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PromptAppPage({ params }: PromptAppPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS ensures user can only fetch their own apps
  const { data: app, error } = await supabase
    .from('prompt_apps')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !app) {
    notFound();
  }

  return <PromptAppEditor app={app} />;
}

