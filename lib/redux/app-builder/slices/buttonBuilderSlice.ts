
interface ButtonBuilder {
    id: string;
    name: string;
    description?: string;
    actionType: string;
    knownMethod: string;
}

interface ButtonBuilderState {
    buttons: Record<string, ButtonBuilder>;
    isLoading: boolean;
    error: string | null;
}


