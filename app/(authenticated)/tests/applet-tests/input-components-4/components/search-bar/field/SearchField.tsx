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

const SearchField: React.FC<SearchFieldProps> = ({
    id,
    label,
    placeholder,
    isActive,
    onClick,
    onOpenChange,
    isLast = false,
    actionButton = null,
    children,
    className = "",
    preventClose = false,
    isMobile = false,
    hideWhenInactive = true,
}) => {

    
    // Render different components based on mobile status
    return isMobile ? (
        <MobileSearchField
            id={id}
            label={label}
            placeholder={placeholder}
            isActive={isActive}
            onClick={onClick}
            onOpenChange={onOpenChange}
            isLast={isLast}
            actionButton={actionButton}
            children={children}
            className={className}
            preventClose={preventClose}
            isMobile={isMobile}
        />
    ) : (
        <DesktopSearchField
            id={id}
            label={label}
            placeholder={placeholder}
            isActive={isActive}
            onClick={onClick}
            onOpenChange={onOpenChange}
            isLast={isLast}
            actionButton={actionButton}
            children={children}
            className={className}
            preventClose={preventClose}
            isMobile={isMobile}
        />
    );
};

export default SearchField;
