// app/(authenticated)/flashcards/constants.ts
import {
    BookA,
    BookOpen,
    Calculator,
    FileCode,
    GraduationCap,
    Landmark,
    LucideIcon,
    MessageCircle,
    Microscope
} from "lucide-react";

import {FlashcardData} from "@/types/flashcards.types";
import {
    flashcardDataSet,
    InitialFlashcardsWithExample,
    vocabFlashcardsTwo,
    vocabFlashcards,
    historyFlashcards,
} from "./app-data";

export const base_app_path = 'flashcard';

export type CustomStyles = {
    backgroundColor?: string;
    textColor?: string;
}

export type CategoryDetails = {
    id: string;
    label: string;
    icon: LucideIcon;
    description: string;
    customStyles?: CustomStyles;
    subCategory?: string;
    tags?: string[];
};

export type CategoryOptions = keyof typeof CATEGORIES;

export type DataSet = {
    category: typeof CATEGORIES[keyof typeof CATEGORIES];
    displayName: string;
    data: FlashcardData[];
    description?: string;
    customStyles?: CustomStyles;
    subCategory?: string;
    tags?: string[];
    icon?: LucideIcon;
};

export type AvailableDataKeys = keyof typeof AVAILABLE_DATA;

export type AvailableData = Record<string, DataSet[]>;


const CATEGORIES: Record<string, CategoryDetails> = {
    history: {
        id: 'history',
        label: 'History',
        icon: BookOpen,
        description: 'Explore key events, dates, and figures that shaped our world',
        customStyles: {
            backgroundColor: 'bg-orange-100 dark:bg-orange-950',
            textColor: 'default',
        },
    },
    math: {
        id: 'math',
        label: 'Math',
        icon: Calculator,
        description: 'Master mathematical concepts, formulas, and problem-solving',
        customStyles: {
            backgroundColor: 'bg-blue-100 dark:bg-blue-950',
            textColor: 'default',
        },
    },
    english: {
        id: 'english',
        label: 'English',
        icon: GraduationCap,
        description: 'Improve grammar, literature comprehension, and writing skills',
        customStyles: {
            backgroundColor: 'bg-green-100 dark:bg-green-950',
            textColor: 'default',
        },
    },
    vocab: {
        id: 'vocab',
        label: 'Vocabulary',
        icon: BookA,
        description: 'Build your vocabulary with essential words and definitions',
        customStyles: {
            backgroundColor: 'bg-purple-100 dark:bg-purple-950',
            textColor: 'default',
        },
    },
    science: {
        id: 'science',
        label: 'Science',
        icon: Microscope,
        description: 'Learn scientific concepts, theories, and discoveries',
        customStyles: {
            backgroundColor: 'bg-cyan-100 dark:bg-cyan-950',
            textColor: 'default',
        },
    },
    debate: {
        id: 'debate',
        label: 'Debate',
        icon: MessageCircle,
        description: 'Practice argumentation, rhetoric, and public speaking',
        customStyles: {
            backgroundColor: 'bg-pink-100 dark:bg-pink-950',
            textColor: 'default',
        },
    },
    custom: {
        id: 'custom',
        label: 'Custom',
        icon: FileCode,
        description: 'Create and study your own custom flashcard sets',
        customStyles: {
            backgroundColor: 'bg-gray-100 dark:bg-gray-900',
            textColor: 'default',
        },
    },
};


export const AVAILABLE_DATA: AvailableData = {
    vocab_set_1: [
        {
            displayName: 'Vocabulary Set 1',
            category: CATEGORIES.vocab,
            data: vocabFlashcards,
            description: 'This is a set of vocabulary flashcards to help you learn new words and their meanings.',
            customStyles: {
                backgroundColor: 'bg-purple-100 dark:bg-purple-950',
                textColor: 'default',
            },
        },
        {
            displayName: 'Vocabulary Set 2',
            category: CATEGORIES.vocab,
            data: vocabFlashcardsTwo,
            description: 'This is another set of vocabulary flashcards to help you expand your word knowledge.',
            customStyles: {
                backgroundColor: 'bg-purple-100 dark:bg-purple-950',
                textColor: 'default',
            },
        },
    ],
    custom_set_1: [
        {
            displayName: 'Custom Set 1',
            category: CATEGORIES.custom,
            data: InitialFlashcardsWithExample,
            description: 'This is a custom set of flashcards that you can use to study any category you like.',
            customStyles: {
                backgroundColor: 'bg-gray-100 dark:bg-gray-900',
                textColor: 'default',
            },
        },
        {
            displayName: 'Custom Set 2',
            category: CATEGORIES.custom,
            data: flashcardDataSet,
            description: 'This is another custom set of flashcards that you can create and study.',
            customStyles: {
                backgroundColor: 'bg-gray-100 dark:bg-gray-900',
                textColor: 'default',
            },
        },
    ],
    history_set_1: [
        {
            displayName: 'Foundations of American Government',
            category: CATEGORIES.history,
            subCategory: 'American Government',
            data: historyFlashcards,
            description: 'This lesson delves into the early development of the United States government, examining the Articles of Confederation and the subsequent creation of the Constitution. It highlights the key principles that underpin American democracy, such as federalism, separation of powers, and the protection of individual rights. Students will explore influential historical documents and figures, gaining insights into the challenges and compromises that shaped the nation. Through interactive discussions and activities, learners will deepen their understanding of the responsibilities of citizenship and the structure of the U.S. government.',
            tags: ['Articles of Confederation', 'Constitution', 'U.S. Government', 'Federalism', 'Separation of Powers', 'Bill of Rights', 'Founding Fathers', 'American History'],
            icon: Landmark,
            customStyles: {
                backgroundColor: 'bg-blue-200 dark:bg-blue-800',
                textColor: 'default',
            },
        },
    ],
    math_set_1: [],
    english_set_1: [],
    science_set_1: [],
    debate_set_1: [],
};

export async function getCategories() {
    return CATEGORIES;
}

export async function getCategoriesArray() {
    return Object.values(CATEGORIES);
}

export async function getDataSets() {
    return AVAILABLE_DATA;
}

export async function getDataByCategory(category: CategoryOptions) {
    return AVAILABLE_DATA[category] || [];
}

export async function getDataByByKey(key: string) {
    return AVAILABLE_DATA[key] || [];
}

export async function getCategoriesForSelect() {
    return Object.values(CATEGORIES).map((category) => ({
        value: category.id,
        label: category.label,
    }));
}

export async function getDataForSelect() {
    return Object.entries(AVAILABLE_DATA)
        .flatMap(([key, sets]) => sets.map((set) => ({
                value: key,
                label: set.displayName,
            }))
        )
        .filter((entry) => entry.label);
}

export async function getDataByCategoryForSelect(category: CategoryOptions) {
    return Object.entries(AVAILABLE_DATA)
        .flatMap(([key, sets]) =>
            sets
                .filter((set) => set.category.id === CATEGORIES[category].id)
                .map((set) => ({
                    key,
                    displayName: set.displayName,
                }))
        );
}

export async function getDataByKeyForSelect(key: string) {
    return AVAILABLE_DATA[key] || [];
}

export async function getAllDataByCategoryKey(categoryKey: string) {
    return Object.entries(AVAILABLE_DATA)
        .flatMap(([key, sets]) =>
            sets
                .filter((set) => set.category && set.category.id === categoryKey)
                .map((set) => ({...set, key}))
        );
}

export async function getDataByDataSetName(dataSetName: string): Promise<FlashcardData[]> {
    const dataSet = AVAILABLE_DATA[dataSetName];
    if (!dataSet || !dataSet[0]?.data) {
        throw new Error(`No data found for dataset name: ${dataSetName}`);
    }
    return dataSet.flatMap((set) => set.data);
}

export const getDataByDataSetNameClient = (dataSetName: string): FlashcardData[] => {
    const dataSet = AVAILABLE_DATA[dataSetName];
    if (!dataSet || !dataSet[0]?.data) {
        throw new Error(`No data found for dataset name: ${dataSetName}`);
    }
    return dataSet.flatMap((set) => set.data);
};


export async function getDataByDataName(dataName: FlashcardData[]) {
    for (const dataSet of Object.values(AVAILABLE_DATA)) {
        for (const item of dataSet) {
            if (item.data === dataName) {
                return item.data;
            }
        }
    }
    throw new Error(`Data with name '${dataName}' does not exist.`);
}



