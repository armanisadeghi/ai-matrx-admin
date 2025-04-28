// SearchGroupField.tsx
import React from "react";
import { useAppletData } from "@/context/AppletDataContext";
import DesktopSearchGroup from "./DesktopSearchFieldGroup";
import MobileSearchGroup from "./MobileSearchFieldGroup";
import { GroupFieldConfig } from "../../field-components/types";

interface SearchGroupFieldProps {
    id: string;
    label: string;
    placeholder: string;
    description?: string;
    fields: GroupFieldConfig[];
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: React.ReactNode;
    className?: string;
    isMobile?: boolean;
    hideWhenInactive?: boolean;
}

const SearchGroupField: React.FC<SearchGroupFieldProps> = (props) => {
    const { isMobile } = useAppletData();
    
    return isMobile ? (
        <MobileSearchGroup {...props} />
    ) : (
        <DesktopSearchGroup {...props} />
    );
};

export default SearchGroupField;