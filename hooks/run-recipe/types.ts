import {
    AiSettingsData,
    BrokerValueData,
    DataInputComponentData,
    DataInputComponentRecordWithKey,
    DataOutputComponentData,
    MatrxRecordId,
    MessageBrokerData,
    MessageTemplateDataOptional,
    RecipeRecordWithKey,
} from "@/types";


export type DataBrokerData = {
    id: string;
    name: string;
    dataType?: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    outputComponent?: string;
    dataInputComponentReference?: DataInputComponentData[];
    defaultValue?: string;
    inputComponent?: string;
    color?:
        | "blue"
        | "amber"
        | "cyan"
        | "emerald"
        | "fuchsia"
        | "gray"
        | "green"
        | "indigo"
        | "lime"
        | "neutral"
        | "orange"
        | "pink"
        | "purple"
        | "red"
        | "rose"
        | "sky"
        | "slate"
        | "stone"
        | "teal"
        | "violet"
        | "yellow"
        | "zinc";
    dataOutputComponentReference?: DataOutputComponentData[];
    brokerValueInverse?: BrokerValueData[];
    messageBrokerInverse?: MessageBrokerData[];
};

export type CompiledRecipeEntry = {
    id: string;
    name: string;
    brokers: DataBrokerData[];
    messages: MessageTemplateDataOptional[];
    settings: AiSettingsData[];
};

export type CompiledRecipeRecordWithKey = {
    id: string;
    compiledRecipe: Record<string, unknown>;
    recipeId: string;
    createdAt: Date;
    userId: string;
    isPublic: boolean;
    version: number;
    updatedAt: Date;
    authenticatedRead: boolean;
    matrxRecordId: MatrxRecordId;
};


export type BrokerWithComponent = {
    brokerId: string;
    brokerRecordKey: MatrxRecordId;
    brokerName: string;
    componentRecordKey: MatrxRecordId;
    componentMetadata: DataInputComponentData;
};

export type BrokerWithComponentsMap = Record<string, BrokerWithComponent>;
