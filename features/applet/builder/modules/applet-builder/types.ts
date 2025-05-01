import { CustomAppletConfig } from '../../builder.types';
import { RecipeInfo } from '../../service/customAppletService';
import { SavedGroup } from '../group-builder/GroupBuilder';

export interface IconOption {
  name: string;
  component: React.ComponentType<any>;
}

export interface LayoutType {
  value: string;
  label: string;
}

// Shared app state types
export interface AppletBuilderState {
  newApplet: Partial<CustomAppletConfig>;
  savedApplets: CustomAppletConfig[];
  selectedApplet: CustomAppletConfig | null;
  isLoading: boolean;
  showIconPicker: boolean;
  iconPickerType: 'main' | 'submit';
  showAddGroupsDialog: boolean;
  availableGroups: SavedGroup[];
  selectedGroups: string[];
  userRecipes: RecipeInfo[];
  showRecipeDialog: boolean;
  selectedRecipe: RecipeInfo | null;
  compiledRecipeId: string | null;
}

// Context types for potential future refactoring
export interface AppletBuilderContextValue extends AppletBuilderState {
  setNewApplet: React.Dispatch<React.SetStateAction<Partial<CustomAppletConfig>>>;
  setSavedApplets: React.Dispatch<React.SetStateAction<CustomAppletConfig[]>>;
  setSelectedApplet: React.Dispatch<React.SetStateAction<CustomAppletConfig | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setShowIconPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setIconPickerType: React.Dispatch<React.SetStateAction<'main' | 'submit'>>;
  setShowAddGroupsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedGroups: React.Dispatch<React.SetStateAction<string[]>>;
  setShowRecipeDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<RecipeInfo | null>>;
  setCompiledRecipeId: React.Dispatch<React.SetStateAction<string | null>>;
  renderIcon: (iconName: string | undefined) => React.ReactNode;
  resetForm: () => void;
  saveApplet: () => Promise<void>;
  updateApplet: () => Promise<void>;
  deleteApplet: (id: string) => Promise<void>;
  openIconPicker: (type: 'main' | 'submit') => void;
  handleIconSelect: (iconName: string) => void;
} 