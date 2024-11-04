'use client';

import {useToast} from "@/components/ui";


const showConfirmDialog = async (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const confirmed = window.confirm(message); // Simple confirmation for testing
        resolve(confirmed);
    });
};


const showErrorToast = (message: string) => {
    const {toast} = useToast();

    toast({
        title: "Error",
        description: message,
        action: null,
    });
};

export { showConfirmDialog, showErrorToast };
