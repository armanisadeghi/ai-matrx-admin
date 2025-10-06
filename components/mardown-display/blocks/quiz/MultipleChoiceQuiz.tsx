import React, { useState } from 'react';
import { Check, X, Trophy, AlertTriangle, CheckCircle2, XCircle, Maximize2, Minimize2 } from 'lucide-react';

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
    const paddingClass = isFullScreen ? "p-3 md:p-4" : "p-4";
    const baseStyle = `${paddingClass} rounded-xl border-2 cursor-pointer transition-all duration-200 text-left`;
    
    if (!isAnswered) {
      return `${baseStyle} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30`;
    } else {
      // After answer selected
      if (optionIndex === currentQuestion.correctAnswer) {
        return `${baseStyle} bg-green-100 dark:bg-green-950/40 border-green-400 dark:border-green-600 shadow-md`;
      }
      if (selectedAnswer === optionIndex && !isCorrect) {
        return `${baseStyle} bg-red-100 dark:bg-red-950/40 border-red-400 dark:border-red-600 shadow-md`;
      }
      return `${baseStyle} bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60`;
    }
  };

  // Results Screen
  if (showResults) {
    return (
      <div className="w-full py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-7 w-7 text-yellow-500 dark:text-yellow-400" />
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Quiz Complete!</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Here's how you did:</p>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{scorePercentage}%</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">Score</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questions.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Total</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Correct</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Incorrect</div>
              </div>
            </div>

            {/* Unanswered Warning */}
            {answeredCount < questions.length && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>You skipped {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''}</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReviewAnswers}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Review Answers
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
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
    <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto md:relative md:bg-transparent' : 'py-6'}`}>
      <div className={`max-w-4xl mx-auto ${isFullScreen ? 'h-full flex flex-col p-4 md:p-0 md:h-auto md:block' : ''}`}>
        {/* Fullscreen Toggle Button - Only visible on mobile */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="md:hidden mb-4 ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-all"
        >
          {isFullScreen ? (
            <>
              <Minimize2 className="h-4 w-4" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4" />
              <span>Fullscreen</span>
            </>
          )}
        </button>

        {/* Question Card */}
        <div className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-gray-700 rounded-2xl shadow-lg ${
          isFullScreen ? 'p-4 mb-3 md:p-6 md:mb-6' : 'p-6 mb-6'
        }`}>
          <div className="text-gray-800 dark:text-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className={`font-medium text-blue-600 dark:text-blue-400 ${isFullScreen ? 'text-xs md:text-sm' : 'text-sm'}`}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className={`font-medium text-green-600 dark:text-green-400 ${isFullScreen ? 'text-xs md:text-sm' : 'text-sm'}`}>
                Answered: {answeredCount}/{questions.length}
              </div>
            </div>
            {/* Fixed height for question to prevent shifts, accommodates ~3 lines */}
            <h2 className={`font-bold mb-2 line-clamp-3 ${isFullScreen ? 'text-base min-h-[60px] md:text-lg md:min-h-[72px]' : 'text-lg min-h-[72px]'}`}>
              {currentQuestion.question}
            </h2>
            {/* Fixed height container for status message */}
            <div className={`mt-2 ${isFullScreen ? 'h-5 md:h-6' : 'h-6'}`}>
              {isAnswered && (
                <div className={`text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 ${isFullScreen ? 'text-xs md:text-sm' : 'text-sm'}`}>
                  <CheckCircle2 className={`${isFullScreen ? 'h-3 w-3 md:h-4 md:w-4' : 'h-4 w-4'}`} />
                  <span>Already answered</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Options Grid - 2 columns on md+ screens, 1 column on mobile */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isFullScreen ? 'gap-2 mb-3 md:gap-4 md:mb-6' : 'gap-4 mb-6'}`}>
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionClick(index)}
              className={getOptionStyle(index)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium text-gray-800 dark:text-gray-200 flex-1 ${isFullScreen ? 'text-sm md:text-base' : 'text-base'}`}>
                  {option}
                </span>
                {isAnswered && index === currentQuestion.correctAnswer && (
                  <Check className={`text-green-600 dark:text-green-400 flex-shrink-0 ${isFullScreen ? 'h-5 w-5 md:h-6 md:w-6' : 'h-6 w-6'}`} />
                )}
                {isAnswered && selectedAnswer === index && !isCorrect && (
                  <X className={`text-red-600 dark:text-red-400 flex-shrink-0 ${isFullScreen ? 'h-5 w-5 md:h-6 md:w-6' : 'h-6 w-6'}`} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Explanation - fixed height to prevent layout shift, revealed on answer */}
        <div className={`rounded-xl border-2 transition-all duration-300 ${
          isFullScreen ? 'mb-3 min-h-[80px] md:mb-4 md:min-h-[100px]' : 'mb-4 min-h-[100px]'
        } ${
          !isAnswered 
            ? 'opacity-0 border-transparent pointer-events-none' 
            : isCorrect
              ? `opacity-100 bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600 ${isFullScreen ? 'p-3 md:p-4' : 'p-4'}`
              : `opacity-100 bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600 ${isFullScreen ? 'p-3 md:p-4' : 'p-4'}`
        }`}>
          {isAnswered && (
            <>
              <div className={`font-semibold mb-1.5 flex items-center gap-2 ${isFullScreen ? 'text-sm md:text-base' : 'text-base'} ${
                isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 className={`${isFullScreen ? 'h-4 w-4 md:h-5 md:w-5' : 'h-5 w-5'}`} />
                    <span>Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className={`${isFullScreen ? 'h-4 w-4 md:h-5 md:w-5' : 'h-5 w-5'}`} />
                    <span>Incorrect</span>
                  </>
                )}
              </div>
              <p 
                className={`line-clamp-3 hover:line-clamp-none transition-all cursor-help ${isFullScreen ? 'text-xs md:text-sm' : 'text-sm'} ${
                  isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                }`}
                title={currentQuestion.explanation}
              >
                {currentQuestion.explanation}
              </p>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className={`flex justify-between items-center ${isFullScreen ? 'mt-auto pt-4' : ''}`}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`rounded-lg font-semibold transition-all duration-200 ${
              isFullScreen ? 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm' : 'px-4 py-2 text-sm'
            } ${
              currentQuestionIndex === 0
                ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed text-gray-200 dark:text-gray-500'
                : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
            }`}
          >
            ← Previous
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleNext}
              className={`rounded-lg font-semibold bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ${
                isFullScreen ? 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm' : 'px-4 py-2 text-sm'
              }`}
            >
              View Results →
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`rounded-lg font-semibold bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ${
                isFullScreen ? 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm' : 'px-4 py-2 text-sm'
              }`}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceQuiz;