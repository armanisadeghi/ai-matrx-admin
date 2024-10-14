// File location: @/types/recipeBrokerTypes

export type BrokerRoleType = "input_broker" | "output_broker";

export type RecipeBrokerType = {
    id: string;
    recipe: string;
    broker: string;
    brokerRole: BrokerRoleType;
    required?: boolean;
};
