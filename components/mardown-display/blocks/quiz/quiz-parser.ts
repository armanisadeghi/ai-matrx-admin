/**
 * Quiz Parser and Hash Utilities
 * Handles parsing both old and new quiz formats
 */

import type { OriginalQuestion } from './quiz-types';

export type QuizData = {
  questions: OriginalQuestion[];
  title?: string;
  quizId?: string;
  category?: string;
  contentHash: string;
};

export type RawQuizJSON = {
  // New format fields
  quizId?: string;
  title?: string;
  category?: string;
  
  // Question arrays (new format can have both)
  multiple_choice?: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  questions?: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
};

/**
 * Generate a stable hash from quiz content
 * Uses only questions to create hash (ignoring metadata like title)
 */
export async function generateQuizHash(questions: OriginalQuestion[]): Promise<string> {
  // Create a stable string representation of questions
  // Sort by ID to ensure consistency
  const sortedQuestions = [...questions].sort((a, b) => a.id - b.id);
  
  const contentString = JSON.stringify(sortedQuestions.map(q => ({
    question: q.question.trim().toLowerCase(),
    options: q.options.map(o => o.trim().toLowerCase()).sort(),
    correctAnswer: q.correctAnswer
  })));

  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(contentString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Parse quiz JSON (supports both old and new formats)
 */
export async function parseQuizJSON(jsonData: RawQuizJSON): Promise<QuizData> {
  // Collect all questions from both possible arrays
  const allQuestions: OriginalQuestion[] = [];
  
  // Add questions from multiple_choice array (old and new format)
  if (Array.isArray(jsonData.multiple_choice)) {
    allQuestions.push(...jsonData.multiple_choice);
  }
  
  // Add questions from questions array (new format)
  if (Array.isArray(jsonData.questions)) {
    allQuestions.push(...jsonData.questions);
  }
  
  // Remove duplicates by ID (in case same question appears in both arrays)
  const uniqueQuestions = Array.from(
    new Map(allQuestions.map(q => [q.id, q])).values()
  );
  
  // Sort by ID for consistency
  uniqueQuestions.sort((a, b) => a.id - b.id);
  
  // Generate content hash
  const contentHash = await generateQuizHash(uniqueQuestions);
  
  return {
    questions: uniqueQuestions,
    title: jsonData.title,
    quizId: jsonData.quizId,
    category: jsonData.category,
    contentHash
  };
}

/**
 * Parse quiz from string (convenience wrapper)
 */
export async function parseQuizString(jsonString: string): Promise<QuizData> {
  const parsed = JSON.parse(jsonString);
  return parseQuizJSON(parsed);
}

/**
 * Check if two quiz hashes match
 */
export function quizHashesMatch(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Validate quiz data has required fields
 */
export function isValidQuizData(data: any): data is RawQuizJSON {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Must have at least one question array
  const hasMultipleChoice = Array.isArray(data.multiple_choice) && data.multiple_choice.length > 0;
  const hasQuestions = Array.isArray(data.questions) && data.questions.length > 0;
  
  if (!hasMultipleChoice && !hasQuestions) {
    return false;
  }
  
  // Validate question structure
  const questions = [...(data.multiple_choice || []), ...(data.questions || [])];
  return questions.every(q => 
    typeof q.id === 'number' &&
    typeof q.question === 'string' &&
    Array.isArray(q.options) &&
    typeof q.correctAnswer === 'number' &&
    typeof q.explanation === 'string'
  );
}

