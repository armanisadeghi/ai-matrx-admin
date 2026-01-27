'use client';

import { registerFunction, FunctionDependencies } from './function-registry';
import { createSchemaTemplate, getSchemaTemplates, getSchemaTemplateById, deleteSchemaTemplate, updateSchemaTemplate, CreateTemplateParams } from '../user-table-utls/template-utils';
import { createTable, addColumn, getTableDetails, addRow, CreateTableParams, AddColumnParams, AddRowParams } from '../user-table-utls/table-utils';

/**
 * Register all database operation functions for use in applets
 */
export function registerDatabaseFunctions() {
  // Register schema template functions
  registerFunction(
    {
      name: 'createSchemaTemplate',
      displayName: 'Create Schema Template',
      description: 'Create a new schema template in the database',
      category: 'Schema Templates',
      parameters: [
        {
          name: 'templateName',
          type: 'string',
          description: 'Name of the template',
          required: true
        },
        {
          name: 'description',
          type: 'string',
          description: 'Description of the template',
          required: false
        },
        {
          name: 'fields',
          type: 'array',
          description: 'Array of field definitions',
          required: true
        },
        {
          name: 'version',
          type: 'number',
          description: 'Version number of the template',
          required: false,
          defaultValue: 1
        }
      ],
      returnType: 'CreateTemplateResult'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await createSchemaTemplate(dependencies.supabase, params as CreateTemplateParams);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'getSchemaTemplates',
      displayName: 'Get All Schema Templates',
      description: 'Fetch all available schema templates',
      category: 'Schema Templates',
      parameters: [],
      returnType: 'SchemaTemplate[]'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await getSchemaTemplates(dependencies.supabase);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'getSchemaTemplateById',
      displayName: 'Get Schema Template by ID',
      description: 'Fetch a specific schema template by ID',
      category: 'Schema Templates',
      parameters: [
        {
          name: 'templateId',
          type: 'string',
          description: 'ID of the template to fetch',
          required: true
        }
      ],
      returnType: 'SchemaTemplate | null'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await getSchemaTemplateById(dependencies.supabase, params.templateId);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'deleteSchemaTemplate',
      displayName: 'Delete Schema Template',
      description: 'Delete a schema template by ID',
      category: 'Schema Templates',
      parameters: [
        {
          name: 'templateId',
          type: 'string',
          description: 'ID of the template to delete',
          required: true
        }
      ],
      returnType: 'Object'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await deleteSchemaTemplate(dependencies.supabase, params.templateId);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'updateSchemaTemplate',
      displayName: 'Update Schema Template',
      description: 'Update an existing schema template',
      category: 'Schema Templates',
      parameters: [
        {
          name: 'templateId',
          type: 'string',
          description: 'ID of the template to update',
          required: true
        },
        {
          name: 'templateName',
          type: 'string',
          description: 'New name for the template',
          required: false
        },
        {
          name: 'description',
          type: 'string',
          description: 'New description for the template',
          required: false
        },
        {
          name: 'fields',
          type: 'array',
          description: 'New array of field definitions',
          required: false
        },
        {
          name: 'version',
          type: 'number',
          description: 'New version number',
          required: false
        }
      ],
      returnType: 'Object'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      const { templateId, ...updates } = params;
      return await updateSchemaTemplate(dependencies.supabase, templateId, updates);
    },
    ['supabase']
  );

  // Register table functions
  registerFunction(
    {
      name: 'createTable',
      displayName: 'Create User Table',
      description: 'Create a new user-generated table',
      category: 'User Tables',
      parameters: [
        {
          name: 'tableName',
          type: 'string',
          description: 'Name of the table to create',
          required: true
        },
        {
          name: 'description',
          type: 'string',
          description: 'Description of the table',
          required: false,
          defaultValue: ''
        },
        {
          name: 'isPublic',
          type: 'boolean',
          description: 'Whether the table is publicly accessible',
          required: false,
          defaultValue: false
        },
        {
          name: 'authenticatedRead',
          type: 'boolean',
          description: 'Whether authenticated users can read the table',
          required: false,
          defaultValue: false
        },
        {
          name: 'fields',
          type: 'array',
          description: 'Initial fields for the table',
          required: false,
          defaultValue: null
        }
      ],
      returnType: 'CreateTableResult'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await createTable(dependencies.supabase, params as CreateTableParams);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'addColumn',
      displayName: 'Add Column to Table',
      description: 'Add a new column to an existing table',
      category: 'User Tables',
      parameters: [
        {
          name: 'tableId',
          type: 'string',
          description: 'ID of the table to modify',
          required: true
        },
        {
          name: 'fieldName',
          type: 'string',
          description: 'Field name for the column',
          required: true
        },
        {
          name: 'displayName',
          type: 'string',
          description: 'Display name for the column',
          required: true
        },
        {
          name: 'dataType',
          type: 'string',
          description: 'Data type for the column',
          required: true
        },
        {
          name: 'isRequired',
          type: 'boolean',
          description: 'Whether the field is required',
          required: true
        },
        {
          name: 'defaultValue',
          type: 'string',
          description: 'Default value for the field',
          required: false
        }
      ],
      returnType: 'AddColumnResult'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await addColumn(dependencies.supabase, params as AddColumnParams);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'getTableDetails',
      displayName: 'Get Table Details',
      description: 'Get details of a table including its fields',
      category: 'User Tables',
      parameters: [
        {
          name: 'tableId',
          type: 'string',
          description: 'ID of the table to fetch',
          required: true
        }
      ],
      returnType: 'GetTableResult'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await getTableDetails(dependencies.supabase, params.tableId);
    },
    ['supabase']
  );

  registerFunction(
    {
      name: 'addRow',
      displayName: 'Add Row to Table',
      description: 'Add a new row of data to a table',
      category: 'User Tables',
      parameters: [
        {
          name: 'tableId',
          type: 'string',
          description: 'ID of the table to add row to',
          required: true
        },
        {
          name: 'data',
          type: 'object',
          description: 'Data to add as a new row',
          required: true
        }
      ],
      returnType: 'AddRowResult'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      return await addRow(dependencies.supabase, params as AddRowParams);
    },
    ['supabase']
  );

  // Example of a non-database function that doesn't need Supabase
  registerFunction(
    {
      name: 'formatDate',
      displayName: 'Format Date',
      description: 'Format a date using specified format',
      category: 'Utilities',
      parameters: [
        {
          name: 'date',
          type: 'string',
          description: 'Date string or ISO date',
          required: true
        },
        {
          name: 'format',
          type: 'string',
          description: 'Format pattern (e.g., "yyyy-MM-dd")',
          required: false,
          defaultValue: 'yyyy-MM-dd'
        }
      ],
      returnType: 'string'
    },
    async (params: Record<string, any>, dependencies: FunctionDependencies) => {
      try {
        const date = new Date(params.date);
        
        // Very simple formatting implementation
        // In a real app, you might use a library like date-fns
        const format = params.format || 'yyyy-MM-dd';
        
        // Return ISO string if we can't parse the date
        if (isNaN(date.getTime())) {
          return params.date;
        }
        
        // Simple formatting logic
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        return format
          .replace('yyyy', year.toString())
          .replace('MM', month)
          .replace('dd', day);
      } catch (err) {
        return params.date; // Return original if formatting fails
      }
    },
    [] // No dependencies needed
  );
} 