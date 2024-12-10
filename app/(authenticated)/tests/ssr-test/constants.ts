// app/(authenticated)/flashcards/constants.ts
import {
    BookA,
    BookOpen,
    Calculator,
    FileCode,
    GraduationCap,
    LucideIcon,
    MessageCircle,
    Microscope
} from "lucide-react";
import {
    mockDataOne,
    mockDataTwo,
    mockDataThree,
    mockDataFour,
    mockDataFive,
    mockDataSix,
    mockDataSeven,
    mockDataEight,
    mockDataNine,
    mockDataTen,
    mockDataEleven,
    mockDataTwelve,
    mockDataThirteen,
    mockDataFourteen
} from "./app-data";

export const base_app_path = 'tests/ssr-test';


type AppSpecificData = any;

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
};

export type CategoryOptions = keyof typeof CATEGORIES;

export type DataSet = {
    category: typeof CATEGORIES[keyof typeof CATEGORIES];
    displayName: string;
    data: AppSpecificData[];
    description?: string;
    customStyles?: CustomStyles;
};

export type AvailableDataKeys = keyof typeof AVAILABLE_DATA;

export type AvailableData = Record<string, DataSet[]>;


const CATEGORIES: Record<string, CategoryDetails> = {
    option1: {
        id: 'option1',
        label: 'Option One',
        icon: BookOpen,
        description: 'This is a description for the first generic option.',
        customStyles: {
            backgroundColor: 'bg-orange-100 dark:bg-orange-950',
            textColor: 'default'
        }
    },
    option2: {
        id: 'option2',
        label: 'Option Two',
        icon: Calculator,
        description: 'This is a description for the second generic option.',
        customStyles: {
            backgroundColor: 'bg-blue-100 dark:bg-blue-950',
            textColor: 'default'
        }

    },
    option3: {
        id: 'option3',
        label: 'Option Three',
        icon: GraduationCap,
        description: 'This is a description for the third generic option.',
        customStyles: {
            backgroundColor: 'bg-green-100 dark:bg-green-950',
            textColor: 'default'
        }

    },
    option4: {
        id: 'option4',
        label: 'Option Four',
        icon: BookA,
        description: 'This is a description for the fourth generic option.',
        customStyles: {
            backgroundColor: 'bg-purple-100 dark:bg-purple-950',
            textColor: 'default'
        }

    },
    option5: {
        id: 'option5',
        label: 'Option Five',
        icon: Microscope,
        description: 'This is a description for the fifth generic option.',
        customStyles: {
            backgroundColor: 'bg-cyan-100 dark:bg-cyan-950',
            textColor: 'default'
        }

    },
    option6: {
        id: 'option6',
        label: 'Option Six',
        icon: MessageCircle,
        description: 'This is a description for the sixth generic option.',
        customStyles: {
            backgroundColor: 'bg-pink-100 dark:bg-pink-950',
            textColor: 'default'
        }
    },
    option7: {
        id: 'option7',
        label: 'Option Seven',
        icon: FileCode,
        description: 'This is a description for the seventh generic option.',
        customStyles: {
            backgroundColor: 'bg-gray-100 dark:bg-gray-900',
            textColor: 'default'
        }
    },
};


export const AVAILABLE_DATA: AvailableData = {
    data_set_1: [
        {
            displayName: 'Vocabulary Set 1',
            category: CATEGORIES.option1,
            data: mockDataOne,
            description: 'This is a set of vocabulary flashcards to help you learn new words and their meanings.',
            customStyles: {
                backgroundColor: 'bg-blue-100 dark:bg-blue-950',
                textColor: 'default'
            }
        },
        {
            displayName: 'Vocabulary Set 2',
            category: CATEGORIES.option1,
            data: mockDataTwo,
            description: 'This is another set of vocabulary flashcards to help you expand your word knowledge.',
            customStyles: {
                backgroundColor: 'bg-green-100 dark:bg-green-950',
                textColor: 'default'
            }
        },
    ],
    data_set_2: [
        {
            displayName: 'Custom Set 1',
            category: CATEGORIES.option2,
            data: mockDataThree,
            description: 'This is a custom set of flashcards that you can use to study any category you like.',
            customStyles: {
                backgroundColor: 'bg-yellow-100 dark:bg-yellow-950',
                textColor: 'default'
            }
        },
        {
            displayName: 'Custom Set 2',
            category: CATEGORIES.option2,
            data: mockDataFour,
            description: 'This is another custom set of flashcards that you can create and study.',
            customStyles: {
                backgroundColor: 'bg-red-100 dark:bg-red-950',
                textColor: 'default'
            }
        },
    ],
    data_set_3: [
        {
            displayName: 'Advanced Vocabulary Set 1',
            category: CATEGORIES.option3,
            data: mockDataFive,
            description: 'This is an advanced vocabulary set for learners looking to challenge themselves.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
        {
            displayName: 'Advanced Vocabulary Set 2',
            category: CATEGORIES.option3,
            data: mockDataSix,
            description: 'Another advanced vocabulary set for improving your language skills.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
    ],
    data_set_4: [
        {
            displayName: 'Physics Set 1',
            category: CATEGORIES.option4,
            data: mockDataSeven,
            description: 'This is a physics-themed set of flashcards for mastering scientific concepts.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
        {
            displayName: 'Physics Set 2',
            category: CATEGORIES.option4,
            data: mockDataEight,
            description: 'Another physics-themed set for learning more complex scientific topics.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
    ],
    data_set_5: [
        {
            displayName: 'Chemistry Set 1',
            category: CATEGORIES.option5,
            data: mockDataNine,
            description: 'This is a chemistry-themed set of flashcards to help you understand molecular structures and reactions.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
        {
            displayName: 'Chemistry Set 2',
            category: CATEGORIES.option5,
            data: mockDataTen,
            description: 'A second chemistry set to reinforce your knowledge of the periodic table and chemical reactions.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
    ],
    data_set_6: [
        {
            displayName: 'Programming Set 1',
            category: CATEGORIES.option6,
            data: mockDataEleven,
            description: 'This set is designed for learning programming concepts and coding practices.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
        {
            displayName: 'Programming Set 2',
            category: CATEGORIES.option6,
            data: mockDataTwelve,
            description: 'Another programming set for those who want to delve deeper into software development.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
    ],
    data_set_7: [
        {
            displayName: 'Web Development Set 1',
            category: CATEGORIES.option7,
            data: mockDataThirteen,
            description: 'A set focused on web development principles and practices, ideal for beginners.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
        {
            displayName: 'Web Development Set 2',
            category: CATEGORIES.option7,
            data: mockDataFourteen,
            description: 'A second web development set for more advanced topics and best practices.',
            customStyles: {
                backgroundColor: 'default',
                textColor: 'default'
            }
        },
    ],
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

export async function getDataByDataSetName(dataSetName: string) {
    return AVAILABLE_DATA[dataSetName];
}

export const getDataByDataSetNameClient = (dataSetName: string) => {
    return AVAILABLE_DATA[dataSetName];
};


export async function getDataByDataName(dataName: AppSpecificData[]) {
    for (const dataSet of Object.values(AVAILABLE_DATA)) {
        for (const item of dataSet) {
            if (item.data === dataName) {
                return item.data;
            }
        }
    }
    throw new Error(`Data with name '${dataName}' does not exist.`);
}

