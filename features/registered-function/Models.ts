// File location: @/features/registered-function/Models.ts

import { Model, attr } from 'redux-orm';
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
        systemFunction: attr(),
        recipeFunction: attr(),
    };

    static reducer(action: any, RegisteredFunction: any, session: any) {
        switch (action.type) {
            case 'REGISTERED_FUNCTION_CREATE':
                RegisteredFunction.create(action.payload);
                break;
            case 'REGISTERED_FUNCTION_UPDATE':
                RegisteredFunction.withId(action.payload.id).update(action.payload);
                break;
            case 'REGISTERED_FUNCTION_DELETE':
                RegisteredFunction.withId(action.payload).delete();
                break;
            case 'REGISTERED_FUNCTION_FETCH_SUCCESS':
                action.payload.forEach((item: RegisteredFunctionType) => {
                    RegisteredFunction.upsert(item);
                });
                break;
        }
    }
}

export default RegisteredFunction;
