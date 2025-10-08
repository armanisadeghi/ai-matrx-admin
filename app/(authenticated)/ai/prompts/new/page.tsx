import { PromptBuilder } from "@/features/prompts/components/PromptBuilder";
import { fetchAIModels } from "@/lib/api/ai-models-server";

// Cache this page for 12 hours
export const revalidate = 43200;

export default async function NewPromptPage() {
    // Fetch AI models
    const aiModels = await fetchAIModels();

    return <PromptBuilder models={aiModels} />;
}
