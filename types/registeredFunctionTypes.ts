// File location: @/types/registeredFunctionTypes

import { ArgType } from '@/types/argTypes';
import {FlexRef} from "@/types/FlexRef";

export type RegisteredFunctionType = {
    id: string;
    name: string;
    modulePath: string;
    className?: string;
    description?: string;
    returnBroker?: string;
    arg?: FlexRef<ArgType[]>;
    systemFunction?: any[];
    recipeFunction?: any[];
};
