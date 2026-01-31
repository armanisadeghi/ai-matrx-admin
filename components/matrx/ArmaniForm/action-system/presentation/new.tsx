// @ts-nocheck
import React, {useCallback, useState} from "react";
import {
    PRESENTATION_COMPONENTS,
    PresentationTypes
} from "@/components/matrx/ArmaniForm/action-system/presentation/presentationRegistry";
import {Button} from "@/components/ui/button";


type PresentationType = 'sheet' | 'dialog' | 'drawer' | 'popover';
type Position = 'center' | 'left' | 'right' | 'top' | 'bottom';
type Size = 'sm' | 'default' | 'lg' | 'xl' | 'full';
type Density = 'compact' | 'normal' | 'relaxed';
type AnimationPreset = 'smooth' | 'instant' | 'slide' | 'fade';

interface PresentationConfig {
    allowBackgroundInteraction: boolean;
    preventScroll: boolean;
    closeOnOutsideClick: boolean;
    closeOnEscape: boolean;
    density: Density;
    animationPreset: AnimationPreset;
    size: Size;
    position: Position;
}

export const defaultConfig: PresentationConfig = {
    allowBackgroundInteraction: false,
    preventScroll: true,
    closeOnOutsideClick: true,
    closeOnEscape: true,
    density: "normal",
    animationPreset: "smooth",
    size: "default",
    position: "center"
};


interface PresentationControls {
    showClose?: boolean;
    showSave?: boolean;
    showCancel?: boolean;
    showConfirm?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    onConfirm?: () => void;
}


// Enhanced prop definitions for presentations
interface PresentationPropDefinitions {
    trigger: {
        valueType: 'direct';
        isRequired: true;
        metadata: {
            description: 'Component that triggers the presentation';
            type: 'ReactNode';
        };
    };
    content: {
        valueType: 'direct';
        isRequired: true;
        metadata: {
            description: 'Content to display in the presentation';
            type: 'ReactNode';
        };
    };
    variant: {
        valueType: 'direct';
        isRequired: false;
        defaultValue: 'default';
        validation: {
            allowedValues: ['default', 'primary', 'secondary', 'destructive'];
        };
    };
    title: {
        valueType: 'direct';
        isRequired: false;
        validation: {
            type: 'string';
        };
    };
    description: {
        valueType: 'direct';
        isRequired: false;
        validation: {
            type: 'string';
        };
    };
    helpSource: {
        valueType: 'direct';
        isRequired: false;
        validation: {
            type: 'string';
        };
    };
    className: {
        valueType: 'direct';
        isRequired: false;
        defaultValue: '';
        validation: {
            type: 'string';
        };
    };
    config: {
        valueType: 'direct';
        isRequired: false;
        defaultValue: PresentationConfig;
        validation: {
            type: 'PresentationConfig';
        };
    };
    controls: {
        valueType: 'direct';
        isRequired: false;
        validation: {
            type: 'PresentationControls';
        };
    };
    onOpenChange: {
        valueType: 'handler';
        isRequired: true;
        metadata: {
            description: 'Handler for open state changes';
            type: '(isOpen: boolean) => void';
        };
    };
}

// === Registry System ===
interface PresentationDefinition {
    component: React.ComponentType<any>;
    propDefinitions: PresentationPropDefinitions;
    defaultConfig: PresentationConfig;
    metadata?: {
        description?: string;
        usage?: string;
    };
}

class PresentationRegistry {
    private registry = new Map<PresentationType, PresentationDefinition>();

    register(type: PresentationType, definition: PresentationDefinition) {
        this.registry.set(type, definition);
        return () => this.registry.delete(type); // Cleanup function
    }

    get(type: PresentationType): PresentationDefinition | undefined {
        return this.registry.get(type);
    }

    resolveProps(
        type: PresentationType,
        providedProps: Record<string, any>,
        context?: any
    ) {
        const definition = this.registry.get(type);
        if (!definition) {
            throw new Error(`Presentation type not found: ${type}`);
        }

        const resolvedProps: Record<string, any> = {};
        const propDefs = definition.propDefinitions;

        // Resolve each prop based on its definition
        Object.entries(propDefs).forEach(([key, def]) => {
            const provided = providedProps[key];

            if (def.isRequired && provided === undefined) {
                throw new Error(`Required prop missing: ${key}`);
            }

            resolvedProps[key] = provided ?? def.defaultValue;

            // Validate if needed
            if (def.validation) {
                this.validateProp(key, resolvedProps[key], def.validation);
            }
        });

        return resolvedProps;
    }

    private validateProp(key: string, value: any, validation: any) {
        if (validation.allowedValues && !validation.allowedValues.includes(value)) {
            throw new Error(
                `Invalid value for ${key}. Must be one of: ${validation.allowedValues.join(', ')}`
            );
        }
        // Add more validation as needed
    }
}

// === Implementation ===
export const presentationRegistry = new PresentationRegistry();

// Register Sheet Presentation
presentationRegistry.register('sheet', {
    component: PRESENTATION_COMPONENTS.SHEET,
    propDefinitions: {

        trigger: {
            valueType: 'direct',
            isRequired: true,
            metadata: {
                description: 'Component that triggers the presentation',
                type: 'ReactNode',
            },
        },
        content: {
            valueType: 'direct',
            isRequired: true,
            metadata: {
                description: 'Content to display in the presentation',
                type: 'ReactNode',
            },
        },
        // ... other props
    } as any,
    defaultConfig,
    metadata: {
        description: 'Sheet presentation component that slides in from the side',
        usage: 'Use for larger forms or detailed content that needs more space',
    },
});


// === Hook for using presentations ===
export const usePresentation = (type: PresentationType) => {
    const [isOpen, setIsOpen] = useState(false);

    const renderPresentation = useCallback((props: Record<string, any>) => {
        const definition = presentationRegistry.get(type);
        if (!definition) {
            throw new Error(`Presentation type not found: ${type}`);
        }

        const resolvedProps = presentationRegistry.resolveProps(type, {
            ...props,
            onOpenChange: setIsOpen,
        });

        const PresentationComponent = definition.component;
        return <PresentationComponent {...resolvedProps} />;
    }, [type]);

    return {
        isOpen,
        setIsOpen,
        renderPresentation,
    };
};

// === Example Usage ===
const ExampleUsage: React.FC = () => {
    const { renderPresentation } = usePresentation('sheet');

    return renderPresentation({
        trigger: <Button>Open Sheet</Button>,
        content: <div>Sheet Content</div>,
        title: 'Example Sheet',
        config: {
            ...defaultConfig,
            position: 'right',
            size: 'lg',
        },
        controls: {
            showClose: true,
            showSave: true,
            onSave: () => console.log('Save clicked'),
        },
    });
};




// ---------- sort of separate


interface HandlerDefinition {
    type: 'event' | 'callback' | 'async';
    handler: (...args: any[]) => any;
    isResultHandler?: boolean;
    metadata?: {
        description?: string;
        parameters?: Record<string, any>;
        returnType?: string;
    };
}
export interface PropSource {
    type: 'context' | 'redux' | 'computed' | 'direct' | 'static';
    path?: string;
    resolver?: string;
    value?: any;
}

export interface PropDefinitions {
    staticProps: Record<string, any>;
    requiredProps: Record<string, PropSource>;
    optionalProps: Record<string, any>;
}


interface PresentationOverrides {
    props?: Partial<Record<string, PropSource>>;
    handlers?: Record<string, Partial<HandlerDefinition>>;
    config?: Partial<PresentationConfig>;
    controls?: Partial<PresentationControls>;
}

// @ts-ignore - COMPLEX: processProps function needs to be implemented based on prop resolution logic
function processProps(propDefinitions: any, overrides?: Record<string, any>): Record<string, any> {
    // Placeholder implementation - requires full prop resolution system
    return overrides || {};
}

export function createPresentationConfig(
    type: PresentationTypes,
    overrides?: PresentationOverrides
) {
    // @ts-ignore - COMPLEX: PresentationRegistry is a class, should use instance method presentationRegistry.get
    const definition = presentationRegistry.get(type);
    if (!definition) {
        throw new Error(`Presentation type not found: ${type}`);
    }

    return {
        type,
        component: definition.component,
        props: {
            // @ts-ignore - COMPLEX: defaultProps may not exist on definition, requires type refinement
            ...(definition.defaultProps || {}),
            ...processProps(definition.propDefinitions, overrides?.props),
        },
        handlers: {
            ...((definition as any).handlers || {}),
            ...overrides?.handlers,
        },
        config: {
            ...defaultConfig,
            ...overrides?.config,
        },
        controls: overrides?.controls,
    };
}



interface PresentationRendererProps {
    presentationConfig: ReturnType<typeof createPresentationConfig>;
    trigger: React.ReactNode;
    content: React.ReactNode;
}

export function PresentationRenderer(
    {
        presentationConfig,
        trigger,
        content,
    }: PresentationRendererProps) {
    const {component: Component, props, handlers, config, controls} = presentationConfig;

    return (
        <Component
            {...props}
            {...handlers}
            config={config}
            controls={controls}
            trigger={trigger}
            content={content}
        />
    );
}

