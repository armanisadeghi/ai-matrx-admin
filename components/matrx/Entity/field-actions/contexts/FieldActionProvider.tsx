// contexts/FieldActionProvider.tsx
import React from 'react';
import { FieldActionContext } from './FieldActionContext';
import { ActionTargetConfig } from '../types';

interface FieldActionState {
    activeActions: Record<string, {
        id: string;
        content: React.ReactNode;
        target: ActionTargetConfig;
    }>;
    sections: Record<string, {
        id: string;
        content: React.ReactNode[];
    }>;
}

type Action =
    | { type: 'REGISTER_SECTION'; payload: { id: string } }
    | { type: 'RENDER_IN_SECTION'; payload: { sectionId: string; content: React.ReactNode; config: ActionTargetConfig } }
    | { type: 'CLEAR_SECTION'; payload: { sectionId: string } }
    | { type: 'REMOVE_FROM_SECTION'; payload: { sectionId: string; contentId: string } };

const fieldActionReducer = (state: FieldActionState, action: Action): FieldActionState => {
    switch (action.type) {
        case 'REGISTER_SECTION':
            return {
                ...state,
                sections: {
                    ...state.sections,
                    [action.payload.id]: {
                        id: action.payload.id,
                        content: []
                    }
                }
            };

        case 'RENDER_IN_SECTION':
            const { sectionId, content, config } = action.payload;
            const section = state.sections[sectionId];

            if (!section) return state;

            let newContent = [...section.content];

            switch (config.position) {
                case 'prepend':
                    newContent.unshift(content);
                    break;
                case 'replace':
                    newContent = [content];
                    break;
                case 'append':
                default:
                    newContent.push(content);
            }

            return {
                ...state,
                sections: {
                    ...state.sections,
                    [sectionId]: {
                        ...section,
                        content: newContent
                    }
                }
            };

        case 'CLEAR_SECTION':
            return {
                ...state,
                sections: {
                    ...state.sections,
                    [action.payload.sectionId]: {
                        ...state.sections[action.payload.sectionId],
                        content: []
                    }
                }
            };

        case 'REMOVE_FROM_SECTION':
            const targetSection = state.sections[action.payload.sectionId];
            if (!targetSection) return state;

            return {
                ...state,
                sections: {
                    ...state.sections,
                    [action.payload.sectionId]: {
                        ...targetSection,
                        content: targetSection.content.filter(
                            (_, index) => index.toString() !== action.payload.contentId
                        )
                    }
                }
            };

        default:
            return state;
    }
};

export const FieldActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(fieldActionReducer, {
        activeActions: {},
        sections: {}
    });

    const registerSection = React.useCallback((id: string) => {
        dispatch({ type: 'REGISTER_SECTION', payload: { id } });
    }, []);

    const renderInSection = React.useCallback(
        (sectionId: string, content: React.ReactNode, config: ActionTargetConfig) => {
            dispatch({
                type: 'RENDER_IN_SECTION',
                payload: { sectionId, content, config }
            });
        },
        []
    );

    const clearSection = React.useCallback((sectionId: string) => {
        dispatch({ type: 'CLEAR_SECTION', payload: { sectionId } });
    }, []);

    const removeFromSection = React.useCallback(
        (sectionId: string, contentId: string) => {
            dispatch({
                type: 'REMOVE_FROM_SECTION',
                payload: { sectionId, contentId }
            });
        },
        []
    );

    return (
        <FieldActionContext.Provider
            value={{
                state,
                registerSection,
                renderInSection,
                clearSection,
                removeFromSection
            }}
        >
            {children}
        </FieldActionContext.Provider>
    );
};
