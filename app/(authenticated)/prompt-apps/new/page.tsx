import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreatePromptAppForm } from "@/features/prompt-apps/components/CreatePromptAppForm";

export default async function NewPromptAppPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/sign-in');
  }
  
  // Fetch user's prompts for selection
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, description, variable_defaults, settings')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('prompt_app_categories')
    .select('*')
    .order('sort_order');
  
  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Create Prompt App</h1>
            <p className="text-muted-foreground">
              Turn your prompt into a public shareable web app with a custom UI
            </p>
          </div>
          
          <CreatePromptAppForm 
            prompts={prompts || []}
            categories={categories || []}
          />
        </div>
      </div>
    </div>
  );
}

