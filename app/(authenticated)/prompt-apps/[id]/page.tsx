import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PromptAppEditor } from "@/features/prompt-apps/components/PromptAppEditor";

interface PromptAppPageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptAppPage({ params }: PromptAppPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/sign-in');
  }
  
  // Fetch the prompt app
  const { data: app, error } = await supabase
    .from('prompt_apps')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !app) {
    notFound();
  }
  
  // Check ownership
  if (app.user_id !== user.id) {
    return (
      <div className="h-page flex items-center justify-center bg-textured">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to edit this app.</p>
        </div>
      </div>
    );
  }
  
  return <PromptAppEditor app={app} />;
}

