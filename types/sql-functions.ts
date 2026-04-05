import type { Database } from "@/types/database.types";

export type GetDatabaseFunctionsRow =
  Database["public"]["Functions"]["get_database_functions"]["Returns"][number];

function narrowSecurityType(
  raw: string,
): "SECURITY DEFINER" | "SECURITY INVOKER" {
  if (raw === "SECURITY DEFINER" || raw === "SECURITY INVOKER") {
    return raw;
  }
  throw new Error(`Invalid SQL function security_type: ${raw}`);
}

/** Maps RPC `get_database_functions` rows to app `SqlFunction` (narrows `security_type`). */
export function mapGetDatabaseFunctionsRow(
  row: GetDatabaseFunctionsRow,
): SqlFunction {
  return {
    name: row.name,
    schema: row.schema,
    arguments: row.arguments,
    returns: row.returns,
    definition: row.definition,
    security_type: narrowSecurityType(row.security_type),
  };
}

export function mapGetDatabaseFunctionsRows(
  rows: GetDatabaseFunctionsRow[],
): SqlFunction[] {
  return rows.map(mapGetDatabaseFunctionsRow);
}

export interface SqlFunction {
  id?: string;
  name: string;
  schema: string;
  arguments: string;
  argument_types?: string[];
  argument_names?: string[];
  argument_defaults?: string[];
  returns: string;
  language?: string;
  description?: string;
  security_type?: "SECURITY DEFINER" | "SECURITY INVOKER";
  definition?: string;
  owner?: string;
  created?: string;
  last_modified?: string;
}

export interface SqlFunctionFilter {
  name?: string;
  schema?: string;
  returnType?: string;
  argumentType?: string;
  securityType?: "SECURITY DEFINER" | "SECURITY INVOKER";
}

export interface SqlFunctionSort {
  field: "name" | "schema" | "returns" | "arguments" | "security_type";
  direction: "asc" | "desc";
}
