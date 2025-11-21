import { createClient } from "@/utils/supabase/server";
import { CreatePromptAppForm } from "@/features/prompt-apps/components/CreatePromptAppForm";

export default async function NewPromptAppPage() {
  const supabase = await createClient();
  
  // Get user from server-side session
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user's prompts for selection
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, description, variable_defaults, settings')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false });
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('prompt_app_categories')
    .select('*')
    .order('sort_order');
  
  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <CreatePromptAppForm 
            prompts={prompts || []}
            categories={categories || []}
          />
        </div>
      </div>
    </div>
  );
}
