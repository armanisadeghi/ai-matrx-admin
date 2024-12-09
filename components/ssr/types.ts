import { LucideIcon } from 'lucide-react';

export type CustomStyles = {
    backgroundColor?: string;
    textColor?: string;
}

export interface OptionCardData {
    id: string;
    displayName: string;
    description: string;
    icon?: LucideIcon;
    customStyles?: CustomStyles;
    additionalFields?: Record<string, unknown>;
}
