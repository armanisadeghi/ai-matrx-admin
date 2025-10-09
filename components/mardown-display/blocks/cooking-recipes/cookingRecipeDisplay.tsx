import React, { useState, useMemo } from 'react';
import { 
  ChefHat, Clock, Users, CheckCircle2, Circle, 
  Maximize2, Minimize2, Timer, Flame, UtensilsCrossed,
  AlertCircle, Sparkles, Plus, Minus
} from 'lucide-react';

interface Ingredient {
  amount: string;
  item: string;
}

interface RecipeStep {
  action: string;
  description: string;
  time?: string;
}

interface RecipeData {
  title: string;
  yields: string;
  totalTime: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: RecipeStep[];
  notes?: string;
}

interface RecipeViewerProps {
  recipe: RecipeData;
}

const RecipeViewer: React.FC<RecipeViewerProps> = ({ recipe }) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  // Calculate progress
  const ingredientProgress = useMemo(() => 
    Math.round((checkedIngredients.size / recipe.ingredients.length) * 100),
    [checkedIngredients.size, recipe.ingredients.length]
  );

  const stepProgress = useMemo(() => 
    Math.round((completedSteps.size / recipe.instructions.length) * 100),
    [completedSteps.size, recipe.instructions.length]
  );

  const overallProgress = useMemo(() => 
    Math.round(((checkedIngredients.size + completedSteps.size) / 
    (recipe.ingredients.length + recipe.instructions.length)) * 100),
    [checkedIngredients.size, completedSteps.size, recipe.ingredients.length, recipe.instructions.length]
  );

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const toggleStep = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const adjustServings = (increment: boolean) => {
    if (increment) {
      setServingMultiplier(prev => Math.min(prev + 0.5, 5));
    } else {
      setServingMultiplier(prev => Math.max(prev - 0.5, 0.5));
    }
  };

  const resetProgress = () => {
    setCheckedIngredients(new Set());
    setCompletedSteps(new Set());
  };

  // Scale ingredient amounts
  const scaleAmount = (amount: string): string => {
    if (servingMultiplier === 1) return amount;
    
    // Extract numbers and scale them
    return amount.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      const scaled = num * servingMultiplier;
      return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
    });
  };

  return (
    <>
      {/* Fullscreen Backdrop */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}

      <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'py-6'}`}>
        <div className={`max-w-6xl mx-auto ${isFullScreen ? 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl h-full max-h-[95vh] w-full flex flex-col overflow-hidden' : ''}`}>
          
          {/* Fullscreen Header */}
          {isFullScreen && (
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <div className="flex items-center gap-3">
                <ChefHat className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Cooking Mode</h3>
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all shadow-sm"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Exit</span>
              </button>
            </div>
          )}

          {/* Scrollable Content */}
          <div className={isFullScreen ? 'flex-1 overflow-y-auto' : ''}>
            <div className="p-6 space-y-6">

              {/* Header Section */}
              <div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/40 rounded-2xl p-6 shadow-lg border-2 border-orange-200 dark:border-orange-800/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500 dark:bg-orange-600 rounded-xl shadow-md">
                      <ChefHat className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {recipe.title}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {recipe.yields}
                      </p>
                    </div>
                  </div>

                  {!isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 dark:bg-orange-600 text-white text-sm font-semibold shadow-md hover:bg-orange-600 dark:hover:bg-orange-700 hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span>Cooking Mode</span>
                    </button>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-orange-200 dark:border-orange-800/50">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Total</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.totalTime}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                      <UtensilsCrossed className="h-4 w-4" />
                      <span className="text-xs font-medium">Prep</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.prepTime}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-red-200 dark:border-red-800/50">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                      <Flame className="h-4 w-4" />
                      <span className="text-xs font-medium">Cook</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.cookTime}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-green-200 dark:border-green-800/50">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Progress</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{overallProgress}%</div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Ingredients Section */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Ingredients
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustServings(false)}
                          disabled={servingMultiplier <= 0.5}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Minus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </button>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
                          {servingMultiplier}x
                        </span>
                        <button
                          onClick={() => adjustServings(true)}
                          disabled={servingMultiplier >= 5}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Gathered</span>
                        <span>{checkedIngredients.size}/{recipe.ingredients.length}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 transition-all duration-300 rounded-full"
                          style={{ width: `${ingredientProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Ingredients List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          onClick={() => toggleIngredient(index)}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            checkedIngredients.has(index)
                              ? 'bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-700'
                              : 'bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          {checkedIngredients.has(index) ? (
                            <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${
                              checkedIngredients.has(index)
                                ? 'text-purple-900 dark:text-purple-200 line-through'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {scaleAmount(ingredient.amount)}
                            </span>
                            <span className={`text-sm ml-2 ${
                              checkedIngredients.has(index)
                                ? 'text-purple-700 dark:text-purple-300 line-through'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {ingredient.item}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Instructions
                      </h2>
                      {completedSteps.size > 0 && (
                        <button
                          onClick={resetProgress}
                          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Completed</span>
                        <span>{completedSteps.size}/{recipe.instructions.length}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 transition-all duration-300 rounded-full"
                          style={{ width: `${stepProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Steps List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {recipe.instructions.map((step, index) => (
                        <div
                          key={index}
                          onClick={() => toggleStep(index)}
                          className={`relative flex gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                            completedSteps.has(index)
                              ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-700'
                              : 'bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            completedSteps.has(index)
                              ? 'bg-green-500 dark:bg-green-600 text-white'
                              : 'bg-blue-500 dark:bg-blue-600 text-white'
                          }`}>
                            {completedSteps.has(index) ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <div className={`font-semibold text-sm mb-1 ${
                              completedSteps.has(index)
                                ? 'text-green-900 dark:text-green-200 line-through'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {step.action}
                            </div>
                            <div className={`text-sm ${
                              completedSteps.has(index)
                                ? 'text-green-700 dark:text-green-300 line-through'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {step.description}
                            </div>
                            {step.time && (
                              <div className={`flex items-center gap-1 mt-2 text-xs ${
                                completedSteps.has(index)
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                <Clock className="h-3 w-3" />
                                <span>{step.time}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {recipe.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-5 border-2 border-amber-200 dark:border-amber-800/50 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Pro Tips</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                        {recipe.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Message */}
              {overallProgress === 100 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border-2 border-green-300 dark:border-green-700 shadow-lg">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-green-500 dark:bg-green-600 rounded-full">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-1">
                        Recipe Complete!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your {recipe.title.toLowerCase()} should be ready to enjoy!
                      </p>
                    </div>
                    <button
                      onClick={resetProgress}
                      className="mt-2 px-4 py-2 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      Start Again
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecipeViewer;