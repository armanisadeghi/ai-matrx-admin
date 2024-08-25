// File location: @/types/argTypes

export type DataTypeType = "str" | "int" | "float" | "bool" | "dict" | "list" | "url"; // data_type

export type ArgType = {
    id: string; // id
    name: string; // name
    required?: boolean; // required
    default?: string; // default
    dataType?: DataTypeType; // data_type
    ready?: boolean; // ready
    registeredFunction?: string; // registered_function
};
