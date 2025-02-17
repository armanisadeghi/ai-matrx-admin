import { RunGenericHookType } from "@/hooks/run-recipe/useRunApps";
import { DisplayTheme } from "@/components/mardown-display/themes";

export interface BrokerComponentsDisplayProps {
    prepareRecipeHook: RunGenericHookType;
    recipeTitle?: string;
    recipeDescription?: string;
    recipeActionText?: string;
    themeName?: DisplayTheme;
    onSubmit?: () => void;
}
