interface DecisionNode {
  id: string;
  question?: string;
  action?: string;
  description?: string;
  yes?: DecisionNode;
  no?: DecisionNode;
  type?: 'question' | 'action' | 'info';
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  estimatedTime?: string;
}

interface DecisionTreeData {
  title: string;
  description?: string;
  root: DecisionNode;
}

/**
 * Parses JSON content into structured decision tree data
 * 
 * Expected JSON format:
 * {
 *   "decision_tree": {
 *     "title": "Bug Diagnosis Guide",
 *     "description": "Step-by-step bug diagnosis workflow",
 *     "root": {
 *       "question": "Is the error reproducible?",
 *       "yes": {
 *         "question": "Does it happen in production?",
 *         "yes": {"action": "Create hotfix immediately"},
 *         "no": {"action": "Log as development issue"}
 *       },
 *       "no": {"action": "Monitor and collect more data"}
 *     }
 *   }
 * }
 */
export function parseDecisionTreeJSON(content: string): DecisionTreeData {
  try {
    // First, try to extract JSON from markdown code blocks
    let jsonContent = content.trim();
    
    // Remove markdown code block syntax if present
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonContent);
    
    // Extract decision tree data
    const treeData = parsed.decision_tree || parsed;
    
    if (!treeData) {
      throw new Error('No decision tree data found in JSON');
    }
    
    // Validate required fields
    if (!treeData.title || !treeData.root) {
      throw new Error('Missing required fields: title or root');
    }
    
    // Process and assign IDs to nodes
    const processedRoot = processNode(treeData.root, 'root');
    
    return {
      title: treeData.title,
      description: treeData.description,
      root: processedRoot
    };
    
  } catch (error) {
    console.error('Error parsing decision tree JSON:', error);
    throw new Error(`Failed to parse decision tree JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Recursively processes a node and assigns IDs
 */
function processNode(node: any, id: string): DecisionNode {
  if (!node) {
    throw new Error('Invalid node structure');
  }
  
  // Determine node type
  let type: DecisionNode['type'] = 'info';
  if (node.question) type = 'question';
  else if (node.action) type = 'action';
  
  // Process child nodes
  let yesNode: DecisionNode | undefined;
  let noNode: DecisionNode | undefined;
  
  if (node.yes) {
    yesNode = processNode(node.yes, `${id}-yes`);
  }
  
  if (node.no) {
    noNode = processNode(node.no, `${id}-no`);
  }
  
  return {
    id,
    question: node.question,
    action: node.action,
    description: node.description,
    yes: yesNode,
    no: noNode,
    type,
    priority: node.priority && ['low', 'medium', 'high'].includes(node.priority) ? node.priority : undefined,
    category: node.category,
    estimatedTime: node.estimatedTime
  };
}

/**
 * Validates that the parsed decision tree has the minimum required structure
 */
export function validateDecisionTree(tree: DecisionTreeData): boolean {
  if (!tree.title || !tree.root) {
    return false;
  }
  
  // Validate node structure recursively
  const validateNode = (node: DecisionNode): boolean => {
    if (!node.id) return false;
    
    // Must have either question or action
    if (!node.question && !node.action) return false;
    
    // If it's a question node, it should have at least one child
    if (node.question && !node.yes && !node.no) return false;
    
    // Validate child nodes
    if (node.yes && !validateNode(node.yes)) return false;
    if (node.no && !validateNode(node.no)) return false;
    
    return true;
  };
  
  return validateNode(tree.root);
}

/**
 * Creates a sample decision tree for testing/demo purposes
 */
export function createSampleDecisionTree(): DecisionTreeData {
  return {
    title: 'Bug Diagnosis Guide',
    description: 'Step-by-step workflow for diagnosing and handling software bugs',
    root: {
      id: 'root',
      question: 'Is the error reproducible?',
      description: 'Can you consistently reproduce the error with the same steps?',
      type: 'question',
      priority: 'high',
      yes: {
        id: 'root-yes',
        question: 'Does it happen in production?',
        description: 'Is this error occurring in the live production environment?',
        type: 'question',
        priority: 'high',
        yes: {
          id: 'root-yes-yes',
          action: 'Create hotfix immediately',
          description: 'This is a critical production issue that needs immediate attention',
          type: 'action',
          priority: 'high',
          category: 'urgent',
          estimatedTime: '2-4 hours'
        },
        no: {
          id: 'root-yes-no',
          action: 'Log as development issue',
          description: 'Create a detailed bug report and assign to development team',
          type: 'action',
          priority: 'medium',
          category: 'development',
          estimatedTime: '30 minutes'
        }
      },
      no: {
        id: 'root-no',
        question: 'Are there any error logs or patterns?',
        description: 'Check if there are any logged errors or patterns that might help',
        type: 'question',
        priority: 'medium',
        yes: {
          id: 'root-no-yes',
          action: 'Analyze logs and monitor patterns',
          description: 'Review error logs and set up monitoring to capture more data',
          type: 'action',
          priority: 'medium',
          category: 'monitoring',
          estimatedTime: '1-2 hours'
        },
        no: {
          id: 'root-no-no',
          action: 'Monitor and collect more data',
          description: 'Set up additional logging and monitoring to gather more information',
          type: 'action',
          priority: 'low',
          category: 'monitoring',
          estimatedTime: '1 hour'
        }
      }
    }
  };
}

/**
 * Converts decision tree data back to JSON format
 */
export function decisionTreeToJSON(tree: DecisionTreeData): string {
  // Remove IDs and internal metadata for cleaner JSON
  const cleanNode = (node: DecisionNode): any => {
    const cleaned: any = {};
    
    if (node.question) cleaned.question = node.question;
    if (node.action) cleaned.action = node.action;
    if (node.description) cleaned.description = node.description;
    if (node.priority) cleaned.priority = node.priority;
    if (node.category) cleaned.category = node.category;
    if (node.estimatedTime) cleaned.estimatedTime = node.estimatedTime;
    
    if (node.yes) cleaned.yes = cleanNode(node.yes);
    if (node.no) cleaned.no = cleanNode(node.no);
    
    return cleaned;
  };
  
  const jsonData = {
    decision_tree: {
      title: tree.title,
      description: tree.description,
      root: cleanNode(tree.root)
    }
  };
  
  return JSON.stringify(jsonData, null, 2);
}

/**
 * Calculates statistics about the decision tree
 */
export function calculateTreeStatistics(tree: DecisionTreeData): {
  totalNodes: number;
  questionNodes: number;
  actionNodes: number;
  maxDepth: number;
  totalPaths: number;
} {
  const stats = {
    totalNodes: 0,
    questionNodes: 0,
    actionNodes: 0,
    maxDepth: 0,
    totalPaths: 0
  };
  
  const traverse = (node: DecisionNode, depth = 0) => {
    if (!node) return;
    
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    
    if (node.question) stats.questionNodes++;
    if (node.action) {
      stats.actionNodes++;
      stats.totalPaths++;
    }
    
    if (node.yes) traverse(node.yes, depth + 1);
    if (node.no) traverse(node.no, depth + 1);
  };
  
  traverse(tree.root);
  return stats;
}

/**
 * Finds all possible paths through the decision tree
 */
export function findAllPaths(tree: DecisionTreeData): Array<{
  path: string[];
  action: string;
  decisions: Array<{ question: string; choice: 'yes' | 'no' }>;
}> {
  const paths: Array<{
    path: string[];
    action: string;
    decisions: Array<{ question: string; choice: 'yes' | 'no' }>;
  }> = [];
  
  const traverse = (
    node: DecisionNode, 
    currentPath: string[] = [], 
    decisions: Array<{ question: string; choice: 'yes' | 'no' }> = []
  ) => {
    if (!node) return;
    
    const newPath = [...currentPath, node.id];
    
    if (node.action) {
      // This is a leaf node (action)
      paths.push({
        path: newPath,
        action: node.action,
        decisions: [...decisions]
      });
      return;
    }
    
    if (node.question) {
      // This is a decision node
      if (node.yes) {
        traverse(node.yes, newPath, [
          ...decisions, 
          { question: node.question, choice: 'yes' }
        ]);
      }
      
      if (node.no) {
        traverse(node.no, newPath, [
          ...decisions, 
          { question: node.question, choice: 'no' }
        ]);
      }
    }
  };
  
  traverse(tree.root);
  return paths;
}

/**
 * Attempts to parse either JSON or create from template
 */
export function parseDecisionTreeContent(content: string): DecisionTreeData {
  // First try to parse as JSON
  try {
    return parseDecisionTreeJSON(content);
  } catch (jsonError) {
    // If JSON parsing fails, create a simple decision tree
    console.warn('JSON parsing failed, creating simple decision tree:', jsonError);
    
    return {
      title: 'Decision Tree',
      description: 'Generated from content',
      root: {
        id: 'root',
        question: 'Do you need help with this decision?',
        type: 'question',
        yes: {
          id: 'root-yes',
          action: 'Review the available options and make an informed choice',
          type: 'action'
        },
        no: {
          id: 'root-no',
          action: 'Proceed with confidence in your decision',
          type: 'action'
        }
      }
    };
  }
}
