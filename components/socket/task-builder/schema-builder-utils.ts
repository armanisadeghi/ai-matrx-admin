import { getAvailableServices, getTasksForService, Schema } from "@/constants/socket-schema"; // Adjust path to your helper functions

// Define types for schema field
export interface SchemaField {
  name: string;
  REQUIRED: boolean;
  DEFAULT: any;
  VALIDATION: string | null;
  DATA_TYPE: string;
  CONVERSION: string | null;
  REFERENCE: string | null;
  COMPONENT: string;
  COMPONENT_PROPS: Record<string, any>;
  ICON_NAME: string;
  DESCRIPTION: string;
}

// Define types for the schema
interface SchemaOutput {
  [key: string]: {
    REQUIRED: boolean;
    DEFAULT: any;
    VALIDATION: string | null;
    DATA_TYPE: string;
    CONVERSION: string | null;
    REFERENCE: string | null;
    COMPONENT: string;
    COMPONENT_PROPS: Record<string, any>;
    ICON_NAME: string;
    DESCRIPTION: string;
  };
}

// Interface for reference options
export interface ReferenceOption {
  value: string;
  label: string;
}

// Generate reference options dynamically from SOCKET_TASKS
export const getReferenceOptions = (): ReferenceOption[] => {
  const services = getAvailableServices();
  const taskOptions: ReferenceOption[] = services.flatMap((service) =>
    getTasksForService(service.value).map((task) => ({
      value: task.value,
      label: `${service.label} - ${task.label}`,
    }))
  );

  // Collect all schema names from SOCKET_TASKS
  const socketTasks = Object.keys(require("@/constants/socket-schema").SOCKET_TASKS); // Adjust to access SOCKET_TASKS

  // Collect unique references by scanning schemas
  const referencedSchemas = new Set<string>();
  socketTasks.forEach((taskName) => {
    const schema = require("@/constants/socket-schema").getTaskSchema(taskName);
    if (schema) {
      Object.values(schema).forEach((field: any) => {
        if (field.REFERENCE && typeof field.REFERENCE === "string") {
          referencedSchemas.add(field.REFERENCE);
        }
      });
    }
  });

  // Convert referenced schemas to options, using the schema name as a fallback label
  const referenceOptions: ReferenceOption[] = Array.from(referencedSchemas).map((schemaName) => ({
    value: schemaName,
    label: schemaName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" "),
  }));

  // Combine task options and reference options, ensuring "None" is first
  return [{ value: "", label: "None" }, ...taskOptions, ...referenceOptions];
};

// Convert fields to schema object
export const fieldsToSchema = (fields: SchemaField[]): SchemaOutput => {
  const schema: SchemaOutput = {};
  fields.forEach((field) => {
    if (!field.name) return; // Skip empty field names
    schema[field.name] = {
      REQUIRED: field.REQUIRED,
      DEFAULT: field.DEFAULT === "" ? null : field.DEFAULT,
      VALIDATION: field.VALIDATION || null,
      DATA_TYPE: field.DATA_TYPE,
      CONVERSION: field.CONVERSION || null,
      REFERENCE: field.REFERENCE || null,
      COMPONENT: field.COMPONENT,
      COMPONENT_PROPS: field.COMPONENT_PROPS,
      ICON_NAME: field.ICON_NAME,
      DESCRIPTION: field.DESCRIPTION,
    };
  });
  return schema;
};

// Generate Python code from schema
export const generatePythonCode = (schema: SchemaOutput): string => {
  let code = `export const SCHEMA_NAME: Schema = {\n`;
  Object.entries(schema).forEach(([key, value]) => {
    code += `    ${key}: {\n`;
    code += `        REQUIRED: ${value.REQUIRED},\n`;
    if (typeof value.DEFAULT === "string" && value.DEFAULT.startsWith("socket_internal_")) {
      code += `        DEFAULT: "${value.DEFAULT}",\n`;
    } else {
      code += `        DEFAULT: ${JSON.stringify(value.DEFAULT)},\n`;
    }
    code += `        VALIDATION: ${value.VALIDATION === null ? "null" : `"${value.VALIDATION}"`},\n`;
    code += `        DATA_TYPE: "${value.DATA_TYPE}",\n`;
    code += `        CONVERSION: ${value.CONVERSION === null ? "null" : `"${value.CONVERSION}"`},\n`;
    code += `        REFERENCE: ${value.REFERENCE === null ? "null" : value.REFERENCE},\n`;
    code += `        COMPONENT: "${value.COMPONENT}",\n`;
    code += `        COMPONENT_PROPS: {},\n`;
    code += `        ICON_NAME: "${value.ICON_NAME}",\n`;
    code += `        DESCRIPTION: "${value.DESCRIPTION}",\n`;
    code += `    },\n`;
  });
  code += `};\n`;
  return code;
};

// Default field template
export const getDefaultField = (): SchemaField => ({
  name: "",
  REQUIRED: false,
  DEFAULT: null,
  VALIDATION: null,
  DATA_TYPE: "string",
  CONVERSION: null,
  REFERENCE: null,
  COMPONENT: "Input",
  COMPONENT_PROPS: {},
  ICON_NAME: "Key",
  DESCRIPTION: "",
});