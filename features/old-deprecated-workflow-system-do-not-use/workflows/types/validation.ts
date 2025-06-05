// Validation types for workflow editor

export interface ValidationEngine {
  validateWorkflow: (workflow: any) => WorkflowValidationResult;
  validateStep: (step: any) => StepValidationResult;
  validateBrokerConnections: (connections: any) => BrokerValidationResult[];
  validateArguments: (args: any[], functionDef: any) => ArgumentValidationResult[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100 quality score
}

export interface StepValidationResult {
  stepId: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface BrokerValidationResult {
  brokerId: string;
  isValid: boolean;
  issues: ValidationIssue[];
  dataFlowAnalysis: DataFlowAnalysis;
}

export interface ArgumentValidationResult {
  argumentName: string;
  isValid: boolean;
  issues: ValidationIssue[];
  typeCheck: TypeCheckResult;
}

export interface ValidationError {
  id: string;
  type: 'missing_required_field' | 'invalid_broker_connection' | 'circular_dependency' | 'invalid_function_id' | 'type_mismatch' | 'missing_dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  nodeId?: string;
  stepName?: string;
  field?: string;
  suggestedFix?: string;
}

export interface ValidationWarning {
  id: string;
  type: 'unused_broker' | 'missing_optional_field' | 'performance_concern' | 'best_practice' | 'deprecated_usage';
  message: string;
  nodeId?: string;
  stepName?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ValidationSuggestion {
  id: string;
  type: 'optimization' | 'best_practice' | 'alternative_approach' | 'feature_enhancement';
  message: string;
  nodeId?: string;
  actionable: boolean;
  estimatedImpact: 'high' | 'medium' | 'low';
  implementationComplexity: 'easy' | 'medium' | 'hard';
}

export interface ValidationIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    nodeId?: string;
    field?: string;
    line?: number;
  };
}

export interface DataFlowAnalysis {
  hasProducers: boolean;
  hasConsumers: boolean;
  isOrphaned: boolean;
  flowPath: string[];
  potentialBottlenecks: string[];
}

export interface TypeCheckResult {
  expectedType: string;
  actualType: string;
  isCompatible: boolean;
  conversionRequired: boolean;
  conversionSuggestion?: string;
}

// Validation rule definitions
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'data_flow' | 'performance' | 'security' | 'best_practice';
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  validator: (context: ValidationContext) => ValidationResult;
}

export interface ValidationContext {
  workflow: any;
  currentStep?: any;
  brokerConnections?: Map<string, any>;
  functionDefinitions?: Map<string, any>;
  recipeDefinitions?: Map<string, any>;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
}

// Built-in validation rules
export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'required_fields',
    name: 'Required Fields Check',
    description: 'Ensures all required fields are populated',
    category: 'structure',
    severity: 'critical',
    enabled: true,
    validator: (context) => ({ passed: true, issues: [], suggestions: [] }) // Implementation would go here
  },
  {
    id: 'broker_connectivity',
    name: 'Broker Connectivity',
    description: 'Validates broker connections and data flow',
    category: 'data_flow',
    severity: 'high',
    enabled: true,
    validator: (context) => ({ passed: true, issues: [], suggestions: [] })
  },
  {
    id: 'circular_dependencies',
    name: 'Circular Dependency Detection',
    description: 'Detects circular dependencies in workflow steps',
    category: 'structure',
    severity: 'critical',
    enabled: true,
    validator: (context) => ({ passed: true, issues: [], suggestions: [] })
  },
  {
    id: 'performance_optimization',
    name: 'Performance Optimization',
    description: 'Suggests performance improvements',
    category: 'performance',
    severity: 'medium',
    enabled: true,
    validator: (context) => ({ passed: true, issues: [], suggestions: [] })
  }
];

// Validation configuration
export interface ValidationConfig {
  enabledRules: string[];
  strictMode: boolean;
  autoFix: boolean;
  realTimeValidation: boolean;
  validationLevel: 'basic' | 'standard' | 'strict' | 'comprehensive';
} 