/**
 * Text formatting options
 */
export type TextCaseOption = 'title' | 'sentence' | 'normal' | 'lower' | 'upper';

export interface TextFormatterOptions {
  /**
   * Text case to apply after normalization
   * - title: First Letter Of Each Word Capitalized
   * - sentence: First letter of first word capitalized
   * - normal: No case transformation after normalization
   * - lower: all text lowercase
   * - upper: ALL TEXT UPPERCASE
   */
  textCase?: TextCaseOption;
  
  /**
   * Map of words to replace with specific formatting
   * Example: { 'api': 'API', 'ui': 'UI' }
   */
  wordReplacements?: Record<string, string>;
  
  /**
   * Whether to trim the result
   */
  trim?: boolean;
}

/**
 * Default word replacements for common acronyms and terms
 */
export const DEFAULT_WORD_REPLACEMENTS: Record<string, string> = {
  'api': 'API',
  'apis': 'APIs',
  'ui': 'UI',
  'url': 'URL',
  'urls': 'URLs',
  'uri': 'URI',
  'uris': 'URIs',
  'ux': 'UX',
  'qr': 'QR',
  'id': 'ID',
  'ids': 'IDs',
  'sso': 'SSO',
  'oauth': 'OAuth',
  'sdk': 'SDK',
  'sdks': 'SDKs',
  'jwt': 'JWT',
  'http': 'HTTP',
  'https': 'HTTPS',
  'html': 'HTML',
  'css': 'CSS',
  'json': 'JSON',
  'xml': 'XML',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'ip': 'IP',
  'ftp': 'FTP',
  'ssh': 'SSH',
  'cdn': 'CDN',
  'saas': 'SaaS',
  'paas': 'PaaS',
  'iaas': 'IaaS',
  'iot': 'IoT',
  'ai': 'AI',
  'ml': 'ML',
  'ci': 'CI',
  'cd': 'CD',
};

/**
 * Default options for text formatting
 */
const DEFAULT_OPTIONS: TextFormatterOptions = {
  textCase: 'title',
  wordReplacements: DEFAULT_WORD_REPLACEMENTS,
  trim: true,
};

/**
 * Formats text by normalizing case styles, applying case transformations,
 * and replacing specific words with custom formatting.
 * 
 * @param text The input text to format
 * @param options Formatting options
 * @returns Formatted text
 */
export function formatText(text: string, options: TextFormatterOptions = {}): string {
  // Merge provided options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Handle empty text
  if (!text) return '';
  
  // Step 1: Normalize various case styles to space-separated words
  let normalized = text
    // Convert snake_case to space-separated
    .replace(/_/g, ' ')
    // Convert kebab-case to space-separated
    .replace(/-/g, ' ')
    // Convert camelCase and PascalCase to space-separated
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ');
  
  // Step 2: Apply trim if needed
  if (opts.trim) {
    normalized = normalized.trim();
  }
  
  // Step 3: Apply the specified text case
  let caseTransformed = normalized;
  switch (opts.textCase) {
    case 'title':
      caseTransformed = normalized.replace(/\w\S*/g, (word) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
      break;
    case 'sentence':
      if (normalized.length > 0) {
        caseTransformed = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
      }
      break;
    case 'lower':
      caseTransformed = normalized.toLowerCase();
      break;
    case 'upper':
      caseTransformed = normalized.toUpperCase();
      break;
    case 'normal':
    default:
      // No case transformation
      break;
  }
  
  // Step 4: Apply word replacements if provided
  let result = caseTransformed;
  if (opts.wordReplacements) {
    Object.entries(opts.wordReplacements).forEach(([key, value]) => {
      // Create a regex that matches the key as a whole word (case insensitive)
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, value);
    });
  }
  
  return result;
}

/**
 * Creates a pre-configured formatter function with specific options
 * 
 * @param defaultOptions Default options for the formatter
 * @returns A formatter function with the specified default options
 */
export function createFormatter(defaultOptions: TextFormatterOptions = {}) {
  return (text: string, overrideOptions: TextFormatterOptions = {}) => 
    formatText(text, { ...defaultOptions, ...overrideOptions });
}

// Some pre-configured formatters for common use cases
export const formatTitleCase = createFormatter({ textCase: 'title' });
export const formatSentenceCase = createFormatter({ textCase: 'sentence' });
export const formatNormalCase = createFormatter({ textCase: 'normal' });
export const formatUpperCase = createFormatter({ textCase: 'upper' });
export const formatLowerCase = createFormatter({ textCase: 'lower' });
export const formatWithoutReplacements = createFormatter({ wordReplacements: {} });