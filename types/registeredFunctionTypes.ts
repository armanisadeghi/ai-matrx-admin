import * as z from 'zod';

export enum RegisteredFunctionTypeEnum {
    Base = 'base',
    Full = 'full'
}

export const RegisteredFunctionBaseSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    modulePath: z.string().min(1, "Module path is required"),
    className: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    returnBroker: z.string().nullable().optional(),
});

export const RegisteredFunctionFullSchema = RegisteredFunctionBaseSchema.extend({
    type: z.literal(RegisteredFunctionTypeEnum.Full),
    returnBrokerObject: z.custom<any>().nullable().optional(),
    args: z.array(z.custom<any>()).nullable().optional(),
    systemFunction: z.custom<any>().nullable().optional(),
    recipeFunctions: z.array(z.custom<any>()).nullable().optional(),
});

export const RegisteredFunctionUnionSchema = z.discriminatedUnion('type', [
    RegisteredFunctionBaseSchema.extend({
        type: z.literal(RegisteredFunctionTypeEnum.Base),
    }),
    RegisteredFunctionFullSchema,
]);

export type RegisteredFunctionBase = z.infer<typeof RegisteredFunctionBaseSchema>;
export type RegisteredFunctionFull = z.infer<typeof RegisteredFunctionFullSchema>;
export type RegisteredFunctionUnion = z.infer<typeof RegisteredFunctionUnionSchema>;

export const FormDataSchema = RegisteredFunctionBaseSchema.omit({ id: true });

export type FormData = z.infer<typeof FormDataSchema>;

// Optional: If we need to support partial updates (i.e., patch operations):
export const PartialRegisteredFunctionBaseSchema = RegisteredFunctionBaseSchema.partial();
export const PartialRegisteredFunctionFullSchema = RegisteredFunctionFullSchema.partial();
export type PartialRegisteredFunctionBase = z.infer<typeof PartialRegisteredFunctionBaseSchema>;
export type PartialRegisteredFunctionFull = z.infer<typeof PartialRegisteredFunctionFullSchema>;


export type RegisteredFunctionType = RegisteredFunctionBase | RegisteredFunctionFull;
