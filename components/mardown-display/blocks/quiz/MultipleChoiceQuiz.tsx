import React, { useState } from 'react';
import { Check, X, Trophy, AlertTriangle, CheckCircle2, XCircle, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';

export type Question = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

interface MultipleChoiceQuizProps {
  questions: Question[];
}

// Component for expandable question text
const QuestionText: React.FC<{question: string, isFullScreen: boolean}> = ({ question, isFullScreen }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = question.length > 100;
  
  if (isFullScreen || !isLong) {
    return (
      <h2 className="text-base font-bold mb-2 leading-tight">
        {question}
      </h2>
    );
  }

  return (
    <div className="mb-2">
      <h2 className={`text-base font-bold leading-tight transition-all duration-200 ${
        isExpanded ? '' : 'line-clamp-2'
      }`}>
        {question}
      </h2>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Show full question</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Component for expandable explanation text
const ExplanationText: React.FC<{explanation: string, isCorrect: boolean}> = ({ explanation, isCorrect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = explanation.length > 120;
  
  if (!isLong) {
    return (
      <p className={`text-xs leading-relaxed ${
        isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
      }`}>
        {explanation}
      </p>
    );
  }

  return (
    <div>
      <p className={`text-xs leading-relaxed transition-all duration-200 ${
        isExpanded ? '' : 'line-clamp-3'
      } ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
        {explanation}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`mt-1 flex items-center gap-1 text-xs hover:underline transition-colors ${
          isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
        }`}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>Show less</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Read more</span>
          </>
        )}
      </button>
    </div>
  );
};

const MultipleChoiceQuiz: React.FC<MultipleChoiceQuizProps> = ({ questions }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];
  const isAnswered = selectedAnswer !== undefined;
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  // Calculate results
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.entries(answers).filter(
    ([qIndex, ansIndex]) => questions[qIndex].correctAnswer === ansIndex
  ).length;
  const incorrectCount = answeredCount - correctCount;
  const scorePercentage = answeredCount > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const handleOptionClick = (optionIndex) => {
    if (!isAnswered) {
      setAnswers({
        ...answers,
        [currentQuestionIndex]: optionIndex
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  const handleReviewAnswers = () => {
    setShowResults(false);
    setCurrentQuestionIndex(0);
  };

  const getOptionStyle = (optionIndex) => {
    const baseStyle = "p-3 rounded-lg border cursor-pointer transition-all duration-200 text-left";
    
    if (!isAnswered) {
      return `${baseStyle} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30`;
    } else {
      // After answer selected
      if (optionIndex === currentQuestion.correctAnswer) {
        return `${baseStyle} bg-green-100 dark:bg-green-950/40 border-green-400 dark:border-green-600 shadow-sm`;
      }
      if (selectedAnswer === optionIndex && !isCorrect) {
        return `${baseStyle} bg-red-100 dark:bg-red-950/40 border-red-400 dark:border-red-600 shadow-sm`;
      }
      return `${baseStyle} bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60`;
    }
  };

  // Results Screen
  if (showResults) {
    return (
      <div className="w-full py-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Quiz Complete!</h2>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Here's how you did:</p>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{scorePercentage}%</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Score</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{questions.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center border border-green-200 dark:border-green-800">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{correctCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Correct</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center border border-red-200 dark:border-red-800">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{incorrectCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Incorrect</div>
              </div>
            </div>

            {/* Unanswered Warning */}
            {answeredCount < questions.length && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800 rounded-lg p-2 mb-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300 text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>You skipped {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''}</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleReviewAnswers}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
              >
                Review Answers
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
              >
                Retry Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Screen
  return (
    <>
      {/* Blur backdrop when fullscreen */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}
      
      <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 flex items-center justify-center p-2' : 'py-3'}`}>
        <div className={`max-w-4xl mx-auto ${isFullScreen ? 'bg-white dark:bg-gray-900 rounded-xl shadow-2xl h-full max-h-[98vh] w-full flex flex-col overflow-hidden' : ''}`}>
          
          {/* Scrollable content area */}
          <div className={isFullScreen ? 'flex-1 overflow-y-auto p-3' : 'p-3'}>

        {/* Question Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700 rounded-xl p-4 mb-4 shadow-md">
          <div className="text-gray-800 dark:text-gray-100">
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                  Answered: {answeredCount}/{questions.length}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAnswered && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Answered</span>
                  </div>
                )}
                {!isFullScreen && (
                  <button
                    onClick={() => setIsFullScreen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium shadow-sm hover:bg-blue-600 dark:hover:bg-blue-700 transition-all"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Focus</span>
                  </button>
                )}
                {isFullScreen && (
                  <button
                    onClick={() => setIsFullScreen(false)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all"
                  >
                    <Minimize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Exit</span>
                  </button>
                )}
              </div>
            </div>
            {/* Question text - expandable on mobile */}
            <QuestionText 
              question={currentQuestion.question}
              isFullScreen={isFullScreen}
            />
          </div>
        </div>

        {/* Options Grid - 2 columns on md+ screens, 1 column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionClick(index)}
              className={getOptionStyle(index)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 leading-tight">
                  {option}
                </span>
                {isAnswered && index === currentQuestion.correctAnswer && (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
                {isAnswered && selectedAnswer === index && !isCorrect && (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Explanation - compact and expandable */}
        {isAnswered && (
          <div className={`mb-4 rounded-lg border transition-all duration-300 p-3 ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600'
              : 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600'
          }`}>
            <div className={`font-semibold mb-1.5 text-sm flex items-center gap-2 ${
              isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
            }`}>
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>Incorrect</span>
                </>
              )}
            </div>
            <ExplanationText 
              explanation={currentQuestion.explanation}
              isCorrect={isCorrect}
            />
          </div>
        )}
          </div>

        {/* Navigation Buttons - Fixed at bottom in fullscreen */}
        <div className={isFullScreen ? 'flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900' : ''}>
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`rounded-lg font-semibold transition-all duration-200 flex-1 px-3 py-2 text-sm ${
                currentQuestionIndex === 0
                  ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed text-gray-200 dark:text-gray-500'
                  : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-105'
              }`}
            >
              ← Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="rounded-lg font-semibold bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 flex-1 px-3 py-2 text-sm"
              >
                View Results →
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="rounded-lg font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 flex-1 px-3 py-2 text-sm"
              >
                Next →
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default MultipleChoiceQuiz;