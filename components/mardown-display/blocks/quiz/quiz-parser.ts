/**
 * Quiz Parser and Hash Utilities
 * Handles parsing quiz JSON with content hashing
 */

import type { OriginalQuestion } from './quiz-types';

export type QuizData = {
  questions: OriginalQuestion[];
  title: string;
  category?: string;
  contentHash: string;
};

export type RawQuizJSON = {
  quiz_title: string;
  category?: string;
  multiple_choice: Array<{
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
 * Parse quiz JSON
 */
export async function parseQuizJSON(jsonData: RawQuizJSON): Promise<QuizData> {
  // Get questions from multiple_choice array
  const questions = [...jsonData.multiple_choice];
  
  // Sort by ID for consistency
  questions.sort((a, b) => a.id - b.id);
  
  // Generate content hash
  const contentHash = await generateQuizHash(questions);
  
  return {
    questions,
    title: jsonData.quiz_title,
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
  
  // Must have quiz_title
  if (!data.quiz_title || typeof data.quiz_title !== 'string') {
    return false;
  }
  
  // Must have multiple_choice array with questions
  if (!Array.isArray(data.multiple_choice) || data.multiple_choice.length === 0) {
    return false;
  }
  
  // Validate question structure
  return data.multiple_choice.every((q: any) => 
    typeof q.id === 'number' &&
    typeof q.question === 'string' &&
    Array.isArray(q.options) &&
    q.options.length > 0 &&
    typeof q.correctAnswer === 'number' &&
    typeof q.explanation === 'string'
  );
}

