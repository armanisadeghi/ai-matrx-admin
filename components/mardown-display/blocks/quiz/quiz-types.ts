/**
 * Core Quiz Types and State Management
 * Provides a centralized structure for quiz state, progress, and results
 */

// Original question format (from AI generation)
export type OriginalQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer in options array
  explanation: string;
};

// Randomized question with shuffled options
export type RandomizedQuestion = {
  id: number;
  question: string;
  options: string[]; // Shuffled options
  correctAnswerIndex: number; // Index of correct answer in shuffled options
  originalCorrectAnswer: number; // Original index before shuffling
  shuffleMap: number[]; // Maps shuffled index to original index
  explanation: string;
};

// User's answer for a question
export type QuizAnswer = {
  questionId: number;
  selectedOptionIndex: number; // Index in the shuffled options
  isCorrect: boolean;
  timestamp: number;
  timeSpent?: number; // Time spent on this question in seconds
};

// Quiz progress tracking
export type QuizProgress = {
  currentQuestionIndex: number;
  answers: Record<number, QuizAnswer>; // Key is question index
  startTime: number;
  lastUpdated: number;
  totalTimeSpent: number; // Total time spent on quiz in seconds
};

// Quiz results and statistics
export type QuizResults = {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  scorePercentage: number;
  completedAt: number;
  totalTimeSpent: number;
  incorrectQuestionIds: number[]; // IDs of questions answered incorrectly
};

// Complete quiz state
export type QuizState = {
  quizId: string; // Unique identifier for this quiz instance
  originalQuestions: OriginalQuestion[];
  randomizedQuestions: RandomizedQuestion[];
  progress: QuizProgress;
  results: QuizResults | null;
  mode: 'normal' | 'retake'; // Normal quiz or retaking missed questions
  retakeQuestionIds?: number[]; // IDs of questions to retake
};

// Export format for downloading quiz data
export type QuizExport = {
  exportVersion: string;
  exportDate: number;
  quizId: string;
  quizData: {
    originalQuestions: OriginalQuestion[];
    randomizedQuestions: RandomizedQuestion[];
  };
  progress: QuizProgress;
  results: QuizResults | null;
  mode: 'normal' | 'retake';
  retakeQuestionIds?: number[];
};

// Export format for results only (lighter weight)
export type QuizResultsExport = {
  exportVersion: string;
  exportDate: number;
  quizId: string;
  results: QuizResults;
  answers: Record<number, QuizAnswer>;
  questionsReview: Array<{
    questionId: number;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
};

