// File location: @/types/automationBoundaryBrokerTypes

export type SparkSourceType = "user_input" | "database" | "api" | "environment" | "file" | "chance" | "generated_data" | "function" | "none";
export type BeaconDestinationType = "user_output" | "database" | "file" | "api_response" | "function";

export type AutomationBoundaryBrokerType = {
    id: string;
    matrix?: string;
    broker?: string;
    sparkSource?: SparkSourceType;
    beaconDestination?: BeaconDestinationType;

};
