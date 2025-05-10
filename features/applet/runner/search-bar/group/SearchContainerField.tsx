// SearchGroupField.tsx
import React from "react";

import DesktopSearchGroup from "./DesktopSearchFieldGroup";
import MobileSearchGroup from "./MobileSearchFieldGroup";
import { useIsMobile } from "@/hooks/use-mobile";
import { FieldDefinition } from "@/types";

interface SearchContainerFieldProps {
    id: string;
    label: string;
    description?: string;
    fields: FieldDefinition[];
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: React.ReactNode;
    className?: string;
    isMobile?: boolean;
    hideWhenInactive?: boolean;
}

const SearchContainerField: React.FC<SearchContainerFieldProps> = (props) => {
    const isMobile = useIsMobile();
    
    return isMobile ? (
        <MobileSearchGroup {...props} />
    ) : (
        <DesktopSearchGroup {...props} />
    );
};

export default SearchContainerField;