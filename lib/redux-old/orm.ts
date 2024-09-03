// File: @/lib/redux-old/orm.ts

import { ORM } from 'redux-orm';


const orm = new ORM({
    stateSelector: state => state.orm,
});

orm.register();

export default orm;


// import { DynamicEventModel } from '@/redux-old/features/dynamicEvents/models';
// orm.register(RegisteredFunction, Arg, SystemFunction, RecipeFunction, Broker);
//
