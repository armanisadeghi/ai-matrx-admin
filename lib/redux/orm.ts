// File: @/lib/redux/orm.ts

import { ORM } from 'redux-orm';
import RegisteredFunction from '@/features/registered-function/Models';

const orm = new ORM({
    stateSelector: state => state.orm,
});

orm.register(RegisteredFunction);

export default orm;


// import { DynamicEventModel } from '@/redux/features/dynamicEvents/models';
// orm.register(RegisteredFunction, Arg, SystemFunction, RecipeFunction, Broker);
//
