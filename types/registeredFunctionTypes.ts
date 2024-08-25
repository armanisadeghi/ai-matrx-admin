// File location: @/types/registeredFunctionTypes.ts

import { ArgType } from '@/types/argTypes';
import { FlexRef } from "@/types/FlexRef";
import * as z from 'zod';

export type RegisteredFunctionType = {
    id: string;
    name: string;
    modulePath: string;
    className?: string;
    description?: string;
    returnBroker?: string;
    arg?: FlexRef<ArgType[]>;
    systemFunction?: any[];
    recipeFunction?: any[];
};

export const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    modulePath: z.string().min(1, "Module path is required"),
    className: z.string().optional(),
    description: z.string().optional(),
    returnBroker: z.string().optional(),
    arg: z.string().optional(),
    systemFunction: z.string().optional(),
    recipeFunction: z.string().optional(),
});

export type FormData = z.infer<typeof formSchema>;
