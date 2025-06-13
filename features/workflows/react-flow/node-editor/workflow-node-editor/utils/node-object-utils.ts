import { FunctionNode } from '@/features/workflows/types';
import { flexibleJsonParse, formatJson, JsonConversionResult } from '@/utils/json-utils';
import { validateNodeUpdate } from '@/features/workflows/utils/node-utils';
import { toast } from 'sonner';

// Interface for state updates
export interface NodeObjectState {
    jsonString: string;
    error: string | null;
    warnings: string[];
    hasChanges: boolean;
}

// Function to initialize JSON string from node
export const initializeJsonFromNode = (node: FunctionNode): string => {
    return JSON.stringify(node, null, 2);
};

// Function to handle JSON change
export const handleJsonChange = (
    value: string,
    setState: (updates: Partial<NodeObjectState>) => void
) => {
    setState({
        jsonString: value,
        hasChanges: true,
        error: null,
        warnings: []
    });
};

// Function to format and validate JSON
export const formatAndValidateJson = (
    jsonString: string,
    setState: (updates: Partial<NodeObjectState>) => void
) => {
    const result: JsonConversionResult = formatJson(jsonString);
    
    if (result.success && result.formattedJson) {
        setState({
            jsonString: result.formattedJson,
            error: null,
            warnings: result.warnings || []
        });
        
        if (result.warnings?.length) {
            toast.info(`JSON formatted with ${result.warnings.length} automatic fixes applied`);
        } else {
            toast.success('JSON formatted successfully');
        }
    } else {
        setState({
            error: result.error || 'Failed to format JSON',
            warnings: result.warnings || []
        });
        toast.error('Unable to format JSON: ' + (result.error || 'Unknown error'));
    }
};

// Function to apply changes
export const applyChanges = (
    jsonString: string,
    onNodeUpdate: (updatedNode: any) => void,
    setState: (updates: Partial<NodeObjectState>) => void
) => {
    // First, try to parse the JSON using our flexible parser
    const parseResult = flexibleJsonParse(jsonString);
    
    if (!parseResult.success) {
        setState({
            error: parseResult.error || 'Invalid JSON',
            warnings: parseResult.warnings || []
        });
        toast.error('Cannot apply changes: ' + (parseResult.error || 'Invalid JSON'));
        return;
    }

    try {
        const parsedNode = parseResult.data as FunctionNode;
        
        // Validate using our custom node validation
        validateNodeUpdate(parsedNode);
        
        // Apply the changes
        onNodeUpdate(parsedNode);
        setState({
            hasChanges: false,
            error: null,
            warnings: parseResult.warnings || []
        });
        
        toast.success('Node updated successfully');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Validation failed';
        setState({
            error: errorMessage
        });
        toast.error('Validation failed: ' + errorMessage);
    }
};

// Function to reset changes
export const resetChanges = (
    node: FunctionNode,
    setState: (updates: Partial<NodeObjectState>) => void
) => {
    setState({
        jsonString: JSON.stringify(node, null, 2),
        hasChanges: false,
        error: null,
        warnings: []
    });
    toast.info('Changes reset');
};

// Function to copy to clipboard
export const copyToClipboard = async (jsonString: string) => {
    try {
        await navigator.clipboard.writeText(jsonString);
        toast.success('JSON copied to clipboard');
    } catch (err) {
        toast.error('Failed to copy to clipboard');
    }
}; 