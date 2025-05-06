'use client';
import React, { useState, useEffect } from 'react';
import { BrainCog, TagIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getUserRecipes, RecipeInfo } from '@/lib/redux/app-builder/service/customAppletService';
import { RecipeSelectDialog } from '@/features/applet/builder/modules/applet-builder/RecipeSelectDialog';
import { AppletSourceConfig } from '@/lib/redux/app-builder/service/customAppletService';


interface RecipeSelectorProps {
  compiledRecipeId: string | null;
  onRecipeSelect: (compiledRecipeId: string) => void;
  className?: string;
  onGetCompiledRecipeWithNeededBrokers: (mapping: AppletSourceConfig | null) => void;
}

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  compiledRecipeId,
  onRecipeSelect,
  className,
  onGetCompiledRecipeWithNeededBrokers
}) => {
  const { toast } = useToast();
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [userRecipes, setUserRecipes] = useState<RecipeInfo[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user recipes on component mount
  useEffect(() => {
    const fetchRecipes = async () => {
      setIsLoading(true);
      try {
        const recipes = await getUserRecipes();
        setUserRecipes(recipes);
      } catch (error) {
        console.error("Failed to fetch user recipes:", error);
        toast({
          title: "Error",
          description: "Failed to load recipes",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecipes();
  }, [toast]);

  return (
    <div className={`${className}`}>
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Recipe</Label>
          {compiledRecipeId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecipeDialog(true)}
              className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2"
            >
              Change
            </Button>
          )}
        </div>

        {!compiledRecipeId ? (
          <Button
            variant="outline"
            onClick={() => setShowRecipeDialog(true)}
            className="w-full group border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 h-14 transition-all duration-200"
            disabled={isLoading}
          >
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              <BrainCog className="h-5 w-5" />
              <span className="font-medium">Select AI Recipe</span>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </div>
          </Button>
        ) : (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                <BrainCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                {selectedRecipe ? (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{selectedRecipe.name}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs px-2 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        v{selectedRecipe.version}
                      </Badge>
                      {selectedRecipe.status && (
                        <Badge variant="outline" className="text-xs px-2 py-0 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          {selectedRecipe.status}
                        </Badge>
                      )}
                    </div>
                    
                    {selectedRecipe.tags?.tags && selectedRecipe.tags.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TagIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {selectedRecipe.tags.tags.map(tag => (
                            <Badge 
                              key={tag}
                              variant="outline" 
                              className="text-sm px-1.5 py-0 h-5 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800/60 text-blue-600 dark:text-blue-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300">Recipe selected</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate font-mono">Compiled ID: {compiledRecipeId}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <RecipeSelectDialog
        showRecipeDialog={showRecipeDialog}
        setShowRecipeDialog={setShowRecipeDialog}
        userRecipes={userRecipes}
        selectedRecipe={selectedRecipe}
        setSelectedRecipe={setSelectedRecipe}
        setCompiledRecipeId={onRecipeSelect}
        setCompiledRecipeWithNeededBrokers={onGetCompiledRecipeWithNeededBrokers}
      />
    </div>
  );
};

export default RecipeSelector;