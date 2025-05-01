'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, SaveIcon, CheckIcon, BoxIcon, TrashIcon, CodeIcon, CheckCircleIcon, PaletteIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { SavedGroup } from '../group-builder/GroupBuilder';
import { 
  isSlugAvailable, 
  RecipeInfo, 
  getUserRecipes, 
  getCompiledRecipeByVersion, 
  checkCompiledRecipeVersionExists,
  CustomAppletConfig,
  getAllCustomAppletConfigs,
  getCustomAppletConfigById,
  createCustomAppletConfig,
  updateCustomAppletConfig,
  deleteCustomAppletConfig
} from '@/features/applet/builder/modules/applet-builder/customAppletService';
import { ICON_OPTIONS, getAppIconOptions, COLOR_VARIANTS } from '@/features/applet/layouts/helpers/StyledComponents';

// Legacy interface - will be phased out
export interface SavedApplet {
  id: string;
  name: string;
  description?: string;
  creatorName?: string;
  slug: string;
  imageUrl?: string;
  createdAt: string;
  lastModified: string;
  groups: SavedGroup[];
}

export const AppletBuilder = () => {
  const { toast } = useToast();
  const [newApplet, setNewApplet] = useState<Partial<CustomAppletConfig>>({
    name: '',
    description: '',
    slug: '',
    appletIcon: 'SiCodemagic',
    appletSubmitText: 'Submit',
    creator: '',
    primaryColor: 'emerald',
    accentColor: 'blue',
    layoutType: 'flat',
    imageUrl: '',
  });
  const [savedApplets, setSavedApplets] = useState<CustomAppletConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedApplet, setSelectedApplet] = useState<CustomAppletConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Icon selection
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerType, setIconPickerType] = useState<'main' | 'submit'>('main');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Memoize the available icons using the utility from StyledComponents
  const availableIcons = useMemo(() => {
    return getAppIconOptions();
  }, []);

  // Memoize the filtered icons based on search term
  const filteredIcons = useMemo(() => {
    if (!searchTerm) return availableIcons;
    return availableIcons.filter(icon => 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableIcons, searchTerm]);
  
  // Temp placeholders for group management
  const [showAddGroupsDialog, setShowAddGroupsDialog] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<SavedGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Recipe selection state
  const [userRecipes, setUserRecipes] = useState<RecipeInfo[]>([]);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeInfo | null>(null);
  const [versionSelection, setVersionSelection] = useState<'latest' | 'specific'>('latest');
  const [specificVersion, setSpecificVersion] = useState<number>(1);
  const [compiledRecipeId, setCompiledRecipeId] = useState<string | null>(null);
  const [isVersionValid, setIsVersionValid] = useState<boolean>(true);
  const [isCheckingVersion, setIsCheckingVersion] = useState<boolean>(false);

  // List of available colors
  const availableColors = useMemo(() => [
    'rose', 'blue', 'green', 'purple', 'yellow', 'red', 'orange', 'pink', 
    'slate', 'zinc', 'neutral', 'stone', 'amber', 'lime', 'emerald', 
    'teal', 'cyan', 'sky', 'violet', 'fuchsia'
  ], []);

  // List of available layout types
  const layoutTypes = useMemo(() => [
    { value: 'flat', label: 'Flat' },
    { value: 'tabs', label: 'Tabs' },
    { value: 'wizard', label: 'Wizard' },
    { value: 'accordion', label: 'Accordion' },
  ], []);

  // Load saved applets from the API on component mount
  useEffect(() => {
    // Fetch saved applets
    fetchSavedApplets();
    
    // Load legacy applets (placeholder)
    const storedApplets = localStorage.getItem('savedApplets');
    if (storedApplets) {
      try {
        // This is temporary - will be removed once we fully migrate to the database
        console.log('Loading legacy applets from localStorage');
      } catch (e) {
        console.error('Failed to parse saved applets', e);
      }
    }
    
    // Load available groups
    const storedGroups = localStorage.getItem('savedGroups');
    if (storedGroups) {
      try {
        setAvailableGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse saved groups', e);
      }
    }

    // Fetch user recipes
    fetchUserRecipes();
  }, []);

  // Fetch saved applets from the database
  const fetchSavedApplets = async () => {
    setIsLoading(true);
    try {
      const applets = await getAllCustomAppletConfigs();
      setSavedApplets(applets);
    } catch (error) {
      console.error('Failed to load applets:', error);
      toast({
        title: "Error",
        description: "Failed to load applets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render the correct icon component
  const renderIcon = (iconName: string | undefined) => {
    if (!iconName) return <BoxIcon className="h-5 w-5" />;
    
    const IconComponent = ICON_OPTIONS[iconName];
    if (!IconComponent) return <BoxIcon className="h-5 w-5" />;
    
    return <IconComponent className="h-5 w-5" />;
  };

  // Fetch user recipes
  const fetchUserRecipes = async () => {
    try {
      const recipes = await getUserRecipes();
      setUserRecipes(recipes);
    } catch (error) {
      console.error('Failed to fetch user recipes:', error);
      toast({
        title: "Error",
        description: "Failed to load recipes",
        variant: "destructive",
      });
    }
  };

  // Check if a specific version exists
  const checkVersionExists = async () => {
    if (!selectedRecipe) return;
    
    setIsCheckingVersion(true);
    
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
  }, [specificVersion, selectedRecipe, versionSelection]);

  // Handle recipe selection
  const handleRecipeSelect = (recipe: RecipeInfo) => {
    setSelectedRecipe(recipe);
    setSpecificVersion(recipe.version); // Default to the current version
    setVersionSelection('latest');
    setIsVersionValid(true);
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
        setNewApplet(prev => ({ 
          ...prev, 
          compiledRecipeId: recipeId 
        }));
        
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApplet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // Convert camelCase or any case to snake_case
    const slug = name.toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1_$2') // Convert camelCase to snake_case
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, ''); // Remove special characters
    
    setNewApplet(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewApplet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIconSelect = (iconName: string) => {
    if (iconPickerType === 'main') {
      setNewApplet(prev => ({
        ...prev,
        appletIcon: iconName
      }));
    } else {
      setNewApplet(prev => ({
        ...prev,
        appletSubmitIcon: iconName
      }));
    }
    setShowIconPicker(false);
  };

  const openIconPicker = (type: 'main' | 'submit') => {
    setIconPickerType(type);
    setSearchTerm('');
    setShowIconPicker(true);
  };

  const resetForm = () => {
    setNewApplet({
      name: '',
      description: '',
      slug: '',
      appletIcon: 'SiCodemagic',
      appletSubmitText: 'Submit',
      creator: '',
      primaryColor: 'emerald',
      accentColor: 'blue',
      layoutType: 'flat',
      imageUrl: '',
      compiledRecipeId: null
    });
    setSelectedApplet(null);
    setSelectedGroups([]);
    setCompiledRecipeId(null);
    setSelectedRecipe(null);
  };

  const saveApplet = async () => {
    if (!newApplet.name || !newApplet.slug) {
      toast({
        title: "Validation Error",
        description: "Applet name and slug are required",
        variant: "destructive",
      });
      return;
    }

    // Check slug uniqueness before saving
    setIsLoading(true);
    try {
      const isAvailable = await isSlugAvailable(newApplet.slug);
      
      if (!isAvailable) {
        toast({
          title: "Slug Error",
          description: `The slug "${newApplet.slug}" is already in use. Please choose a different one.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const createdApplet = await createCustomAppletConfig(newApplet as CustomAppletConfig);
      setSavedApplets(prev => [...prev, createdApplet]);
      
      toast({
        title: "Applet Saved",
        description: `Applet "${newApplet.name}" has been saved successfully.`,
      });
      
      resetForm();
    } catch (error) {
      console.error('Error saving applet:', error);
      toast({
        title: "Error",
        description: "Failed to save applet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editApplet = (applet: CustomAppletConfig) => {
    setSelectedApplet(applet);
    setNewApplet(applet);
    
    // Load the recipe information if available
    if (applet.compiledRecipeId) {
      setCompiledRecipeId(applet.compiledRecipeId);
      // Note: Ideally we'd look up the recipe details as well, but we'll leave that as a TO-DO
    }
    
    setActiveTab('create');
  };

  const updateApplet = async () => {
    if (!selectedApplet?.id) return;
    
    // Check slug uniqueness if it was changed
    setIsLoading(true);
    try {
      if (selectedApplet.slug !== newApplet.slug) {
        const isAvailable = await isSlugAvailable(newApplet.slug, selectedApplet.id);
        
        if (!isAvailable) {
          toast({
            title: "Slug Error",
            description: `The slug "${newApplet.slug}" is already in use. Please choose a different one.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      const updatedApplet = await updateCustomAppletConfig(selectedApplet.id, newApplet as CustomAppletConfig);
      setSavedApplets(prev => prev.map(applet => 
        applet.id === selectedApplet.id ? updatedApplet : applet
      ));
      
      toast({
        title: "Applet Updated",
        description: `Applet "${newApplet.name}" has been updated successfully.`,
      });
      resetForm();
    } catch (error) {
      console.error('Error updating applet:', error);
      toast({
        title: "Error",
        description: "Failed to update applet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApplet = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteCustomAppletConfig(id);
      setSavedApplets(prev => prev.filter(applet => applet.id !== id));
      toast({
        title: "Applet Deleted",
        description: "Applet has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting applet:', error);
      toast({
        title: "Error",
        description: "Failed to delete applet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder for future group management (will need updating later)
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Placeholder for future group management (will need updating later)
  const addSelectedGroupsToApplet = () => {
    if (selectedGroups.length === 0) {
      setShowAddGroupsDialog(false);
      return;
    }
    
    // This is a placeholder for future implementation
    // TODO: Implement proper group management with the new structure
    
    toast({
      title: "Groups Added",
      description: `This is a placeholder - group management will be implemented in a future update.`,
    });
    
    setSelectedGroups([]);
    setShowAddGroupsDialog(false);
  };

  // Placeholder for future group management (will need updating later)
  const removeGroupFromApplet = (appletId: string, groupId: string) => {
    // This is a placeholder for future implementation
    // TODO: Implement proper group management with the new structure
    
    toast({
      title: "Group Removed",
      description: "This is a placeholder - group management will be implemented in a future update.",
    });
  };

  // Memoize color class for saved applet cards
  const getColorClass = useMemo(() => (color: string) => {
    return COLOR_VARIANTS.text[color] || COLOR_VARIANTS.text.emerald;
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">Applet Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage applets for your applications
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
              >
                Create Applet
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
              >
                Saved Applets ({savedApplets.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">
                        Applet Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={newApplet.name || ''}
                        onChange={handleNameChange}
                        placeholder="Enter applet name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-gray-900 dark:text-gray-100">
                        Slug
                      </Label>
                      <Input
                        id="slug"
                        name="slug"
                        value={newApplet.slug || ''}
                        onChange={handleInputChange}
                        placeholder="Enter applet slug"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-generated from name, but can be customized
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={newApplet.description || ''}
                        onChange={handleInputChange}
                        placeholder="Enter applet description"
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-900 dark:text-gray-100">
                          Applet Icon
                        </Label>
                        <Button
                          variant="outline"
                          onClick={() => openIconPicker('main')}
                          className="w-full border-gray-200 dark:border-gray-700 flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            {renderIcon(newApplet.appletIcon)}
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                              {newApplet.appletIcon || 'Select Icon'}
                            </span>
                          </div>
                          <PaletteIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="appletSubmitText" className="text-gray-900 dark:text-gray-100">
                          Submit Text
                        </Label>
                        <Input
                          id="appletSubmitText"
                          name="appletSubmitText"
                          value={newApplet.appletSubmitText || ''}
                          onChange={handleInputChange}
                          placeholder="Submit text"
                          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor" className="text-gray-900 dark:text-gray-100">
                          Primary Color
                        </Label>
                        <Select
                          value={newApplet.primaryColor}
                          onValueChange={(value) => handleSelectChange('primaryColor', value)}
                        >
                          <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map(color => (
                              <SelectItem key={color} value={color} className="flex items-center">
                                <div className={`w-4 h-4 rounded-full bg-${color}-500 mr-2`} />
                                <span className="capitalize">{color}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accentColor" className="text-gray-900 dark:text-gray-100">
                          Accent Color
                        </Label>
                        <Select
                          value={newApplet.accentColor}
                          onValueChange={(value) => handleSelectChange('accentColor', value)}
                        >
                          <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map(color => (
                              <SelectItem key={color} value={color} className="flex items-center">
                                <div className={`w-4 h-4 rounded-full bg-${color}-500 mr-2`} />
                                <span className="capitalize">{color}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="layoutType" className="text-gray-900 dark:text-gray-100">
                        Layout Type
                      </Label>
                      <Select
                        value={newApplet.layoutType}
                        onValueChange={(value) => handleSelectChange('layoutType', value)}
                      >
                        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select a layout" />
                        </SelectTrigger>
                        <SelectContent>
                          {layoutTypes.map(layout => (
                            <SelectItem key={layout.value} value={layout.value}>
                              {layout.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creator" className="text-gray-900 dark:text-gray-100">
                        Creator
                      </Label>
                      <Input
                        id="creator"
                        name="creator"
                        value={newApplet.creator || ''}
                        onChange={handleInputChange}
                        placeholder="Enter creator name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-gray-900 dark:text-gray-100">
                        Image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        value={newApplet.imageUrl || ''}
                        onChange={handleInputChange}
                        placeholder="Enter image URL"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-gray-100">
                      Compiled Recipe
                    </Label>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowRecipeDialog(true)}
                        className="flex-1 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <CodeIcon className="h-4 w-4 mr-2" />
                        {compiledRecipeId ? 'Change Recipe' : 'Select Recipe'}
                      </Button>
                    </div>
                    {compiledRecipeId && selectedRecipe && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {selectedRecipe.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {versionSelection === 'latest' ? 'Latest version' : `Version ${specificVersion}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          ID: {compiledRecipeId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    Reset
                  </Button>
                  
                  <Button
                    onClick={selectedApplet ? updateApplet : saveApplet}
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                  >
                    {isLoading ? (
                      'Processing...'
                    ) : selectedApplet ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update Applet</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save Applet</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Loading applets...</p>
                </div>
              ) : savedApplets.length === 0 ? (
                <div className="text-center py-8">
                  <BoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No applets</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new applet
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Applet
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedApplets.map(applet => (
                    <Card key={applet.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          {renderIcon(applet.appletIcon)}
                          <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {applet.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {applet.slug}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {applet.description && (
                            <p className="mb-2 truncate">{applet.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <p><span className="font-medium">Layout:</span> {applet.layoutType || 'Default'}</p>
                            <p><span className="font-medium">Created By:</span> {applet.creator || 'Unknown'}</p>
                            <p>
                              <span className="font-medium">Primary:</span> 
                              <span className={`inline-block w-3 h-3 rounded-full bg-${applet.primaryColor}-500 ml-1`}></span>
                              <span className="capitalize ml-1">{applet.primaryColor}</span>
                            </p>
                            <p>
                              <span className="font-medium">Accent:</span> 
                              <span className={`inline-block w-3 h-3 rounded-full bg-${applet.accentColor}-500 ml-1`}></span>
                              <span className="capitalize ml-1">{applet.accentColor}</span>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteApplet(applet.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editApplet(applet)}
                          disabled={isLoading}
                          className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Recipe</DialogTitle>
            <DialogDescription>
              Choose a recipe and version to use for this applet
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
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
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {userRecipes.map(recipe => (
                      <li 
                        key={recipe.id} 
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedRecipe?.id === recipe.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                        }`}
                        onClick={() => handleRecipeSelect(recipe)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{recipe.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Version: {recipe.version} · Status: {recipe.status}
                          </p>
                          {recipe.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {recipe.description}
                            </p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full ${
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
                </div>
                
                {selectedRecipe && (
                  <div className="w-full space-y-4 mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version Selection</h3>
                    
                    <RadioGroup 
                      value={versionSelection} 
                      onValueChange={(v) => handleVersionSelectionChange(v as 'latest' | 'specific')}
                      className="space-y-2"
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
                      <div className="space-y-2">
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
      
      <Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select an Icon</DialogTitle>
            <DialogDescription>
              Choose an icon for your applet
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <Input
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          
          <div className="py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {filteredIcons.map(({ name, component: IconComponent }) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  className="h-12 flex flex-col items-center justify-center border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  onClick={() => handleIconSelect(name)}
                >
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  <span className="text-xs mt-1 text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {name.length > 10 ? `${name.substring(0, 10)}...` : name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowIconPicker(false)}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
};

export default AppletBuilder; 