// Tool type definition
import * as LucideIcons from "lucide-react";

export interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: React.ReactNode;
}

export const allTools: Tool[] = [
    {
        id: "code_python_execute",
        name: "Python Execute",
        description: "Executes Python code and returns the output or error.",
        category: "Code",
        icon: <LucideIcons.Play size={20} />,
    },
    {
        id: "code_web_store_html",
        name: "Web Store Html",
        description: "Stores HTML with React and Tailwind CSS for display in the frontend.",
        category: "Code",
        icon: <LucideIcons.FileCode size={20} />,
    },
    {
        id: "code_fetcher_fetch",
        name: "Fetcher Fetch",
        description: "Fetches and analyzes code from a directory within a project root, returning formatted text based on the selected output type.",
        category: "Code",
        icon: <LucideIcons.Download size={20} />,
    },
    {
        id: "api_news_fetch_headlines",
        name: "News Fetch Headlines",
        description: "Fetches the top news headlines for a specified country.",
        category: "Api",
        icon: <LucideIcons.Newspaper size={20} />,
    },
    {
        id: "core_math_calculate",
        name: "Math Calculate",
        description: "Evaluates a mathematical expression with basic arithmetic and trigonometric functions.",
        category: "Core",
        icon: <LucideIcons.Calculator size={20} />,
    },
    {
        id: "core_web_search",
        name: "Web Search",
        description: "Searches the web for recent events, news or any topic.",
        category: "Core",
        icon: <LucideIcons.Search size={20} />,
    },
    {
        id: "core_web_read_web_pages",
        name: "Web Read Web Pages",
        description: "Reads the text content of provided URLs.",
        category: "Core",
        icon: <LucideIcons.Globe size={20} />,
    },
    {
        id: "core_web_search_and_read",
        name: "Web Search And Read",
        description: "Searches the web for recent events, news or any topic and read the result pages",
        category: "Core",
        icon: <LucideIcons.SearchCheck size={20} />,
    },
    {
        id: "data_sql_execute_query",
        name: "Sql Execute Query",
        description: "Execute a raw SQL query against a specified database. Handles INSERT, UPDATE, DELETE, and SELECT operations and returns the query results.",
        category: "Data",
        icon: <LucideIcons.Database size={20} />,
    },
    {
        id: "data_sql_list_tables",
        name: "Sql List Tables",
        description: "List all tables in a specified schema from the supabase_automation_matrix database. Use to discover available tables before querying.",
        category: "Data",
        icon: <LucideIcons.Table size={20} />,
    },
    {
        id: "data_sql_get_table_schema",
        name: "Sql Get Table Schema",
        description: "Get detailed schema information for a specific table in the supabase_automation_matrix database. Returns column names, data types, nullability, and defaults.",
        category: "Data",
        icon: <LucideIcons.TableProperties size={20} />,
    },
    {
        id: "data_sql_create_user_generated_table_data",
        name: "Sql Create User Generated Table Data",
        description: "Create a new table with user-provided data in the supabase_automation_matrix database.",
        category: "Data",
        icon: <LucideIcons.Plus size={20} />,
    },
    {
        id: "data_user_lists_create_list",
        name: "User Lists Create List",
        description: "Create a new list with multiple items. Use when you need to create a detailed list with items that have descriptions, help text, or grouping. The user_id is automatically supplied by the system. IMPORTANT: The contents of these tables are often used to create forms, so it's best to include most or all fields for list items.",
        category: "Data",
        icon: <LucideIcons.ListPlus size={20} />,
    },
    {
        id: "data_user_form_list_options",
        name: "User Form List Options",
        description: "Create a list specifically for UI form elements like dropdowns, radio buttons, or checkboxes. This tool is optimized for generating form options that will be directly used in the UI. You MUST provide ALL metadata fields for each item to ensure proper form rendering. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.FormInput size={20} />,
    },
    {
        id: "data_user_lists_create_simple_list",
        name: "User Lists Create Simple List",
        description: "Create a simple list with just text labels. Perfect for quick lists, checklists, or bullet points without detailed metadata. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.List size={20} />,
    },
    {
        id: "data_user_lists_get_user_lists",
        name: "User Lists Get User Lists",
        description: "Get a paginated list of all lists belonging to a user. Use to browse or search through a user's lists. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.FolderOpen size={20} />,
    },
    {
        id: "data_user_lists_get_list_details",
        name: "User Lists Get List Details",
        description: "Get detailed information about a specific list, including all its items. Use when you need to see the full contents of a list. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.Eye size={20} />,
    },
    {
        id: "data_user_lists_update_list_item",
        name: "User Lists Update List Item",
        description: "Update a specific item in a list. Use to modify the content or organization of a list item. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.Edit size={20} />,
    },
    {
        id: "data_user_lists_batch_update_items",
        name: "User Lists Batch Update Items",
        description: "Update multiple items in a list in a single operation. Useful for bulk edits or reorganizing items. The user_id is automatically supplied by the system.",
        category: "Data",
        icon: <LucideIcons.EditIcon size={20} />,
    },
    {
        id: "seo_check_meta_titles",
        name: "Check Meta Titles",
        description: "Analyze meta titles for pixel width, character count, and SEO compliance. Checks against Google's display limits for desktop (580px), mobile (920px), and SEO character limit (60 chars).",
        category: "Seo",
        icon: <LucideIcons.Braces size={20} />,
    },
    {
        id: "seo_check_meta_descriptions",
        name: "Check Meta Descriptions",
        description: "Analyze meta descriptions for pixel width, character count, and SEO compliance. Checks against Google's display limits for desktop (920px) and SEO character limit (160 chars).",
        category: "Seo",
        icon: <LucideIcons.Braces size={20} />,
    },
    {
        id: "seo_check_meta_tags_batch",
        name: "Check Meta Tags Batch",
        description: "Analyze arrays of meta title and description pairs for comprehensive SEO compliance. Returns simplified analysis with boolean flags for easy validation.",
        category: "Seo",
        icon: <LucideIcons.Braces size={20} />,
    },
    {
        id: "text_analyze",
        name: "Analyze",
        description: "Analyzes text and returns word count, sentence count, and character count.",
        category: "Text",
        icon: <LucideIcons.BarChart3 size={20} />,
    },
    {
        id: "text_regex_extract",
        name: "Regex Extract",
        description: "Extracts all matches of a regex pattern from text.",
        category: "Text",
        icon: <LucideIcons.Filter size={20} />,
    }
];
