import { RecipeSimpleMessage } from "@/features/workflows/service/recipe-service";

export function estimateTokens(content: string) {
    try {
        // Ensure content is a string
        if (typeof content !== "string") {
            console.warn("Invalid content format:", content);
            return 0;
        }

        // Count characters in content
        const totalCharacters = content.length;

        // Estimate tokens: 1 token ≈ 4 characters
        const estimatedTokens = Math.ceil(totalCharacters / 4);

        // Add a small buffer (e.g., 5 tokens) for formatting/overhead
        return estimatedTokens + 5;
    } catch (error) {
        console.error("Error estimating tokens:", error);
        return 0;
    }
}

export function estimateTotalTokens(messages: RecipeSimpleMessage[]) {
    try {
        let totalCharacters = 0;

        // Iterate through each message
        for (const message of messages) {
            // Ensure message has role and content
            if (!message.role || !message.content) {
                console.warn("Invalid message format:", message);
                continue;
            }

            // Combine role and content for character counting
            const text = `role: ${message.role}\n${message.content}`;
            totalCharacters += text.length;
        }

        // Estimate tokens: 1 token ≈ 4 characters
        const estimatedTokens = Math.ceil(totalCharacters / 4);

        // Add a 5-token buffer for formatting/overhead
        return estimatedTokens + 5;
    } catch (error) {
        console.error("Error estimating tokens:", error);
        return 0;
    }
}
