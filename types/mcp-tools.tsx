// Tool type definition

export interface Tool {
    id: string;           // The actual tool identifier used for tool calls (from database 'name' field)
    name: string;         // Same as id for backward compatibility
    displayName: string;  // Human-readable name for display (formatted from tool identifier)
    description: string;
    category: string;
    icon: React.ReactNode;
}

// Extended interface for database tools (includes additional fields from database)
export interface DatabaseTool {
    id: string;
    name: string;
    description: string;
    parameters: any;
    output_schema?: any;
    annotations?: any[];
    function_path: string;
    category?: string;
    tags?: string[];
    icon?: string;
    is_active?: boolean;
    version?: string;
    created_at?: string;
    updated_at?: string;
}

