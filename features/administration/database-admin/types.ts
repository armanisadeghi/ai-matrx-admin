// types/database.ts
export interface DatabaseFunction {
    name: string;
    schema: string;
    security_type: string;
    arguments: string;
    returns: string;
    definition: string;
}

export interface DatabasePermission {
    object_name: string;
    object_type: string;
    role: string;
    privileges: string[];
}
