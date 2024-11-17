// hooks/useCustomRenderer.tsx
import React from 'react';
import { useRouter } from 'next/navigation';

interface RenderConfig {
    type: 'modal' | 'sheet' | 'section' | 'route';
    target?: string;
    props?: Record<string, any>;
}

export const useCustomRenderer = () => {
    const router = useRouter();

    const render = React.useCallback(
        (component: React.ComponentType<any>, config: RenderConfig) => {
            switch (config.type) {
                case 'route':
                    router.push(config.target || '/');
                    break;

                case 'modal':
                    // Render in modal
                    break;

                case 'sheet':
                    // Render in sheet
                    break;

                case 'section':
                    // Render in section
                    break;
            }
        },
        [router]
    );

    return { render };
};
