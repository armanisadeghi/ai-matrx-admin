// File location: @/types/dataInputComponentTypes

import { BrokerType } from '@/types/brokerTypes';
import { AutomationBoundaryBrokerType } from '@/types/automationBoundaryBrokerTypes';
import { RecipeBrokerType } from '@/types/recipeBrokerTypes';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { SystemFunctionType } from '@/types/systemFunctionTypes';
import { ToolType } from '@/types/toolTypes';

export type DataInputComponentType = {
    id: string;
    options?: Record<string, unknown>;
    includeOther?: boolean;
    min?: number;
    max?: number;
    step?: number;
    minRows?: number;
    maxRows?: number;
    acceptableFiletypes?: Record<string, unknown>;
    src?: string;
    classes?: string;
    colorOverrides?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;
    broker?: BrokerType[];
    automationBoundaryBroker?: AutomationBoundaryBrokerType[];
    recipeBroker?: RecipeBrokerType[];
    registeredFunction?: RegisteredFunctionType[];
    systemFunction?: SystemFunctionType[];
    tool?: ToolType[];
};
