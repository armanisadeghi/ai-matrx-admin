
import { ORM } from 'redux-orm';


// import { DynamicEventModel } from '@/redux/features/dynamicEvents/models';


const orm = new ORM({
    stateSelector: (state) => state.orm,
});

// orm.register(RegisteredFunction, Arg, SystemFunction, RecipeFunction, Broker);

orm.register();


export default orm;
