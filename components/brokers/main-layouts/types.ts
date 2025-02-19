import { RunGenericHookType } from "@/hooks/run-recipe/useRunApps";
import { AppletTheme } from "./applet-themes";
import { CompiledToSocketHook } from "@/lib/redux/socket/hooks/useCompiledToSocket";


export interface BrokerComponentsDisplayProps {
    prepareRecipeHook: RunGenericHookType;
    recipeTitle?: string;
    recipeDescription?: string;
    recipeActionText?: string;
    theme?: AppletTheme;
    socketHook?: CompiledToSocketHook;
    onSubmit?: () => void;
}
