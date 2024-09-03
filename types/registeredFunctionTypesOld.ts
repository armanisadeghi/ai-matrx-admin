/*
// File location: @/types/registeredFunctionTypes.ts

import { ArgType } from '@/types/argTypes';
import { SystemFunctionType } from '@/types/systemFunctionTypes';
import { RecipeFunctionType } from '@/types/recipeFunctionTypes';
import { BrokerType } from "@/types/brokerTypes";
import * as z from 'zod';

export enum RegisteredFunctionTypeEnum {
    Base = 'base',
    Full = 'full'
}

// Zod schema for the base version
export const RegisteredFunctionBaseSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    modulePath: z.string().min(1, "Module path is required"),
    className: z.string().optional(),
    description: z.string().optional(),
    returnBroker: z.string().optional(),
    arg: z.union([z.string(), z.array(z.string())]).optional(),
    systemFunction: z.string().optional(),
    recipeFunction: z.union([z.string(), z.array(z.string())]).optional(),
    type: z.literal(RegisteredFunctionTypeEnum.Base),
});

// Zod schema for the full version
export const RegisteredFunctionFullSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    modulePath: z.string().min(1, "Module path is required"),
    className: z.string().optional(),
    description: z.string().optional(),
    type: z.literal(RegisteredFunctionTypeEnum.Full),
    returnBroker: z.custom<BrokerType>().optional(),
    arg: z.array(z.custom<ArgType>()).optional(),
    systemFunction: z.custom<SystemFunctionType>().optional(),
    recipeFunction: z.array(z.custom<RecipeFunctionType>()).optional(),
});

// Union schema for validation
export const RegisteredFunctionUnionSchema = z.discriminatedUnion('type', [
    RegisteredFunctionBaseSchema,
    RegisteredFunctionFullSchema
]);

// Types inferred from Zod schemas
export type RegisteredFunctionBase = z.infer<typeof RegisteredFunctionBaseSchema>;
export type RegisteredFunctionFull = z.infer<typeof RegisteredFunctionFullSchema>;
export type RegisteredFunctionUnion = z.infer<typeof RegisteredFunctionUnionSchema>;

// Schema for form data (omitting 'id' and 'type')
export const FormDataSchema = RegisteredFunctionBaseSchema.omit({ id: true, type: true });

// Type for form data
export type FormData = z.infer<typeof FormDataSchema>;

// Input schemas (omitting 'id')
export const RegisteredFunctionBaseInputSchema = RegisteredFunctionBaseSchema.omit({ id: true });
export const RegisteredFunctionFullInputSchema = RegisteredFunctionFullSchema.omit({ id: true });

// Union of input schemas
export const RegisteredFunctionInputSchema = z.union([
    RegisteredFunctionBaseInputSchema,
    RegisteredFunctionFullInputSchema
]);

// Type for input validation
export type RegisteredFunctionInput = z.infer<typeof RegisteredFunctionInputSchema>;

// Partial schemas for update operations
export const PartialRegisteredFunctionBaseSchema = RegisteredFunctionBaseSchema.partial().extend({ type: z.literal(RegisteredFunctionTypeEnum.Base) });
export const PartialRegisteredFunctionFullSchema = RegisteredFunctionFullSchema.partial().extend({ type: z.literal(RegisteredFunctionTypeEnum.Full) });
export const PartialRegisteredFunctionInputSchema = z.union([PartialRegisteredFunctionBaseSchema, PartialRegisteredFunctionFullSchema]);

// Type for partial input (used in update operations)
export type PartialRegisteredFunctionInput = z.infer<typeof PartialRegisteredFunctionInputSchema>;
*/
