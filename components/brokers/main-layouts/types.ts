import { AppletTheme } from "./applet-themes";


// TO BE DELETED

export interface BrokerComponentsDisplayProps {
    prepareRecipeHook: any;
    recipeTitle?: string;
    recipeDescription?: string;
    recipeActionText?: string;
    theme?: AppletTheme;
    socketHook?: any;
    onSubmit?: () => void;
}
