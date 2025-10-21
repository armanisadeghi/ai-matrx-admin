// Quiz System - Centralized Exports

// Main Component
export { default as MultipleChoiceQuiz } from './MultipleChoiceQuiz';
export type { Question } from './MultipleChoiceQuiz';

// Quiz Manager
export { default as QuizSessionList } from './QuizSessionList';

// Types
export type {
  OriginalQuestion,
  RandomizedQuestion,
  QuizAnswer,
  QuizProgress,
  QuizResults,
  QuizState,
  QuizExport,
  QuizResultsExport
} from './quiz-types';

// Parser Types
export type {
  QuizData,
  RawQuizJSON
} from './quiz-parser';

// Utilities
export {
  randomizeQuestion,
  randomizeQuestions,
  initializeQuizState,
  calculateResults,
  updateProgress,
  exportQuizState,
  exportQuizResults,
  importQuizState,
  downloadQuizState,
  downloadQuizResults,
  uploadQuizState,
  getIncorrectQuestions,
  createRetakeQuizState,
  formatTime,
  getPerformanceData
} from './quiz-utils';

// Parser Utilities
export {
  parseQuizJSON,
  parseQuizString,
  generateQuizHash,
  quizHashesMatch,
  isValidQuizData
} from './quiz-parser';

// Hook
export { useQuizPersistence } from '@/hooks/useQuizPersistence';
export type { QuizPersistenceOptions } from '@/hooks/useQuizPersistence';

// Actions
export {
  createQuizSession,
  updateQuizSession,
  getQuizSession,
  getUserQuizSessions,
  deleteQuizSession,
  updateQuizTitle,
  findExistingQuizByHash,
  type QuizSession
} from '@/actions/quiz.actions';

