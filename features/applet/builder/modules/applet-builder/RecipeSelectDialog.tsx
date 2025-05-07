'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CheckIcon, CodeIcon, CheckCircleIcon, SearchIcon, TagIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/components/ui/use-toast';
import { 
  RecipeInfo, 
  getCompiledRecipeByVersion, 
  checkCompiledRecipeVersionExists, 
  getCompiledRecipeByVersionWithNeededBrokers,
  AppletSourceConfig
} from '@/lib/redux/app-builder/service/customAppletService';
import { useAppDispatch } from '@/lib/redux';
import { setTempAppletSourceConfig } from '@/lib/redux/app-builder/slices/appletBuilderSlice';


// Extended RecipeInfo interface with extracted tags
interface ExtendedRecipeInfo extends Omit<RecipeInfo, 'tags'> {
  tags?: string[];
  originalTags?: { tags: string[] };
}

interface RecipeSelectDialogProps {
  showRecipeDialog: boolean;
  setShowRecipeDialog: (show: boolean) => void;
  userRecipes: RecipeInfo[];
  selectedRecipe: RecipeInfo | null;
  setSelectedRecipe: (recipe: RecipeInfo | null) => void;
  setCompiledRecipeId: (id: string | null) => void;
  setNewApplet?: React.Dispatch<React.SetStateAction<any>>;
  setCompiledRecipeWithNeededBrokers?: (sourceConfig: AppletSourceConfig | null) => void;
}

export const RecipeSelectDialog: React.FC<RecipeSelectDialogProps> = ({
  showRecipeDialog,
  setShowRecipeDialog,
  userRecipes,
  selectedRecipe,
  setSelectedRecipe,
  setCompiledRecipeId,
  setNewApplet,
  setCompiledRecipeWithNeededBrokers
}) => {
  const { toast } = useToast();
  
  const [versionSelection, setVersionSelection] = useState<'latest' | 'specific'>('latest');
  const [specificVersion, setSpecificVersion] = useState<number>(1);
  const [isVersionValid, setIsVersionValid] = useState<boolean>(true);
  const [isCheckingVersion, setIsCheckingVersion] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const dispatch = useAppDispatch();

  // Extract tags from the recipes
  const extendedRecipes = userRecipes.map(recipe => ({
    ...recipe,
    originalTags: recipe.tags,
    tags: recipe.tags?.tags || ['recipe', recipe.status].filter(Boolean), // Fallback tags
  })) as ExtendedRecipeInfo[];

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    extendedRecipes.forEach(recipe => {
      if (recipe.tags) {
        recipe.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [extendedRecipes]);

  // Filter recipes based on search term and selected tags
  const filteredRecipes = useMemo(() => {
    return extendedRecipes.filter(recipe => {
      // Search term filter
      const matchesSearch = searchTerm === '' || 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        (recipe.tags && selectedTags.every(tag => recipe.tags?.includes(tag)));
      
      return matchesSearch && matchesTags;
    });
  }, [extendedRecipes, searchTerm, selectedTags]);

  // Handle recipe selection
  const handleRecipeSelect = async (recipe: ExtendedRecipeInfo) => {
    setSelectedRecipe({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      version: recipe.version,
      status: recipe.status,
      tags: recipe.originalTags
    });

    const compiledRecipeWithBrokerMapping = await getCompiledRecipeByVersionWithNeededBrokers(recipe.id);
    if (setCompiledRecipeWithNeededBrokers) {
      setCompiledRecipeWithNeededBrokers(compiledRecipeWithBrokerMapping);
    }

    dispatch(setTempAppletSourceConfig(compiledRecipeWithBrokerMapping));

    setSpecificVersion(recipe.version);
    setVersionSelection('latest');
    setIsVersionValid(true);
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  // Handle version selection mode change
  const handleVersionSelectionChange = (value: 'latest' | 'specific') => {
    setVersionSelection(value);
    
    if (value === 'latest' && selectedRecipe) {
      // If "latest" is selected, clear the specificVersion and get the latest compiled recipe
      setIsVersionValid(true);
      fetchLatestCompiledRecipe();
    } else if (value === 'specific' && selectedRecipe) {
      // If "specific" is selected, check if the current specificVersion exists
      checkVersionExists();
    }
  };

  // Fetch the latest compiled recipe
  const fetchLatestCompiledRecipe = async () => {
    if (!selectedRecipe) return;
    
    try {
      const id = await getCompiledRecipeByVersion(selectedRecipe.id);
      setCompiledRecipeId(id);
      const compiledRecipeWithBrokerMapping = await getCompiledRecipeByVersionWithNeededBrokers(selectedRecipe.id);
      if (setCompiledRecipeWithNeededBrokers) {
        setCompiledRecipeWithNeededBrokers(compiledRecipeWithBrokerMapping);
      }

      dispatch(setTempAppletSourceConfig(compiledRecipeWithBrokerMapping));
    } catch (error) {
      console.error('Error fetching latest compiled recipe:', error);
      toast({
        title: "Error",
        description: "Failed to fetch latest compiled recipe",
        variant: "destructive",
      });
    }
  };

  // Handle specific version change
  const handleSpecificVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSpecificVersion(value);
    }
  };

  // Check if a specific version exists
  const checkVersionExists = async () => {
    if (!selectedRecipe) return;
    
    setIsCheckingVersion(true);
    const compiledRecipeWithBrokerMapping = await getCompiledRecipeByVersionWithNeededBrokers(selectedRecipe.id, specificVersion);
    if (setCompiledRecipeWithNeededBrokers) {
      setCompiledRecipeWithNeededBrokers(compiledRecipeWithBrokerMapping);
    }

    dispatch(setTempAppletSourceConfig(compiledRecipeWithBrokerMapping));

    try {
      const exists = await checkCompiledRecipeVersionExists(selectedRecipe.id, specificVersion);
      setIsVersionValid(exists);
      
      if (exists) {
        // If the version exists, fetch the compiled recipe ID
        const id = await getCompiledRecipeByVersion(selectedRecipe.id, specificVersion);
        setCompiledRecipeId(id);

        
      } else {
        setCompiledRecipeId(null);
      }
    } catch (error) {
      console.error('Error checking version:', error);
      toast({
        title: "Error",
        description: "Failed to check version availability",
        variant: "destructive",
      });
    } finally {
      setIsCheckingVersion(false);
    }
  };

  // Effect to check version when specificVersion changes
  useEffect(() => {
    if (versionSelection === 'specific' && selectedRecipe) {
      const timeoutId = setTimeout(() => {
        checkVersionExists();
      }, 500); // Debounce version checking
      
      return () => clearTimeout(timeoutId);
    }
  }, [specificVersion, selectedRecipe]);

  // Confirm recipe selection
  const confirmRecipeSelection = async () => {
    if (!selectedRecipe) return;
    
    try {
      let recipeId: string | null = null;
      
      if (versionSelection === 'latest') {
        recipeId = await getCompiledRecipeByVersion(selectedRecipe.id);
      } else {
        // For specific version, make sure it exists
        if (!isVersionValid) {
          toast({
            title: "Invalid Version",
            description: `Version ${specificVersion} does not exist for this recipe`,
            variant: "destructive",
          });
          return;
        }
        recipeId = await getCompiledRecipeByVersion(selectedRecipe.id, specificVersion);
      }
      
      if (recipeId) {
        setCompiledRecipeId(recipeId);
        
        // Update the applet with the compiled recipe ID
        if (setNewApplet) {
          setNewApplet(prev => ({ 
            ...prev, 
            compiledRecipeId: recipeId 
          }));
        }
        
        toast({
          title: "Recipe Selected",
          description: `Recipe "${selectedRecipe.name}" ${versionSelection === 'latest' ? '(latest version)' : `(version ${specificVersion})`} has been selected.`,
        });
        
        setShowRecipeDialog(false);
      } else {
        toast({
          title: "Error",
          description: "Could not find the compiled recipe",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error confirming recipe selection:', error);
      toast({
        title: "Error",
        description: "Failed to select recipe",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select a Recipe</DialogTitle>
          <DialogDescription>
            Choose a recipe and version to use for this applet
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[70vh] overflow-y-auto">
          {userRecipes.length === 0 ? (
            <div className="text-center py-8">
              <CodeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No recipes available</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create recipes in the Recipe Builder first
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 items-center">
                  <TagIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <Badge 
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer ${selectedTags.includes(tag) 
                          ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {(searchTerm || selectedTags.length > 0) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <XIcon className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Recipe List */}
              <div className="max-h-[30vh] md:max-h-[40vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No recipes match your search</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRecipes.map(recipe => (
                      <li 
                        key={recipe.id} 
                        className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedRecipe?.id === recipe.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                        }`}
                        onClick={() => handleRecipeSelect(recipe)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{recipe.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              v{recipe.version} · {recipe.status}
                            </span>
                            {recipe.tags && recipe.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 ml-1">
                                {recipe.tags.slice(0, 3).map(tag => (
                                  <Badge 
                                    key={tag} 
                                    variant="outline" 
                                    className="text-[10px] px-1 py-0 h-4 border-gray-200 dark:border-gray-700"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {recipe.tags.length > 3 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    +{recipe.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {recipe.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[400px]">
                              {recipe.description}
                            </p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 ml-2 ${
                          selectedRecipe?.id === recipe.id 
                            ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600 flex items-center justify-center' 
                            : 'border border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedRecipe?.id === recipe.id && (
                            <CheckIcon className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Version Selection */}
              {selectedRecipe && (
                <div className="w-full mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version Selection</h3>
                  
                  <RadioGroup 
                    value={versionSelection} 
                    onValueChange={(v) => handleVersionSelectionChange(v as 'latest' | 'specific')}
                    className="space-y-2 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="latest" id="latest" />
                      <Label htmlFor="latest" className="text-gray-900 dark:text-gray-100">
                        Latest Version
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific" id="specific" />
                      <Label htmlFor="specific" className="text-gray-900 dark:text-gray-100">
                        Specific Version
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {versionSelection === 'specific' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          value={specificVersion}
                          onChange={handleSpecificVersionChange}
                          className={`w-20 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
                            !isVersionValid ? 'border-red-300 dark:border-red-700' : ''
                          }`}
                        />
                        {isCheckingVersion ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Checking...</span>
                        ) : isVersionValid ? (
                          <span className="flex items-center text-xs text-green-500 dark:text-green-400">
                            <CheckCircleIcon className="h-3 w-3 mr-1" /> Version exists
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 dark:text-red-400">Version not found</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enter a version number to use (current version is {selectedRecipe.version})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowRecipeDialog(false)}
            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmRecipeSelection}
            disabled={!selectedRecipe || (versionSelection === 'specific' && !isVersionValid)}
            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
          >
            Select Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeSelectDialog; 