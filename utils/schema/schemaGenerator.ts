'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

const supabase = createClient();

// Define the structure for the output schema
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

// File creation function
export async function createFile(filename: string, content: string) {
    const filePath = path.join(process.cwd(), 'files', `${filename}.ts`);
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true, message: `File ${filename}.ts created` };
}

// Function to fetch and transform the schema
export async function fetchAndGenerateSchema() {
    try {
        // Fetch the database schema from Supabase
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (error) {
            throw new Error(`Error fetching tables: ${error.message}`);
        }

        const outputSchema: OutputSchema = {};

        // Iterate over the tables to build their structures
        for (const table of tables || []) {
            const tableName = table.table_name;

            // Fetch columns of the table
            const { data: columns, error: columnError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_name', tableName);

            if (columnError) {
                throw new Error(`Error fetching columns for ${tableName}: ${columnError.message}`);
            }

            // Structure the table schema
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

            // Iterate over the columns and structure them
            for (const column of columns || []) {
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

        // Convert the output schema to TypeScript content
        const tsContent = `export const initialSchemas: Record<string, TableSchema> = ${JSON.stringify(outputSchema, null, 2)};`;

        // Call the createFile function to save the schema to a file
        await createFile('generatedSchema', tsContent);

        console.log('Schema generated successfully');
    } catch (error) {
        console.error('Error fetching schema:', error);
    }
}

// Utility function to capitalize words
function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Utility function to map SQL data types to TypeScript types
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

// Utility function to map data type for output schema
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
