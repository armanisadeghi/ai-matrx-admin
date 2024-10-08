// File: lib/redux/featureSchema.ts

import * as z from 'zod';
import {RegisteredFunctionBaseSchema, RegisteredFunctionFullSchema} from '@/types/registeredFunctionTypes';
import {PaginatedResponse} from '@/types/reduxTypes';

export const featureSchemas = {
    registeredFunction: RegisteredFunctionBaseSchema,
    registeredFunctionFull: RegisteredFunctionFullSchema,
} as const;


export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
    itemSchema: T
): z.ZodType<PaginatedResponse<z.infer<T>>> =>
    z.object({
        page: z.number(),
        allIdAndNames: z.array(z.object({id: z.string(), name: z.string()})),
        pageSize: z.number(),
        totalCount: z.number(),
        paginatedData: z.array(itemSchema),
    }).strict() as z.ZodType<PaginatedResponse<z.infer<T>>>;
