import { PromptBuilder } from "@/features/prompts/components/PromptBuilder";
import { fetchAIModels } from "@/lib/api/ai-models";

export default async function NewPromptPage() {
    // Fetch AI models
    const aiModels = await fetchAIModels();

    return <PromptBuilder models={aiModels} />;
}
