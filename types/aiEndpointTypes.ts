// File location: @/types/aiEndpointTypes

export type AiEndpointType = {
    id: string;
    name: string;
    provider?: string;
    description?: string;
    additionalCost?: boolean;
    costDetails?: Record<string, unknown>;
    params?: Record<string, unknown>;

};
