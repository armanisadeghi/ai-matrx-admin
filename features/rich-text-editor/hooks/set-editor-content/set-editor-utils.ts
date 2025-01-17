// File: set-editor-utils.ts

import { MatrxRecordId } from "@/types";


interface BrokerMatch {
  id: MatrxRecordId;
  name: string;
  defaultValue: string;
}

/**
 * Finds matching brokers for chip IDs
 */
export const findMatchingBrokers = async (chipIds: string[]): Promise<Map<string, BrokerMatch>> => {
  // TODO: Implement broker lookup logic
  // This should return a map of chip IDs to broker data
  return new Map();
};

/**
 * Identifies chip patterns in text and returns their positions
 */
export const findChipPatterns = (text: string) => {
  const chipPattern = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}!/g;
  const matches = [];
  
  let match;
  while ((match = chipPattern.exec(text)) !== null) {
    matches.push({
      id: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      originalText: match[0]
    });
  }
  
  return matches;
};

/**
 * Processes line for editor structure requirements
 */
export const processLine = (line: string, isFirstLine: boolean): HTMLElement => {
  const container = document.createElement(isFirstLine ? 'span' : 'div');
  
  if (line.trim() === '') {
    const br = document.createElement('br');
    container.appendChild(br);
  } else {
    container.textContent = line;
  }
  
  return container;
};

/**
 * Creates structured content preserving formatting
 */
export const createStructuredContent = (content: string): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const element = processLine(line, index === 0);
    fragment.appendChild(element);
  });
  
  return fragment;
};

