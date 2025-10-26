// components/matrx/ArmaniForm/field-components/index.ts

import EntityButton from './other-components/EntityButton';
import EntityCheckbox from './field-components/EntityCheckbox';
import { EntityChip, EnhancedEntityChip } from './field-components/EntityChip';
import EntityDatePicker from './field-components/concepts/EntityDatePicker';
import { EntityDropdownMenu } from './other-components/EntityDropdownMenu';
import EntityImageDisplay from './field-components/EntityImageDisplay';
import EntityInput from './field-components/EntityInput';
import EntityJsonEditor from './field-components/EntityJsonEditor';
import EntityNumberInput from './field-components/EntityNumberInput';
import EntityPhoneInput from './field-components/EntityPhoneInput';
import EntityRadioGroup from './field-components/EntityRadioGroup';
import { RelationalInput, RelationalButton } from './EntityRelationshipInput';
import EntitySearchInput from './field-components/EntitySearchInput';
import EntitySelect from './field-components/EntitySelect';
import EntitySlider from './field-components/EntitySlider';
import EntityStarRating from './field-components/EntityStarRating';
import EntitySwitch from './field-components/EntitySwitch';
import EntityTextarea from './field-components/EntityTextarea';
import EntityTimePicker from './field-components/EntityTimePicker';
import EntityUUIDArray from './field-components/EntityUUIDArray';
import EntityUUIDField from './field-components/EntityUUIDField';
import {FileUpload} from './other-components/file-upload';
import ImageDisplay from './other-components/image-display';
import EntitySimpleDate from './field-components/EntitySimpleDate';

export { default as EntityButton } from './other-components/EntityButton';
export { default as EntityCheckbox } from './field-components/EntityCheckbox';
export { EntityChip, EnhancedEntityChip } from './field-components/EntityChip';
export { default as EntityDatePicker } from './field-components/concepts/EntityDatePicker';
export { default as EntitySimpleDate } from './field-components/EntitySimpleDate';
export { default as EntityDropdownMenu } from './other-components/EntityDropdownMenu';
export { default as EntityImageDisplay } from './field-components/EntityImageDisplay';
export { default as EntityInput } from './field-components/EntityInput';
export { default as EntityJsonEditor } from './field-components/EntityJsonEditor';
export { default as EntityNumberInput } from './field-components/concepts/number-inputs/EntityNumberInput';
export { default as EntityPhoneInput } from './field-components/EntityPhoneInput';
export { default as EntityRadioGroup } from './field-components/EntityRadioGroup';
export { default as EntitySearchInput } from './field-components/EntitySearchInput';
export { default as EntitySelect } from './field-components/EntitySelect';
export { default as EntitySlider } from './field-components/EntitySlider';
export { default as EntityStarRating } from './field-components/EntityStarRating';
export { default as EntitySwitch } from './field-components/EntitySwitch';
export { default as EntityTextarea } from './field-components/EntityTextarea';
export { default as EntityTimePicker } from './field-components/EntityTimePicker';
export { default as EntityUUIDArray } from './field-components/EntityUUIDArray';
export { default as EntityUUIDField } from './field-components/EntityUUIDField';
export { FileUpload } from './other-components/file-upload';
export { default as ImageDisplay } from './other-components/image-display';
import EntityFkAccordion from "@/components/matrx/ArmaniForm/field-components/wired/EntityFkAccordion";


export { RelationalInput, RelationalButton } from './EntityRelationshipInput';

export const ENTITY_FIELD_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelect,
    SLIDER: EntitySlider,
    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    // COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntitySimpleDate,
    // DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    // FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,
    SEARCH_INPUT: EntitySearchInput,
    // SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,
    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;


export const ENTITY_SMART_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelect,
    SLIDER: EntitySlider,
    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    // COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntitySimpleDate,
    // DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    // FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    // SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;

export const ENTITY_FK_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelect,
    SLIDER: EntitySlider,
    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    // COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntitySimpleDate,
    // DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    // FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    // SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;

export const ENTITY_IFK_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelect,
    SLIDER: EntitySlider,
    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    // COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntitySimpleDate,
    // DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    // FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    // SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;

export const ENTITY_M2M_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelect,
    SLIDER: EntitySlider,
    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    // COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntitySimpleDate,
    // DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    // FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    // SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    // ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;





const defaultProps = {
    "subComponent": "default",
    "rows": "default",

    "min": "default",
    "max": "default",
    "step": "default",
    "numberType": "default",

    "maxLength": "default",

    "variant": "default",
    "placeholder": "default",
    "size": "default",
    "textSize": "default",
    "textColor": "default",

    "animation": "default",
    "fullWidthValue": "default",
    "fullWidth": "default",
    "disabled": "default",
    "className": "default",
    "type": "default",
    "onChange": "default",
    "onBlur": "default",
    "formatString": "default",
    "section": "default",
    "options": {
        "label": "null",
        "value": "null"
    },
} as const;
