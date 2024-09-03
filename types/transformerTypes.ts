// File location: @/types/transformerTypes

import { ActionType } from '@/types/actionTypes';

export type TransformerType = {
    id: string;
    name?: string;
    inputParams?: Record<string, unknown>;
    outputParams?: Record<string, unknown>;
    action?: ActionType[];
};
