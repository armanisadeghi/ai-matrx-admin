// utils/overrideConsoleWarning.ts

export function overrideConsoleWarning(handleWarning: (message: string) => void) {
    const originalWarn = console.warn;

    console.warn = (message: any, ...optionalParams: any[]) => {
        const warningMessage = typeof message === 'string' ? message : message?.toString();

        // Check if the message includes the specific warning about selectors
        if (
            warningMessage?.includes("Selector unknown returned the root state when called") ||
            warningMessage?.includes("Selectors that return the entire state")
        ) {
            handleWarning(warningMessage);
        } else {
            // Otherwise, call the original console.warn
            originalWarn(message, ...optionalParams);
        }
    };

    // Return a function to restore the original console.warn
    return () => {
        console.warn = originalWarn;
    };
}
