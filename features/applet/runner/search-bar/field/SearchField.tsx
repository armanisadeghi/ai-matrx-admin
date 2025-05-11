// SearchField.tsx
import React, { ReactNode } from "react";
import MobileSearchField from "./MobileSearchField";
import DesktopSearchField from "./DesktopSearchField";
import { ContainerRenderProps } from "../../layouts/AppletLayoutManager";


const SearchField: React.FC<ContainerRenderProps> = (props) => {
    // Render different components based on mobile status
    return props.isMobile ? (
        <MobileSearchField {...props} />
    ) : (
        <DesktopSearchField {...props} />
    );
};

export default SearchField;