import SmartOptionsManager from "../editor/SmartOptionsManager";
import {
    FieldLabelComponent,
    FieldDescriptionComponent,
    FieldHelpTextComponent,
    FieldPlaceholderComponent,
    FieldRequiredComponent,
    FieldDateRangeComponent,
    FieldAutoCompleteComponent,
    FieldMaxLengthComponent,
    FieldFormatCardComponent,
    FieldRowsComponent,
    FieldSelectionOptionsCardComponent,
    FieldMinItemsComponent,
    FieldMaxItemsComponent,
    FieldWidthComponent,
    FieldDirectionComponent,
    FieldGridColsComponent,
    FieldSpellCheckComponent,
    FieldToggleLabelsComponent,
    FieldCustomContentComponent,
    FieldRangeCardComponent,
} from "./field-config-components";

interface BasicTabProps {
    fieldId: string;
}

export const BasicTab: React.FC<BasicTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <FieldLabelComponent fieldId={fieldId} />
            <FieldDescriptionComponent fieldId={fieldId} />
            <FieldHelpTextComponent fieldId={fieldId} />
            <FieldPlaceholderComponent fieldId={fieldId} />
            <FieldRequiredComponent fieldId={fieldId} />
        </div>
    );
};

interface DateTimeTabProps {
    fieldId: string;
}

export const DateTimeTab: React.FC<DateTimeTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Date & Time Settings</h3>

            <FieldDateRangeComponent fieldId={fieldId} />
            <FieldAutoCompleteComponent fieldId={fieldId} />
        </div>
    );
};

interface NumericTabProps {
    fieldId: string;
}

export const NumericTab: React.FC<NumericTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Numeric Settings</h3>

            <FieldRangeCardComponent fieldId={fieldId} />
            <FieldFormatCardComponent fieldId={fieldId} />
            <FieldRowsComponent fieldId={fieldId} />
        </div>
    );
};

interface OptionsTabProps {
    fieldId: string;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Options</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage the options that will be available for selection in this field.
            </p>

            {/* Reuse the existing SmartOptionsManager component */}
            <SmartOptionsManager fieldId={fieldId} />
            <FieldRowsComponent fieldId={fieldId} />
        </div>
    );
};

interface SelectionTabProps {
    fieldId: string;
}

export const SelectionTab: React.FC<SelectionTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selection Settings</h3>

            <FieldSelectionOptionsCardComponent fieldId={fieldId} />

            <div className="grid grid-cols-2 gap-6">
                <FieldMinItemsComponent fieldId={fieldId} />
                <FieldMaxItemsComponent fieldId={fieldId} />
            </div>
        </div>
    );
};

interface StylingTabProps {
    fieldId: string;
}

export const StylingTab: React.FC<StylingTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Styling</h3>

            <FieldWidthComponent fieldId={fieldId} />
            <FieldDirectionComponent fieldId={fieldId} />
            <FieldGridColsComponent fieldId={fieldId} />
            <FieldRowsComponent fieldId={fieldId} />
            <FieldSpellCheckComponent fieldId={fieldId} />
        </div>
    );
};

interface TextContentTabProps {
    fieldId: string;
}

export const TextContentTab: React.FC<TextContentTabProps> = ({ fieldId }) => {
    return (
        <div className="space-y-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Text Content</h3>

            <FieldMaxLengthComponent fieldId={fieldId} />
            <FieldToggleLabelsComponent fieldId={fieldId} />
            <FieldCustomContentComponent fieldId={fieldId} />
        </div>
    );
};
