// File location: @/types/registeredFunctionTypes

import { ArgType } from '@/types/argTypes';
import {FlexRef} from "@/types/FlexRef";

export type RegisteredFunctionType = {
    id: string; // id
    name: string; // name
    modulePath: string; // module_path
    className?: string; // class_name
    description?: string; // description
    returnBroker?: string; // broker
    arg?: FlexRef<ArgType[]>; // arg
    systemFunction?: any[]; // system_function
    recipeFunction?: any[]; // recipe_function
};

