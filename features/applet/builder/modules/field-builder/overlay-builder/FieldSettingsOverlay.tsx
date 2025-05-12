// src/features/field-settings/FieldSettingsOverlay.tsx
import React, { useState } from "react";
import { useAppSelector } from "@/lib/redux";
import { selectFieldById } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import BasicTab from "./tabs/BasicTab";
import OptionsTab from "./tabs/OptionsTab";
import SelectionTab from "./tabs/SelectionTab";
import StylingTab from "./tabs/StylingTab";
import NumericTab from "./tabs/NumericTab";
import DateTimeTab from "./tabs/DateTimeTab";
import TextContentTab from "./tabs/TextContentTab";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import FieldPreviewAs from "../previews/FieldPreviewAs";

interface FieldSettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    fieldId: string;
}

const FieldSettingsOverlay: React.FC<FieldSettingsOverlayProps> = ({ isOpen, onClose, fieldId }) => {
    const [activeTab, setActiveTab] = useState("basic");
    const field = useAppSelector((state) => selectFieldById(state, fieldId));

    if (!field) {
        return null;
    }

    const fieldName = field.label || "Untitled Field";
    const componentType = field.component || "textarea";

    const tabs: TabDefinition[] = [
        {
            id: "basic",
            label: "Basic",
            content: <BasicTab fieldId={fieldId} />,
        },
        {
            id: "options",
            label: "Options",
            content: <OptionsTab fieldId={fieldId} />,
        },
        {
            id: "selection",
            label: "Selection",
            content: <SelectionTab fieldId={fieldId} />,
        },
        {
            id: "styling",
            label: "Styling",
            content: <StylingTab fieldId={fieldId} />,
        },
        {
            id: "numeric",
            label: "Numeric",
            content: <NumericTab fieldId={fieldId} />,
        },
        {
            id: "datetime",
            label: "Date & Time",
            content: <DateTimeTab fieldId={fieldId} />,
        },
        {
            id: "text",
            label: "Text Content",
            content: <TextContentTab fieldId={fieldId} />,
        },
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title={`Field Settings: ${fieldName}`}
            description={`Configure all settings for this ${componentType} field in one place`}
            tabs={tabs}
            initialTab={activeTab}
            onTabChange={setActiveTab}
            showSaveButton={true}
            onSave={onClose}
            saveButtonLabel="Save Changes"
            showCancelButton={true}
            onCancel={onClose}
            cancelButtonLabel="Cancel"
            width="98vw"
            sidePanel={<FieldPreviewAs fieldId={fieldId} />}
            sidePanelRatio={0.6}
            sidePanelClassName="p-2"
        />
    );
};

export default FieldSettingsOverlay;
