// lib/redux/form/types.ts

import { EntityKeys } from "@/types/entityTypes";

export interface FormState {
    forms: {
        [formId: string]: {
            entityKey?: EntityKeys;
            mode: 'create' | 'update' | 'standalone';
            values: Record<string, any>;
            errors: Record<string, string>;
            touched: Record<string, boolean>;
            isDirty: boolean;
            isSubmitting: boolean;
            isValid: boolean;
            originalValues?: Record<string, any>;
            metadata?: {
                entityId?: string | number;
                operation?: string;
                validation?: Record<string, any>;
            };
        };
    };
    activeForm: string | null;
}

