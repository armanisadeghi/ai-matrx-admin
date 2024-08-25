// File location: @/features/registered-function/Models.ts

import { Model, attr, many } from 'redux-orm';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

class RegisteredFunction extends Model<typeof RegisteredFunction> {
    static modelName = 'RegisteredFunction' as const;

    static fields = {
        id: attr(),
        name: attr(),
        modulePath: attr(),
        className: attr(),
        description: attr(),
        returnBroker: attr(),
        arg: attr(),
        systemFunction: attr(), // Changed from many to attr
        recipeFunction: attr(), // Changed from many to attr
    };

    static parse(data: any): Partial<RegisteredFunctionType> {
        return {
            ...data,
            arg: Array.isArray(data.arg) ? data.arg : data.arg ? [data.arg] : [],
            systemFunction: Array.isArray(data.systemFunction) ? data.systemFunction : data.systemFunction ? [data.systemFunction] : [],
            recipeFunction: Array.isArray(data.recipeFunction) ? data.recipeFunction : data.recipeFunction ? [data.recipeFunction] : [],
        };
    }

    static reducer(action: any, RegisteredFunction: any, session: any) {
        switch (action.type) {
            case 'REGISTERED_FUNCTION_UPSERT':
                RegisteredFunction.upsert(RegisteredFunction.parse(action.payload));
                break;
            case 'REGISTERED_FUNCTION_DELETE':
                RegisteredFunction.withId(action.payload).delete();
                break;
            case 'REGISTERED_FUNCTION_FETCH_SUCCESS':
                action.payload.forEach((item: any) => {
                    RegisteredFunction.upsert(RegisteredFunction.parse(item));
                });
                break;
        }
    }
}

export default RegisteredFunction;
