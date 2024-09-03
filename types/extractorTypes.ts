// File location: @/types/extractorTypes

export type OutputTypeType = "str" | "int" | "float" | "bool" | "dict" | "list" | "url";

export type ExtractorType = {
    id: string;
    name: string;
    outputType?: OutputTypeType;
    defaultIdentifier?: string;
    defaultIndex?: number;

};
