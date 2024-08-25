// File location: @/types/argTypes

export type DataTypeType = "str" | "int" | "float" | "bool" | "dict" | "list" | "url";

export type ArgType = {
    id: string;
    name: string;
    required?: boolean;
    default?: string;
    dataType?: DataTypeType;
    ready?: boolean;
    registeredFunction?: string;

};
