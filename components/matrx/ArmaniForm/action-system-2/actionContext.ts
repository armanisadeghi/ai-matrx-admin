// actionContext.ts
import { createContext, useContext } from 'react';

interface ActionContextValue {
    triggerAction: (actionId: string) => void;
    closePresentation: () => void;
    showInline: (config: any) => void;
    hideInline: () => void;
}

export const ActionContext = createContext<ActionContextValue | undefined>(undefined);
export const useAction = () => useContext(ActionContext);
