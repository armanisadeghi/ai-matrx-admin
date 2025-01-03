import { ComponentDensity } from "@/types/componentConfigTypes";


type FormComponentType = 'input' | 'textarea' | 'select' | 'switch' | 'checkbox' | 'radio';

const formComponentStyles = {
    base: {
        compact: 'w-full rounded-sm border border-gray-200 bg-white text-sm',
        normal: 'w-full rounded-md border border-gray-200 bg-white text-base',
        comfortable: 'w-full rounded-lg border border-gray-200 bg-white text-lg'
    },
    padding: {
        compact: 'px-1 py-0.5',
        normal: 'px-1.5 py-1',
        comfortable: 'px-2.5 py-2'
    },
    states: {
        compact: 'hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500',
        normal: 'hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500',
        comfortable: 'hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'
    }
};

export const getFormComponentStyle = (component: FormComponentType, density: ComponentDensity): string => {
    // Combine relevant styles based on component type
    const baseStyle = formComponentStyles.base[density];
    const paddingStyle = formComponentStyles.padding[density];
    const stateStyle = formComponentStyles.states[density];

    return `${baseStyle} ${paddingStyle} ${stateStyle}`;
};