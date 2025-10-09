import { PromptBuilder } from "@/features/prompts/components/PromptBuilder";
import { fetchAIModels } from "@/lib/api/ai-models-server";

// Cache this page for 12 hours
export const revalidate = 43200;

export default async function NewPromptPage() {
    // Fetch AI models
    const aiModels = await fetchAIModels();

    // Provide sensible defaults for a new prompt
    const newPromptDefaults = {
        name: "New prompt",
        messages: [
            { role: "system", content: "You're a very helpful assistant" },
            { role: "user", content: "Do you know about {{city}}?\n\nI'm looking for {{what}} there.\n\nPlease provide concise and well-structured list of options." }
        ],
        variableDefaults: [
            { name: "city", defaultValue: "New York" },
            { name: "what", defaultValue: "Hotels" }
        ],
        // settings will be initialized from user preferences or first available model
    };

    return <PromptBuilder models={aiModels} initialData={newPromptDefaults} />;
}
