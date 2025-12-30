/**
 * Cost calculation utilities for AI runs and tasks
 * 
 * Note: This is a simplified implementation. In production, you would:
 * 1. Fetch pricing from a database table or API
 * 2. Handle different pricing tiers (e.g., batch vs real-time)
 * 3. Account for regional pricing variations
 * 4. Track pricing changes over time
 */

interface PricingInfo {
  provider: string;
  model: string;
  input_cost_per_1k: number;  // Cost per 1000 input tokens
  output_cost_per_1k: number; // Cost per 1000 output tokens
  cache_read_cost_per_1k?: number; // For models with caching
  cache_write_cost_per_1k?: number;
}

/**
 * Simplified pricing table (prices in USD per 1000 tokens)
 * In production, this would come from a database table
 */
const PRICING_TABLE: Record<string, PricingInfo> = {
  // OpenAI
  'gpt-4o': { provider: 'openai', model: 'gpt-4o', input_cost_per_1k: 0.0025, output_cost_per_1k: 0.01 },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', input_cost_per_1k: 0.00015, output_cost_per_1k: 0.0006 },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo', input_cost_per_1k: 0.01, output_cost_per_1k: 0.03 },
  'o1': { provider: 'openai', model: 'o1', input_cost_per_1k: 0.015, output_cost_per_1k: 0.06 },
  'o1-mini': { provider: 'openai', model: 'o1-mini', input_cost_per_1k: 0.003, output_cost_per_1k: 0.012 },
  
  // Anthropic
  'claude-sonnet-4': { provider: 'anthropic', model: 'claude-sonnet-4', input_cost_per_1k: 0.003, output_cost_per_1k: 0.015 },
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', input_cost_per_1k: 0.003, output_cost_per_1k: 0.015 },
  'claude-3-5-haiku-20241022': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', input_cost_per_1k: 0.001, output_cost_per_1k: 0.005 },
  'claude-3-opus-20240229': { provider: 'anthropic', model: 'claude-3-opus-20240229', input_cost_per_1k: 0.015, output_cost_per_1k: 0.075 },
  
  // Google
  'gemini-2.0-flash-exp': { provider: 'google', model: 'gemini-2.0-flash-exp', input_cost_per_1k: 0, output_cost_per_1k: 0 },
  'gemini-exp-1206': { provider: 'google', model: 'gemini-exp-1206', input_cost_per_1k: 0, output_cost_per_1k: 0 },
  'gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro', input_cost_per_1k: 0.00125, output_cost_per_1k: 0.005 },
  'gemini-1.5-flash': { provider: 'google', model: 'gemini-1.5-flash', input_cost_per_1k: 0.000075, output_cost_per_1k: 0.0003 },
};

/**
 * Calculate cost for a task based on tokens
 */
export function calculateTaskCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING_TABLE[model];
  
  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`);
    return 0;
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input_cost_per_1k;
  const outputCost = (outputTokens / 1000) * pricing.output_cost_per_1k;
  
  return inputCost + outputCost;
}

/**
 * Estimate tokens from text (rough approximation)
 * Real implementation would use a tokenizer library
 */
export function estimateTokens(text: string): number {
  // Very rough estimate: ~4 characters per token on average
  // This varies by model and language
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost from text if tokens not available
 */
export function calculateCostFromText(
  model: string,
  inputText: string,
  outputText: string
): number {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  
  return calculateTaskCost(model, inputTokens, outputTokens);
}

/**
 * Format cost for display
 */
export function formatCost(cost: number | null | undefined): string {
  if (cost == null || cost === 0) return 'Free';
  if (cost < 0.001) return '< $0.001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Get pricing info for a model
 */
export function getModelPricing(model: string): PricingInfo | null {
  return PRICING_TABLE[model] || null;
}

/**
 * Check if a model is free
 */
export function isModelFree(model: string): boolean {
  const pricing = PRICING_TABLE[model];
  return pricing ? pricing.input_cost_per_1k === 0 && pricing.output_cost_per_1k === 0 : false;
}

/**
 * Calculate estimated cost for a run (sum of all task costs)
 */
export function calculateRunCost(tasks: Array<{ 
  tokens_input?: number | null; 
  tokens_output?: number | null; 
  model?: string | null; 
}>): number {
  return tasks.reduce((total, task) => {
    if (!task.model || !task.tokens_input || !task.tokens_output) {
      return total;
    }
    return total + calculateTaskCost(task.model, task.tokens_input, task.tokens_output);
  }, 0);
}

/**
 * Batch calculate costs for multiple tasks (useful for backfilling)
 */
export async function batchCalculateCosts(tasks: Array<{
  id: string;
  model?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  response_text?: string | null;
}>): Promise<Array<{ taskId: string; cost: number }>> {
  return tasks.map(task => {
    let cost = 0;
    
    if (task.model && task.tokens_input && task.tokens_output) {
      cost = calculateTaskCost(task.model, task.tokens_input, task.tokens_output);
    } else if (task.model && task.response_text) {
      // Fallback: estimate from text
      cost = calculateCostFromText(task.model, '', task.response_text);
    }
    
    return {
      taskId: task.id,
      cost,
    };
  });
}

