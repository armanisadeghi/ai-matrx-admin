import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';

interface AppByIdPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppByIdPage({ params }: AppByIdPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch app by ID
  const { data: app, error } = await supabase
    .from('prompt_apps')
    .select('slug, status')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !app) {
    notFound();
  }

  // Redirect to the slug URL (canonical URL)
  redirect(`/p/${app.slug}`);
}

