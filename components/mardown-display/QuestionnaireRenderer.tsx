import React, { useState, useEffect } from "react";
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
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFirstPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";


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

// Individual question type components with Other handling
const CheckboxQuestion = ({ options = [], onChange, value = [], theme }) => {
    const [selectedValues, setSelectedValues] = useState(new Set(value));
    // Extract existing "Other" value if present
    const [otherValue, setOtherValue] = useState(() => {
        const otherValue = Array.isArray(value) ? value.find((v) => v?.startsWith("Other:")) : undefined;
        return otherValue ? otherValue.replace("Other: ", "") : "";
    });

    useEffect(() => {
        setSelectedValues(new Set(value));
        const otherValue = Array.isArray(value) ? value.find((v) => v?.startsWith("Other:")) : undefined;
        if (otherValue) {
            setOtherValue(otherValue.replace("Other: ", ""));
        }
    }, [value]);

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

const DropdownQuestion = ({ options = [], onChange, value = "", theme }) => {
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
        <div className="space-y-4">
            <Select value={selectedValue} onValueChange={handleSelectionChange}>
                <SelectTrigger className={`w-full ${theme.input.background} border-1 ${theme.input.border} ${theme.input.text}`}>
                    <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option, index) => (
                        <SelectItem key={index} value={option.name} >
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
                        setOtherValue(e.target.value);
                        onChange(`Other: ${e.target.value}`);
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

const QuestionnaireRenderer = ({ data, theme, taskId=null }) => {
    const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

    const [formState, setFormState] = useState({});
    const [questionData, setQuestionData] = useState({});
    const [debugMode, setDebugMode] = useState(false);
    const themeColors = THEMES[theme];

    useEffect(() => {
        if (data?.sections) {
            const initialState = data.sections.reduce((acc, section) => {
                if (section.intro?.includes("Type:")) {
                    const type = extractType(section.intro);
                    const questionType = getQuestionType(type);
                    const cleanTitle = cleanQuestionTitle(section.title);

                    switch (questionType) {
                        case "SLIDER": {
                            const range = extractSliderRange(section.intro);
                            acc[cleanTitle] = Math.floor(range.max / 2);
                            break;
                        }
                        case "TOGGLE":
                            acc[cleanTitle] = false;
                            break;
                        case "CHECKBOX":
                            acc[cleanTitle] = [];
                            break;
                        case "DROPDOWN":
                        case "RADIO":
                            acc[cleanTitle] = "";
                            break;
                        case "TEXT":
                        case "INPUT":
                            acc[cleanTitle] = "";
                            break;
                        default:
                            acc[cleanTitle] = null;
                    }
                }
                return acc;
            }, {});

            setFormState(initialState);

            const questions = data.sections.reduce((acc, section) => {
                if (section.intro?.includes("Type:")) {
                    const cleanTitle = cleanQuestionTitle(section.title);
                    const options = findOptionsForQuestion(data.sections, section.title);
                    const type = extractType(section.intro);

                    // Initialize with base question data
                    acc[cleanTitle] = {
                        type: type,
                        question: cleanTitle,
                        options: options,
                        intro: section.intro,
                        customSettings: {}, // Default empty object for custom settings
                    };

                    // Add type-specific custom settings
                    if (type === "Slider") {
                        acc[cleanTitle].customSettings = {
                            range: extractSliderRange(section.intro),
                        };
                    }
                    // Future type-specific settings can be added here
                }
                return acc;
            }, {});
            setQuestionData(questions);
        }
    }, [data]);

    if (!data || !data.sections) {
        return (
            <Card className="w-full">
                <CardContent className="p-6">
                    <p className="bg-background text-foreground">No questionnaire data available</p>
                </CardContent>
            </Card>
        );
    }

    const handleChange = (questionTitle, value) => {
        const cleanTitle = cleanQuestionTitle(questionTitle);
        setFormState((prev) => ({
            ...prev,
            [cleanTitle]: value,
        }));
    };

    return (
        <>
            <DebugToggle active={debugMode} onClick={() => setDebugMode((prev) => !prev)} />
            <div className={`flex flex-col w-full max-w-3xl mx-auto gap-1 p-2 pb-24 ${themeColors.container.background}`}>
                {data.sections.map((section, index) => {
                    if (section.title === "Options:" || !section.intro?.includes("Type:")) {
                        return null;
                    }

                    const options = findOptionsForQuestion(data.sections, section.title);
                    const cleanTitle = cleanQuestionTitle(section.title);
                    const type = extractType(section.intro);

                    // Prepare custom settings based on question type
                    const customSettings = type === "Slider" ? { range: extractSliderRange(section.intro) } : {};

                    return (
                        <QuestionComponent
                            key={index}
                            questionData={{
                                ...section,
                                title: cleanTitle,
                                customSettings,
                            }}
                            options={options}
                            onChange={(value) => handleChange(cleanTitle, value)}
                            value={formState[cleanTitle]}
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
