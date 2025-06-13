import { 
  Play, 
  Database, 
  Video, 
  FileText, 
  Workflow, 
  Brain, 
  Code, 
  Settings,
  Zap,
  Globe,
  User,
  Share2,
  Sparkles,
  ArrowRightLeft,
  type LucideIcon
} from "lucide-react";

import { DbNodeData, isUserInputNode, isBrokerRelayNode, isBaseFunctionNode, DbFunctionNode } from "@/features/workflows/types";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { getIconComponent } from "@/components/common/IconResolver";

/**
 * Mapping of specific function IDs to their custom icons
 * This allows for precise control over critical system functions
 */
const FUNCTION_ID_ICON_MAP: Record<string, LucideIcon> = {
  "2ac5576b-d1ab-45b1-ab48-4e196629fdd8": Brain,
  "8ff3af1c-3975-4a2d-89d1-0f799c784302": Sparkles,
  // Add more function ID mappings here as needed
};

/**
 * Fallback icon mapping based on function names, step names, or types
 * Used when no specific function ID mapping is found
 */
const KEYWORD_ICON_MAP: Array<{ keywords: string[], icon: LucideIcon }> = [
  { keywords: ['recipe', 'run'], icon: Play },
  { keywords: ['database', 'schema'], icon: Database },
  { keywords: ['video', 'youtube'], icon: Video },
  { keywords: ['pdf', 'document'], icon: FileText },
  { keywords: ['workflow', 'orchestrator'], icon: Workflow },
  { keywords: ['ai', 'brain'], icon: Brain },
  { keywords: ['code', 'function'], icon: Code },
  { keywords: ['web', 'url'], icon: Globe },
  { keywords: ['process', 'execute'], icon: Zap },
];

/**
 * Get the appropriate icon for a workflow node
 * Priority order:
 * 1. Specific function ID mapping (highest priority)
 * 2. Node type (user input, broker relay)
 * 3. Keyword matching on step name and function type
 * 4. Default icon (lowest priority)
 */
export function getWorkflowNodeIcon(nodeData: DbNodeData, type: string): LucideIcon {
  // Check for specific node types first
  if (type === "userInput") {
    return User;
  }
  
  if (type === "brokerRelay") {
    return ArrowRightLeft;
  }
  
  // For BaseNode types, check function ID mapping first
  if (type === "workflowNode" || type === "functionNode" || type === "recipeNode" || type === "registeredFunction") {
    const functionNodeData = nodeData as DbFunctionNode;
    const { combinedFunctions } = useCombinedFunctionsWithArgs();
    const coreFunction = combinedFunctions.find(func => func.id === functionNodeData.function_id);
    const icon = coreFunction?.icon;
    if (icon) {
      return getIconComponent(icon);
    }
    if (functionNodeData.function_id && FUNCTION_ID_ICON_MAP[functionNodeData.function_id]) {
      return FUNCTION_ID_ICON_MAP[functionNodeData.function_id];
    }
    
    // Priority 2: Check keyword matching
    const stepName = (functionNodeData.step_name || '').toLowerCase();
    const funcType = (functionNodeData.function_type || '').toLowerCase();
    
    for (const mapping of KEYWORD_ICON_MAP) {
      const hasMatch = mapping.keywords.some(keyword => 
        stepName.includes(keyword) || funcType.includes(keyword)
      );
      
      if (hasMatch) {
        return mapping.icon;
      }
    }
  }

  else {
    console.error(`Invalid node type: ${type}`);
  }
  
  // Default fallback
  return Settings;
}

/**
 * Add a new function ID to icon mapping
 * Useful for dynamically adding icons for new functions
 */
export function addFunctionIconMapping(functionId: string, icon: LucideIcon): void {
  FUNCTION_ID_ICON_MAP[functionId] = icon;
}

/**
 * Get all registered function icon mappings
 * Useful for debugging or displaying mappings in UI
 */
export function getFunctionIconMappings(): Record<string, LucideIcon> {
  return { ...FUNCTION_ID_ICON_MAP };
}

/**
 * Check if a function ID has a custom icon mapping
 */
export function hasFunctionIconMapping(functionId: string): boolean {
  return functionId in FUNCTION_ID_ICON_MAP;
} 