import {
    TextIcon,
    AlignLeft,
    ToggleLeft,
    ListFilter,
    Sliders,
    Key,
    KeySquare,
    Command,
    CheckSquare,
    Tag,
    Palette,
    Calendar,
    PanelRightOpen,
    Menu,
    Upload,
    Image as ImageIcon,
    Braces,
    Hash,
    Phone,
    Radio,
    Link2,
    ExternalLink,
    Search,
    Sheet,
    Star,
    Clock,
    ChevronDown,
    Check,
    Component
} from 'lucide-react';

import {
    ENTITY_FIELD_COMPONENTS,
} from "@/components/matrx/ArmaniForm/field-components";

const componentIconMap = {
    INPUT: TextIcon,
    TEXTAREA: AlignLeft,
    SWITCH: ToggleLeft,
    SELECT: ListFilter,
    SLIDER: Sliders,
    UUID_FIELD: Key,
    UUID_ARRAY: KeySquare,
    BUTTON: Command,
    CHECKBOX: CheckSquare,
    CHIP: Tag,
    COLOR_PICKER: Palette,
    DATE_PICKER: Calendar,
    DRAWER: PanelRightOpen,
    MENU: Menu,
    FILE_UPLOAD: Upload,
    IMAGE_DISPLAY: ImageIcon,
    JSON_EDITOR: Braces,
    NUMBER_INPUT: Hash,
    PHONE_INPUT: Phone,
    RADIO_GROUP: Radio,
    RELATIONAL_INPUT: Link2,
    RELATIONAL_BUTTON: ExternalLink,
    SEARCH_INPUT: Search,
    SHEET: Sheet,
    STAR_RATING: Star,
    TIME_PICKER: Clock,
    ACCORDION_VIEW: ChevronDown,
    ACCORDION_SELECTED: Check,
} as const;

export function ComponentIcon(
    {
        component,
        className,
        size = 16,
        strokeWidth = 2
    }: {
        component: keyof typeof ENTITY_FIELD_COMPONENTS;
        className?: string;
        size?: number;
        strokeWidth?: number;
    }) {
    const IconComponent = componentIconMap[component] || Component;

    return (
        <IconComponent
            className={className}
            size={size}
            strokeWidth={strokeWidth}
        />
    );
}
