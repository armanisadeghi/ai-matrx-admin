declare module '@cartesia/cartesia-js/react' {
    export function useTTS(options: {
        apiKey: string | (() => Promise<string>) | null;
        baseUrl?: string;
        sampleRate: number;
        onError?: (error: Error) => void;
    }): {
        buffer: (options: any) => Promise<void>;
        play: (bufferDuration?: number) => Promise<void>;
        pause: () => Promise<void>;
        resume: () => Promise<void>;
        toggle: () => Promise<void>;
        source: any | null;
        playbackStatus: "inactive" | "playing" | "paused" | "finished";
        bufferStatus: "inactive" | "buffering" | "buffered";
        isWaiting: boolean;
        isConnected: boolean;
        metrics: { modelLatency: number | null };
    };
}
