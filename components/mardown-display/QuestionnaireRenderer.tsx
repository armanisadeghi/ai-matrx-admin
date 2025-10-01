import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bug } from "lucide-react";
import { THEMES } from "./themes";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useQuestionnaireContext } from "./context/QuestionnaireContext";
import { selectFirstPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
// Helper function to check if an option is an "Other" option
const isOtherOption = (option) => {
    if (!option || typeof option !== "object") return false;
    if (!option.name || typeof option.name !== "string") return false;
    return option.name.toLowerCase().startsWith("other");
};

// Helper function to extract type from intro text
const extractType = (intro = "") => {
    const match = intro.match(/Type:\s*([^)]+)(?:\s*\([^)]*\))?/);
    return match ? match[1].trim() : "";
};

// Helper function to find options for a question
const findOptionsForQuestion = (sections, questionTitle) => {
    const questionIndex = sections.findIndex((section) => section.title === questionTitle);
    if (questionIndex === -1) return [];

    const nextSection = sections[questionIndex + 1];
    if (nextSection?.title === "Options:") {
        return nextSection.items || [];
    }
    return [];
};

// Type matcher patterns
const TYPE_PATTERNS = {
    CHECKBOX: [/checkbox/i, /check.*box/i, /multiple.*choice/i],
    DROPDOWN: [/dropdown/i, /drop.*down/i, /select(?!\s+radio)/i],
    TOGGLE: [/toggle/i, /switch/i, /boolean/i],
    RADIO: [/radio/i, /radio.*button/i],
    SLIDER: [/slider/i, /range/i, /scale/i],
    TEXT: [/text.*area/i, /long.*text/i, /paragraph/i],
    INPUT: [/input/i, /short.*text/i, /single.*line/i],
};

const getQuestionType = (typeString = "") => {
    for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
        if (patterns.some((pattern) => pattern.test(typeString))) {
            return type;
        }
    }
    return "TEXT";
};

const processQuestionTitle = (title, questionIndex) => {
    // Extract existing question number if present
    const existingNumberMatch = title.match(/^Q(\d+):\s*/i);
    if (existingNumberMatch) {
        // Keep the existing number format
        return title;
    }
    
    // If no number exists, add one based on the index
    const cleanTitle = title.replace(/^Question:\s*/i, "");
    return `Q${questionIndex + 1}: ${cleanTitle}`;
};

const getDefaultValue = (questionType, options = []) => {
    switch (questionType) {
        case "SLIDER":
            return 50; // Default middle value
        case "TOGGLE":
            return false;
        case "CHECKBOX": {
            // Initialize checkbox with all options as "Not Selected"
            const checkboxData = {};
            options.forEach(option => {
                if (isOtherOption(option)) {
                    checkboxData["Other"] = "Not Selected";
                } else {
                    checkboxData[option.name] = "Not Selected";
                }
            });
            return checkboxData;
        }
        case "DROPDOWN": {
            // Initialize dropdown with all options as "Not Selected"
            const dropdownData = {};
            options.forEach(option => {
                if (isOtherOption(option)) {
                    dropdownData["Other"] = "Not Selected";
                } else {
                    dropdownData[option.name] = "Not Selected";
                }
            });
            return dropdownData;
        }
        case "RADIO":
        case "TEXT":
        case "INPUT":
            return "";
        default:
            return null;
    }
};


// Individual question type components with Other handling
const CheckboxQuestion = ({ options = [], onChange, value = {}, theme }) => {
    // Convert the object-based value back to array format for internal logic
    const convertToArrayFormat = useCallback((checkboxData) => {
        if (!checkboxData || typeof checkboxData !== 'object') return [];
        
        const selectedItems = [];
        Object.entries(checkboxData).forEach(([key, status]) => {
            if (status === "Selected") {
                if (key === "Other" && checkboxData["Other (Specified)"]) {
                    selectedItems.push(`Other: ${checkboxData["Other (Specified)"]}`);
                } else if (key !== "Other (Specified)") {
                    selectedItems.push(key);
                }
            }
        });
        return selectedItems;
    }, []);

    const [selectedValues, setSelectedValues] = useState(() => new Set(convertToArrayFormat(value)));
    
    // Extract existing "Other" value if present
    const [otherValue, setOtherValue] = useState(() => {
        if (typeof value === 'object' && value["Other (Specified)"]) {
            return value["Other (Specified)"];
        }
        // Fallback for legacy array format
        const arrayValue = Array.isArray(value) ? value : convertToArrayFormat(value);
        const otherValue = arrayValue.find((v) => v?.startsWith("Other:"));
        return otherValue ? otherValue.replace("Other: ", "") : "";
    });

    useEffect(() => {
        const arrayFormat = convertToArrayFormat(value);
        setSelectedValues(new Set(arrayFormat));
        
        if (typeof value === 'object' && value["Other (Specified)"]) {
            setOtherValue(value["Other (Specified)"]);
        } else {
            const otherValue = arrayFormat.find((v) => v?.startsWith("Other:"));
            if (otherValue) {
                setOtherValue(otherValue.replace("Other: ", ""));
            }
        }
    }, [value, convertToArrayFormat]);

    const handleCheckboxChange = (optionName, checked, isOther = false) => {
        const newSelected = new Set(selectedValues);

        if (checked) {
            if (isOther) {
                newSelected.add(`Other: ${otherValue}`);
            } else {
                newSelected.add(optionName);
            }
        } else {
            if (isOther) {
                // Remove any "Other:" entries
                const updatedSelected = Array.from(newSelected).filter((value) => typeof value === "string" && !value.startsWith("Other:"));
                newSelected.clear();
                updatedSelected.forEach((value) => newSelected.add(value));
            } else {
                newSelected.delete(optionName);
            }
        }

        setSelectedValues(newSelected);
        // Pass array format to onChange - the hook will convert it to object format
        onChange(Array.from(newSelected));
    };

    return (
        <div className="space-y-4">
            {options.map((option, index) => {
                const isOther = isOtherOption(option);
                const isOtherSelected = Array.from(selectedValues).some((value) => typeof value === "string" && value.startsWith("Other:"));

                return (
                    <div key={index} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`option-${index}`}
                                checked={isOther ? isOtherSelected : selectedValues.has(option.name)}
                                onCheckedChange={(checked) => handleCheckboxChange(option.name, checked, isOther)}
                            />
                            <Label htmlFor={`option-${index}`} className="text-sm">
                                {isOther ? "Other" : option.name}
                            </Label>
                        </div>
                        {isOther && isOtherSelected && (
                            <Input
                                type="text"
                                placeholder="Please specify"
                                value={otherValue}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setOtherValue(newValue);
                                    const newSelected = new Set(
                                        Array.from(selectedValues).filter(
                                            (value) => typeof value === "string" && !value.startsWith("Other:")
                                        )
                                    );
                                    newSelected.add(`Other: ${newValue}`);
                                    setSelectedValues(newSelected);
                                    // Pass array format to onChange - the hook will convert it to object format
                                    onChange(Array.from(newSelected));
                                }}
                                className={`w-full ${theme.input.background} border-2 ${theme.input.border} ${theme.input.text}`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const DropdownQuestion = ({ options = [], onChange, value = {}, theme }) => {
    // Convert the object-based value back to string format for internal UI logic
    const convertToStringFormat = useCallback((dropdownData) => {
        if (!dropdownData || typeof dropdownData !== 'object') return "";
        
        // Find the selected option
        for (const [key, status] of Object.entries(dropdownData)) {
            if (status === "Selected") {
                if (key === "Other" && dropdownData["Other (Specified)"]) {
                    return `Other: ${dropdownData["Other (Specified)"]}`;
                } else if (key !== "Other (Specified)") {
                    return key;
                }
            }
        }
        return "";
    }, []);

    const [selectedValue, setSelectedValue] = useState(() => convertToStringFormat(value));
    const [otherValue, setOtherValue] = useState(() => {
        if (typeof value === 'object' && value["Other (Specified)"]) {
            return value["Other (Specified)"];
        }
        const stringValue = convertToStringFormat(value);
        return stringValue.startsWith("Other: ") ? stringValue.replace("Other: ", "") : "";
    });

    useEffect(() => {
        const stringFormat = convertToStringFormat(value);
        setSelectedValue(stringFormat);
        
        if (typeof value === 'object' && value["Other (Specified)"]) {
            setOtherValue(value["Other (Specified)"]);
        } else if (stringFormat.startsWith("Other: ")) {
            setOtherValue(stringFormat.replace("Other: ", ""));
        }
    }, [value, convertToStringFormat]);

    const handleSelectionChange = (newValue) => {
        setSelectedValue(newValue);
        if (!isOtherOption({ name: newValue })) {
            onChange(newValue);
        } else {
            onChange(`Other: ${otherValue}`);
        }
    };

    return (
        <div className="space-y-4">
            <Select value={selectedValue} onValueChange={handleSelectionChange}>
                <SelectTrigger className={`w-full ${theme.input.background} border-1 ${theme.input.border} ${theme.input.text}`}>
                    <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option, index) => (
                        <SelectItem key={index} value={option.name}>
                            {isOtherOption(option) ? "Other" : option.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedValue && isOtherOption({ name: selectedValue }) && (
                <Input
                    type="text"
                    placeholder="Please specify"
                    value={otherValue}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setOtherValue(newValue);
                        onChange(`Other: ${newValue}`);
                    }}
                    className={`w-full ${theme.input.background} border-2 ${theme.input.border} ${theme.input.text}`}
                />
            )}
        </div>
    );
};

const RadioQuestion = ({ options = [], onChange, value = "", theme }) => {
    const [selectedValue, setSelectedValue] = useState(value);
    const [otherValue, setOtherValue] = useState("");

    const handleSelectionChange = (value) => {
        setSelectedValue(value);
        if (!isOtherOption({ name: value })) {
            onChange(value);
        } else {
            onChange(`Other: ${otherValue}`);
        }
    };

    return (
        <RadioGroup value={selectedValue} onValueChange={handleSelectionChange} className="space-y-2">
            {options.map((option, index) => {
                const isOther = isOtherOption(option.name);
                return (
                    <div key={index} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value={option.name} id={`radio-${index}`} />
                            <Label htmlFor={`radio-${index}`} className="text-sm">
                                {isOther ? "Other" : option.name}
                            </Label>
                        </div>
                        {isOther && selectedValue === option.name && (
                            <Input
                                type="text"
                                placeholder="Please specify"
                                value={otherValue}
                                onChange={(e) => {
                                    setOtherValue(e.target.value);
                                    onChange(`Other: ${e.target.value}`);
                                }}
                                className={`w-full ${theme.input.background} border-2 ${theme.input.border} ${theme.input.text}`}
                            />
                        )}
                    </div>
                );
            })}
        </RadioGroup>
    );
};

const ToggleQuestion = ({ options = [], onChange, value = false, theme }) => (
    <div className="flex items-center space-x-2">
        <Switch checked={value} onCheckedChange={onChange} />
        <Label>{options[0]?.name || "Yes/No"}</Label>
    </div>
);

const TextQuestion = ({ onChange, value = "", theme }) => (
    <Textarea
        className={`w-full min-h-[100px] ${theme.input.background} border-2 ${theme.input.border} ${theme.input.text}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
    />
);

const SliderQuestion = ({ onChange, value, questionData, theme }) => {
    const range = extractSliderRange(questionData.intro);
    const { min, max } = range || {};
    const currentValue = value ?? Math.floor(max / 2);

    return (
        <div className="w-full">
            <Slider
                value={[currentValue]}
                min={min}
                max={max}
                step={1}
                className={`w-full ${theme.input.background} border-1 ${theme.input.border} rounded-2xl ${theme.input.text} mb-2`}
                onValueChange={onChange}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>{min}</span>
                <span>Current: {currentValue}</span>
                <span>{max}</span>
            </div>
        </div>
    );
};

const InputQuestion = ({ onChange, value = "", theme }) => (
    <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${theme.input.background} border-2 ${theme.input.border} ${theme.input.text}`}
    />
);

// Question component that determines which type to render
const QuestionComponent = ({ questionData, options, onChange, value, theme }) => {
    if (!questionData) return null;

    const { title, intro } = questionData;
    const typeString = extractType(intro);
    const questionType = getQuestionType(typeString);

    const renderQuestion = () => {
        switch (questionType) {
            case "CHECKBOX":
                return <CheckboxQuestion options={options} onChange={onChange} value={value} theme={theme} />;
            case "DROPDOWN":
                return <DropdownQuestion options={options} onChange={onChange} value={value} theme={theme} />;
            case "RADIO":
                return <RadioQuestion options={options} onChange={onChange} value={value} theme={theme} />;
            case "TOGGLE":
                return <ToggleQuestion options={options} onChange={onChange} value={value} theme={theme} />;
            case "SLIDER":
                return <SliderQuestion onChange={onChange} value={value} questionData={questionData} theme={theme} />;
            case "TEXT":
                return <TextQuestion onChange={onChange} value={value} theme={theme} />;
            case "INPUT":
                return <InputQuestion onChange={onChange} value={value} theme={theme} />;
            default:
                return <TextQuestion onChange={onChange} value={value} theme={theme} />;
        }
    };

    const description = intro.startsWith("Type:") ? "" : intro;

    return (
        <Card className={`w-full mb-4 ${theme.card.background}`}>
            <CardHeader className={`mb-2 py-3 ${theme.card.border}`}>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>{renderQuestion()}</CardContent>
        </Card>
    );
};

const DebugDisplay = ({ debugMode, formState, questionData }) => {
    if (!debugMode) return null;

    const debugData = {
        responses: formState,
        questions: questionData,
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    return (
        <Card className="bg-slate-50 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Debug View</CardTitle>
                    <CardDescription>Current form state with question context</CardDescription>
                </div>
                <button
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                >
                    Copy to Clipboard
                </button>
            </CardHeader>
            <CardContent>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[calc(100vh-20rem)] text-sm whitespace-pre-wrap break-all">
                    {JSON.stringify(debugData, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
};

const DEBUG_RESPONSES = true;

const DebugToggle = ({ active, onClick }) => {
    if (!DEBUG_RESPONSES) return null;

    return (
        <button
            onClick={onClick}
            className={`fixed top-10 left-4 p-2 rounded-full transition-colors ${
                active
                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            }`}
            title={active ? "Hide Debug View" : "Show Debug View"}
        >
            <Bug className="h-5 w-5" />
        </button>
    );
};

const cleanQuestionTitle = (title) => {
    return title.replace(/^Q\d*:\s*|^Question:\s*/i, "");
};

// Helper function to extract questionnaire header from data
const extractQuestionnaireHeader = (data) => {
    let title = "";
    let description = "";
    
    // First check if intro string has content
    if (data.intro) {
        const lines = data.intro.split('\n').filter(line => line.trim());
        for (const line of lines) {
            const trimmed = line.trim();
            // Extract H1 as title
            if (trimmed.startsWith('# ')) {
                title = trimmed.replace(/^#\s+/, '');
            }
            // Skip "Introduction" heading but collect actual intro text
            else if (!trimmed.startsWith('##') && !trimmed.match(/^Introduction$/i)) {
                description += (description ? ' ' : '') + trimmed;
            }
        }
    }
    
    // Check if first section is an "Introduction" section or contains the title
    if (data.sections && data.sections.length > 0) {
        const firstSection = data.sections[0];
        const isIntroSection = firstSection.title === "Introduction";
        
        // If first section is "Introduction", use its intro as description
        if (isIntroSection && firstSection.intro) {
            description = firstSection.intro;
        }
        
        // Look for a section with "Questionnaire" in title (usually the title)
        if (!title) {
            for (const section of data.sections.slice(0, 3)) { // Check first 3 sections
                if (section.title.includes('Questionnaire') || section.title.includes('Planning')) {
                    title = section.title.replace(/^#+\s*/, '');
                    break;
                }
            }
        }
    }
    
    return { title, description, hasIntroSection: data.sections?.[0]?.title === "Introduction" };
};

// Header component for questionnaire title and intro
const QuestionnaireHeader = ({ title, description, theme }) => {
    // Only show header if we have description (title is optional)
    if (!description) return null;
    
    return (
        <Card className={`w-full mb-6 ${theme.card.background} border-2 ${theme.card.border}`}>
            <CardHeader className="pb-4">
                {title && (
                    <CardTitle className="text-3xl font-bold text-center mb-3 text-gray-900 dark:text-gray-100">
                        {title}
                    </CardTitle>
                )}
                <CardDescription className="text-base text-center text-gray-700 dark:text-gray-300 leading-relaxed">
                    {description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
};

const extractSliderRange = (intro) => {
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
};

const QuestionnaireRenderer = ({ data, theme = "professional", taskId = null, questionnaireId = null }) => {
    const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));
    const dispatch = useAppDispatch();

    // Generate a unique ID for this questionnaire if not provided
    const uniqueId = questionnaireId || `questionnaire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { getFormState, updateFormData, initializeQuestions } = useQuestionnaireContext();
    const chatActions = getChatActionsWithThunks();
    const [questionData, setQuestionData] = useState({});
    const [debugMode, setDebugMode] = useState(false);
    const themeColors = THEMES[theme];
    
    // Get current form state from context
    const formState = getFormState(uniqueId);
    
    // Track last dispatch to avoid redundant dispatches
    const lastDispatchRef = useRef<string>('');

    // Debounced dispatch to Redux to store form responses
    useEffect(() => {
        // Skip if form state is empty (no user interaction yet)
        if (!formState || Object.keys(formState).length === 0) {
            return;
        }

        const stateString = JSON.stringify(formState);
        
        // Skip if state hasn't actually changed
        if (stateString === lastDispatchRef.current) {
            return;
        }

        // Debounce the dispatch to avoid excessive updates during rapid typing
        const timeoutId = setTimeout(() => {
            dispatch(chatActions.updateModUserContext({
                value: formState,
            }));
            lastDispatchRef.current = stateString;
        }, 500); // 500ms delay - balances responsiveness with performance

        // Cleanup timeout on every formState change
        return () => clearTimeout(timeoutId);
    }, [formState, dispatch, chatActions]);

    useEffect(() => {
        if (data?.sections) {
            // Initialize all questions with default values in context
            initializeQuestions(uniqueId, data.sections);
            
            // Initialize question data for reference
            const questions = data.sections.reduce((acc, section, index) => {
                if (section.intro?.includes("Type:")) {
                    // Use the same numbering logic as in context
                    let questionIndex = 0;
                    for (let i = 0; i <= index; i++) {
                        if (data.sections[i].intro?.includes("Type:")) {
                            if (i === index) break;
                            questionIndex++;
                        }
                    }
                    
                    const numberedTitle = processQuestionTitle(section.title, questionIndex);
                    const options = findOptionsForQuestion(data.sections, section.title);
                    const type = extractType(section.intro);

                    acc[numberedTitle] = {
                        type: type,
                        question: numberedTitle,
                        options: options,
                        intro: section.intro,
                        customSettings: {},
                    };

                    if (type === "Slider") {
                        acc[numberedTitle].customSettings = {
                            range: extractSliderRange(section.intro),
                        };
                    }
                }
                return acc;
            }, {});
            setQuestionData(questions);
        }
    }, [data, uniqueId, initializeQuestions]);

    if (!data || !data.sections) {
        return (
            <Card className="w-full">
                <CardContent className="p-6">
                    <p className="bg-background text-foreground">No questionnaire data available</p>
                </CardContent>
            </Card>
        );
    }

    const handleChange = (questionTitle, value, questionType = null, options = []) => {
        // questionTitle is already numbered, use it directly
        updateFormData(uniqueId, questionTitle, value, questionType, options);
    };

    // Extract questionnaire header and check if there's an intro section
    const { title: questionnaireTitle, description: questionnaireDescription, hasIntroSection } = extractQuestionnaireHeader(data);

    return (
        <>
            <DebugToggle active={debugMode} onClick={() => setDebugMode((prev) => !prev)} />
            <div className={`flex flex-col w-full max-w-3xl mx-auto gap-1 p-2 pb-24 ${themeColors.container.background}`}>
                {/* Questionnaire Header with Title and Intro */}
                <QuestionnaireHeader 
                    title={questionnaireTitle} 
                    description={questionnaireDescription} 
                    theme={themeColors} 
                />
                
                {/* Questions */}
                {data.sections.map((section, index) => {
                    // Skip the Introduction section (it's displayed in the header)
                    if (section.title === "Introduction" || 
                        section.title === "Options:" || 
                        !section.intro?.includes("Type:")) {
                        return null;
                    }

                    // Calculate question index (only count sections with Type:)
                    let questionIndex = 0;
                    for (let i = 0; i < index; i++) {
                        if (data.sections[i].intro?.includes("Type:")) {
                            questionIndex++;
                        }
                    }

                    const options = findOptionsForQuestion(data.sections, section.title);
                    const numberedTitle = processQuestionTitle(section.title, questionIndex);
                    const type = extractType(section.intro);

                    // Prepare custom settings based on question type
                    const customSettings = type === "Slider" ? { range: extractSliderRange(section.intro) } : {};

                    return (
                        <QuestionComponent
                            key={index}
                            questionData={{
                                ...section,
                                title: numberedTitle,
                                customSettings,
                            }}
                            options={options}
                            onChange={(value) => handleChange(numberedTitle, value, getQuestionType(type), options)}
                            value={formState[numberedTitle]}
                            theme={themeColors}
                        />
                    );
                })}

                <div className="mt-6 mb-8">
                    <DebugDisplay debugMode={debugMode} formState={formState} questionData={questionData} />
                </div>
            </div>
        </>
    );
};

export default QuestionnaireRenderer;
