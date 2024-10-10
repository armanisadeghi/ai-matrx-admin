'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

const supabase = createClient();

type TableField = {
    alts: {
        frontend: string;
        backend: string;
        database: string;
        db_p: string;
        pretty: string;
    };
    type: string;
    format: string;
    structure: {
        structure: string;
        typeReference?: string;
        databaseTable?: string;
    };
};

type TableSchema = {
    name: {
        frontend: string;
        backend: string;
        database: string;
        pretty: string;
    };
    schemaType: string;
    fields: Record<string, TableField>;
};

type OutputSchema = Record<string, TableSchema>;

export async function fetchAndGenerateSchema() {
    try {
        const { data, error } = await supabase.rpc('get_tables_and_columns');

        if (error) {
            throw new Error(`Error fetching tables: ${error.message}`);
        }

        const outputSchema: OutputSchema = {};

        const tablesGrouped = data?.reduce((acc: Record<string, any>, row: any) => {
            if (!acc[row.table_name]) acc[row.table_name] = [];
            acc[row.table_name].push({ column_name: row.column_name, data_type: row.data_type });
            return acc;
        }, {});

        for (const [tableName, columns] of Object.entries(tablesGrouped)) {
            if (!Array.isArray(columns)) {
                throw new Error('Columns must be an array');
            }

            const tableSchema: TableSchema = {
                name: {
                    frontend: tableName,
                    backend: tableName.replace(/_/g, ''),
                    database: tableName,
                    pretty: capitalizeWords(tableName.replace(/_/g, ' ')),
                },
                schemaType: 'table',
                fields: {},
            };

            for (const column of columns) {
                const columnName = column.column_name;
                const columnType = mapDataType(column.data_type);

                tableSchema.fields[columnName] = {
                    alts: {
                        frontend: columnName,
                        backend: columnName.replace(/_/g, ''),
                        database: columnName,
                        db_p: `p_${columnName}`,
                        pretty: capitalizeWords(columnName.replace(/_/g, ' ')),
                    },
                    type: columnType,
                    format: 'single',
                    structure: {
                        structure: 'simple',
                        typeReference: `createTypeReference<${mapTypeScriptType(columnType)}>()`,
                    },
                };
            }

            outputSchema[tableName] = tableSchema;
        }

        const date = new Date();
        const formattedDate = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;

        const directoryPath = path.join(process.cwd(), 'utils', 'schema');

        console.log(`Creating directory at: ${directoryPath}`);
        await fs.mkdir(directoryPath, { recursive: true }).catch((err) => {
            console.error('Error creating directory:', err);
            throw new Error('Directory creation failed.');
        });

        const filePath = path.join(directoryPath, `generatedSchema-${formattedDate}.ts`);
        console.log(`File path set to: ${filePath}`);

        const staticImports = `
import { TableSchema, createTypeReference, InferSchemaType } from './schemaRegistry';
import { Json } from "@/types/database.types";
`;

        const formattedSchemaContent = formatSchemaContent(outputSchema);
        const schemaContent = `export const initialSchemas: Record<string, TableSchema> = {\n${formattedSchemaContent}\n};`;

        const typeDefinitions = Object.keys(outputSchema)
            .map(
                (tableName) => `export type ${capitalizeWords(tableName)}Type = InferSchemaType<typeof initialSchemas.${tableName}>;`
            )
            .join('\n');

        const tsContent = `${staticImports}\n\nexport const initialSchemas: Record<string, TableSchema> = {\n${formatSchemaContent(outputSchema)}\n};\n\n${typeDefinitions}`;

        console.log(`Writing file to: ${filePath}`);
        await fs.writeFile(filePath, tsContent, 'utf8').then(() => {
            console.log('File written successfully!');
        }).catch((err) => {
            console.error('Error writing file:', err);
            throw new Error('File writing failed.');
        });

        return { success: true, schema: outputSchema, message: `File generatedSchema-${formattedDate}.ts created` };
    } catch (error) {
        console.error('Error fetching schema:', error);
        return { success: false, error: error.message };
    }
}

function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapTypeScriptType(sqlType: string): string {
    switch (sqlType) {
        case 'character varying':
        case 'text':
            return 'string';
        case 'integer':
        case 'smallint':
        case 'bigint':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'timestamp without time zone':
        case 'timestamp with time zone':
            return 'Date';
        case 'jsonb':
            return 'object';
        default:
            return 'any';
    }
}

function mapDataType(sqlType: string): string {
    switch (sqlType) {
        case 'character varying':
        case 'text':
            return 'string';
        case 'integer':
        case 'smallint':
        case 'bigint':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'timestamp without time zone':
        case 'timestamp with time zone':
            return 'Date';
        case 'jsonb':
            return 'object';
        default:
            return 'unknown';
    }
}

function formatSchemaContent(schema: OutputSchema): string {
    return Object.entries(schema)
        .map(([tableName, tableSchema]) => {
            const formattedFields = Object.entries(tableSchema.fields)
                .map(([fieldName, fieldDetails]) => {
                    return `${fieldName}: {
                        alts: {
                            frontend: '${fieldDetails.alts.frontend}',
                            backend: '${fieldDetails.alts.backend}',
                            database: '${fieldDetails.alts.database}',
                            db_p: '${fieldDetails.alts.db_p}',
                            pretty: '${fieldDetails.alts.pretty}'
                        },
                        type: '${fieldDetails.type}',
                        format: '${fieldDetails.format}',
                        structure: {
                            structure: '${fieldDetails.structure.structure}',
                            typeReference: ${fieldDetails.structure.typeReference}${fieldDetails.structure.databaseTable ? `,
                            databaseTable: '${fieldDetails.structure.databaseTable}'` : ''}
                        }
                    }`;
                })
                .join(',\n');

            return `${tableName}: {
                name: {
                    frontend: '${tableSchema.name.frontend}',
                    backend: '${tableSchema.name.backend}',
                    database: '${tableSchema.name.database}',
                    pretty: '${tableSchema.name.pretty}'
                },
                schemaType: '${tableSchema.schemaType}',
                fields: {
                    ${formattedFields}
                }
            }`;
        })
        .join(',\n');
}
