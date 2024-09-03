// // registeredFunctionSlice.ts
// import { createEntitySlice, createEntitySelectors, Payload } from './reduxFactory';
// import { schema } from 'normalizr';
// import {
//     RegisteredFunctionUnion,
//     RegisteredFunctionTypeEnum,
//     RegisteredFunctionInputSchema,
//     RegisteredFunctionBaseSchema,
//     RegisteredFunctionFullSchema,
//     PartialRegisteredFunctionInputSchema,
//     RegisteredFunctionInput,
//     PartialRegisteredFunctionInput
// } from '@/types/registeredFunctionTypes';
//
// // Normalizr schemas
// const argSchema = new schema.Payload('args');
// const brokerSchema = new schema.Payload('brokers');
// const systemFunctionSchema = new schema.Payload('systemFunctions');
// const recipeFunctionSchema = new schema.Payload('recipeFunctions');
//
// // We'll use RegisteredFunctionUnion as our main type for the slice
// export type RegisteredFunctionEntity = Payload & RegisteredFunctionUnion;
//
// const registeredFunctionSchema = new schema.Payload('registeredFunctions', {
//     returnBroker: brokerSchema,
//     arg: [argSchema],
//     systemFunction: systemFunctionSchema,
//     recipeFunction: [recipeFunctionSchema]
// }, {
//     processStrategy: (value: RegisteredFunctionUnion) => {
//         if (value.type === RegisteredFunctionTypeEnum.Full) {
//             return value;
//         } else {
//             // For 'base' type, we need to ensure the fields are strings or arrays of strings
//             return {
//                 ...value,
//                 returnBroker: value.returnBroker as string | undefined,
//                 arg: Array.isArray(value.arg) ? value.arg : value.arg ? [value.arg] : undefined,
//                 systemFunction: value.systemFunction as string | undefined,
//                 recipeFunction: Array.isArray(value.recipeFunction) ? value.recipeFunction : value.recipeFunction ? [value.recipeFunction] : undefined
//             };
//         }
//     }
// });
//
// const { reducer, actions } = createEntitySlice<RegisteredFunctionEntity>('registeredFunctions', registeredFunctionSchema);
//
// export const {
//     fetchOne: fetchRegisteredFunction,
//     fetchPaginated: fetchPaginatedRegisteredFunctions,
//     deleteOne: deleteRegisteredFunctionRPC,
//     update: saveRegisteredFunction,
//     create: createRegisteredFunctionThunk
// } = actions;
//
// export const { getEntities: getRegisteredFunctionEntities, getOne: getRegisteredFunction } = createEntitySelectors<RegisteredFunctionEntity>('registeredFunctions');
//
// // Wrapper for create thunk with input validation
// export const createRegisteredFunction = (input: RegisteredFunctionInput) => {
//     const validatedInput = RegisteredFunctionInputSchema.parse(input);
//     return createRegisteredFunctionThunk(validatedInput as RegisteredFunctionEntity);
// };
//
// // Wrapper for update thunk with input validation
// export const updateRegisteredFunction = (id: string, input: PartialRegisteredFunctionInput) => {
//     const validatedInput = PartialRegisteredFunctionInputSchema.parse(input);
//     return saveRegisteredFunction({ id, ...validatedInput } as RegisteredFunctionEntity);
// };
//
// export default reducer;
