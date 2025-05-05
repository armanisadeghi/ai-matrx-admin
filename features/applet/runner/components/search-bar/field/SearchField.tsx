// SearchField.tsx
import React, { ReactNode } from "react";
import MobileSearchField from "./MobileSearchField";
import DesktopSearchField from "./DesktopSearchField";

export interface SearchFieldProps {
    id: string;
    label: string;
    placeholder: string;
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: ReactNode;
    children: ReactNode;
    className?: string;
    preventClose?: boolean;
    isMobile?: boolean;
    hideWhenInactive?: boolean;
}

const SearchField: React.FC<SearchFieldProps> = (props) => {
    // Render different components based on mobile status
    return props.isMobile ? (
        <MobileSearchField {...props} />
    ) : (
        <DesktopSearchField {...props} />
    );
};

export default SearchField;