"use client";
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface QuestionnaireContextType {
    getFormState: (questionnaireId: string) => any;
    setFormState: (questionnaireId: string, state: any) => void;
    updateFormData: (questionnaireId: string, questionTitle: string, value: any, questionType?: string, options?: any[]) => void;
    initializeQuestions: (questionnaireId: string, sections: any[]) => void;
    clearQuestionnaire: (questionnaireId: string) => void;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | null>(null);

export const useQuestionnaireContext = () => {
    const context = useContext(QuestionnaireContext);
    if (!context) {
        throw new Error('useQuestionnaireContext must be used within a QuestionnaireProvider');
    }
    return context;
};

interface QuestionnaireProviderProps {
    children: React.ReactNode;
}

export const QuestionnaireProvider: React.FC<QuestionnaireProviderProps> = ({ children }) => {
    // Store form states for multiple questionnaires by ID
    const formStates = useRef<Map<string, any>>(new Map());
    const [, setForceUpdate] = useState({});

    // Force re-render when form state changes
    const forceUpdate = useCallback(() => {
        setForceUpdate({});
    }, []);

    // Helper functions for question processing
    const isOtherOption = useCallback((option: any) => {
        if (!option || typeof option !== "object") return false;
        if (!option.name || typeof option.name !== "string") return false;
        return option.name.toLowerCase().startsWith("other");
    }, []);

    const extractType = useCallback((intro = "") => {
        const match = intro.match(/Type:\s*([^)]+)(?:\s*\([^)]*\))?/);
        return match ? match[1].trim() : "";
    }, []);

    const getQuestionType = useCallback((typeString = "") => {
        const TYPE_PATTERNS = {
            CHECKBOX: [/checkbox/i, /check.*box/i, /multiple.*choice/i],
            DROPDOWN: [/dropdown/i, /drop.*down/i, /select(?!\s+radio)/i],
            TOGGLE: [/toggle/i, /switch/i, /boolean/i],
            RADIO: [/radio/i, /radio.*button/i],
            SLIDER: [/slider/i, /range/i, /scale/i],
            TEXT: [/text.*area/i, /long.*text/i, /paragraph/i],
            INPUT: [/input/i, /short.*text/i, /single.*line/i],
        };

        for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
            if (patterns.some((pattern) => pattern.test(typeString))) {
                return type;
            }
        }
        return "TEXT";
    }, []);

    const findOptionsForQuestion = useCallback((sections: any[], questionTitle: string) => {
        const questionIndex = sections.findIndex((section) => section.title === questionTitle);
        if (questionIndex === -1) return [];

        const nextSection = sections[questionIndex + 1];
        if (nextSection?.title === "Options:") {
            return nextSection.items || [];
        }
        return [];
    }, []);

    const processQuestionTitle = useCallback((title: string, questionIndex: number) => {
        // Extract existing question number if present
        const existingNumberMatch = title.match(/^Q(\d+):\s*/i);
        if (existingNumberMatch) {
            // Keep the existing number format
            return title;
        }
        
        // If no number exists, add one based on the index
        const cleanTitle = title.replace(/^Question:\s*/i, "");
        return `Q${questionIndex + 1}: ${cleanTitle}`;
    }, []);

    const extractSliderRange = useCallback((intro: string) => {
        if (!intro.includes("Type: Slider")) {
            return null;
        }

        const rangeMatch = intro.match(/Range:\s*([-]?\d+)(?:\s*\([^)]*\))?\s*-\s*([-]?\d+)(?:\s*\([^)]*\))?/);

        if (rangeMatch) {
            return {
                min: parseInt(rangeMatch[1]),
                max: parseInt(rangeMatch[2]),
            };
        }

        return { min: 0, max: 100 };
    }, []);

    const getFormState = useCallback((questionnaireId: string) => {
        return formStates.current.get(questionnaireId) || {};
    }, []);

    const setFormState = useCallback((questionnaireId: string, state: any) => {
        formStates.current.set(questionnaireId, state);
        forceUpdate();
    }, [forceUpdate]);

    const updateCheckboxData = useCallback((questionTitle: string, options: any[], selectedValues: any[]) => {
        // Helper function to check if an option is an "Other" option
        const isOtherOption = (option: any) => {
            if (!option || typeof option !== "object") return false;
            if (!option.name || typeof option.name !== "string") return false;
            return option.name.toLowerCase().startsWith("other");
        };

        // Create comprehensive checkbox data structure
        const checkboxData: any = {};
        
        // Process all regular options
        options.forEach(option => {
            const optionName = option.name;
            if (isOtherOption(option)) {
                // Handle "Other" option specially
                const otherValue = selectedValues.find(val => 
                    typeof val === "string" && val.startsWith("Other:")
                );
                checkboxData["Other"] = otherValue ? "Selected" : "Not Selected";
                if (otherValue) {
                    checkboxData["Other (Specified)"] = otherValue.replace("Other: ", "");
                }
            } else {
                checkboxData[optionName] = selectedValues.includes(optionName) ? "Selected" : "Not Selected";
            }
        });

        return checkboxData;
    }, []);

    const updateDropdownData = useCallback((questionTitle: string, options: any[], selectedValue: string) => {
        // Create comprehensive dropdown data structure
        const dropdownData: any = {};
        
        // Process all options
        options.forEach(option => {
            const optionName = option.name;
            if (isOtherOption(option)) {
                // Handle "Other" option specially
                if (selectedValue && selectedValue.startsWith("Other:")) {
                    dropdownData["Other"] = "Selected";
                    dropdownData["Other (Specified)"] = selectedValue.replace("Other: ", "");
                } else {
                    dropdownData["Other"] = "Not Selected";
                }
            } else {
                dropdownData[optionName] = selectedValue === optionName ? "Selected" : "Not Selected";
            }
        });

        return dropdownData;
    }, [isOtherOption]);

    const updateFormData = useCallback((
        questionnaireId: string, 
        questionTitle: string, 
        value: any, 
        questionType: string = 'TEXT', 
        options: any[] = []
    ) => {
        const currentState = formStates.current.get(questionnaireId) || {};
        
        if (questionType === "CHECKBOX") {
            const checkboxData = updateCheckboxData(questionTitle, options, value);
            currentState[questionTitle] = checkboxData;
        } else if (questionType === "DROPDOWN") {
            const dropdownData = updateDropdownData(questionTitle, options, value);
            currentState[questionTitle] = dropdownData;
        } else {
            currentState[questionTitle] = value;
        }
        
        formStates.current.set(questionnaireId, currentState);
        forceUpdate();
    }, [updateCheckboxData, updateDropdownData, forceUpdate]);

    const initializeQuestions = useCallback((questionnaireId: string, sections: any[]) => {
        const currentState = formStates.current.get(questionnaireId) || {};
        let hasNewQuestions = false;
        let questionIndex = 0;

        // Process each section to initialize questions with default values
        sections.forEach(section => {
            if (section.intro?.includes("Type:")) {
                const type = extractType(section.intro);
                const questionType = getQuestionType(type);
                const numberedTitle = processQuestionTitle(section.title, questionIndex);
                const options = findOptionsForQuestion(sections, section.title);

                // Only initialize if question doesn't already exist
                if (!(numberedTitle in currentState)) {
                    hasNewQuestions = true;
                    
                    switch (questionType) {
                        case "SLIDER": {
                            const range = extractSliderRange(section.intro);
                            currentState[numberedTitle] = range ? Math.floor(range.max / 2) : 50;
                            break;
                        }
                        case "TOGGLE":
                            currentState[numberedTitle] = false;
                            break;
                        case "CHECKBOX": {
                            // Initialize checkbox with all options as "Not Selected"
                            const checkboxData: any = {};
                            options.forEach(option => {
                                if (isOtherOption(option)) {
                                    checkboxData["Other"] = "Not Selected";
                                } else {
                                    checkboxData[option.name] = "Not Selected";
                                }
                            });
                            currentState[numberedTitle] = checkboxData;
                            break;
                        }
                        case "DROPDOWN": {
                            // Initialize dropdown with all options as "Not Selected"
                            const dropdownData: any = {};
                            options.forEach(option => {
                                if (isOtherOption(option)) {
                                    dropdownData["Other"] = "Not Selected";
                                } else {
                                    dropdownData[option.name] = "Not Selected";
                                }
                            });
                            currentState[numberedTitle] = dropdownData;
                            break;
                        }
                        case "RADIO":
                        case "TEXT":
                        case "INPUT":
                            currentState[numberedTitle] = "";
                            break;
                        default:
                            currentState[numberedTitle] = null;
                    }
                }
                questionIndex++;
            }
        });

        // Only update if we added new questions
        if (hasNewQuestions) {
            formStates.current.set(questionnaireId, currentState);
            forceUpdate();
        }
    }, [extractType, getQuestionType, processQuestionTitle, findOptionsForQuestion, extractSliderRange, isOtherOption, forceUpdate]);

    const clearQuestionnaire = useCallback((questionnaireId: string) => {
        formStates.current.delete(questionnaireId);
        forceUpdate();
    }, [forceUpdate]);

    const contextValue: QuestionnaireContextType = {
        getFormState,
        setFormState,
        updateFormData,
        initializeQuestions,
        clearQuestionnaire
    };

    return (
        <QuestionnaireContext.Provider value={contextValue}>
            {children}
        </QuestionnaireContext.Provider>
    );
};
