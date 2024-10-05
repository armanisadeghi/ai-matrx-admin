// File: lib/ai/providers/baseProvider.ts

export interface BaseProvider {
    sendMessage(message: string): Promise<string>;
    // Add other common methods
}
