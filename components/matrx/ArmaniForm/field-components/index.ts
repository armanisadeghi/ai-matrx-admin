// components/matrx/ArmaniForm/field-components/index.ts

import EntityButton from './EntityButton';
import EntityCheckbox from './EntityCheckbox';
import { EntityChip, EnhancedEntityChip } from './EntityChip';
import EntityColorPicker from './EntityColorPicker';
import EntityDatePicker from './EntityDatePicker';
import { SideDrawer, BottomDrawer, TopDrawer, CenterDrawer } from './EntityDrawer';
import { EntityDropdownMenu } from './EntityDropdownMenu';
import EntityFileUpload from './EntityFileUpload';
import EntityImageDisplay from './EntityImageDisplay';
import EntityInput from './EntityInput';
import EntityJsonEditor from './EntityJsonEditor';
import EntityNumberInput from './EntityNumberInput';
import EntityPhoneInput from './EntityPhoneInput';
import EntityRadioGroup from './EntityRadioGroup';
import { RelationalInput, RelationalButton } from './EntityRelationshipInput';
import EntitySearchInput from './EntitySearchInput';
import EntitySelect from './EntitySelect';
import EntitySheet from './EntitySheet';
import EntitySlider from './EntitySlider';
import EntityStarRating from './EntityStarRating';
import EntitySwitch from './EntitySwitch';
import EntityTextarea from './EntityTextarea';
import EntityTimePicker from './EntityTimePicker';
import EntityUUIDArray from './EntityUUIDArray';
import EntityUUIDField from './EntityUUIDField';
import {FileUpload} from './file-upload';
import ImageDisplay from './image-display';

export { default as EntityButton } from './EntityButton';
export { default as EntityCheckbox } from './EntityCheckbox';
export { EntityChip, EnhancedEntityChip } from './EntityChip';
export { default as EntityColorPicker } from './EntityColorPicker';
export { default as EntityDatePicker } from './EntityDatePicker';
export { SideDrawer, BottomDrawer, TopDrawer, CenterDrawer } from './EntityDrawer';
export { default as EntityDropdownMenu } from './EntityDropdownMenu';
export { default as EntityFileUpload } from './EntityFileUpload';
export { default as EntityImageDisplay } from './EntityImageDisplay';
export { default as EntityInput } from './EntityInput';
export { default as EntityJsonEditor } from './EntityJsonEditor';
export { default as EntityNumberInput } from './EntityNumberInput';
export { default as EntityPhoneInput } from './EntityPhoneInput';
export { default as EntityRadioGroup } from './EntityRadioGroup';
export { default as EntitySearchInput } from './EntitySearchInput';
export { default as EntitySelect } from './EntitySelect';
export { default as EntitySheet } from './EntitySheet';
export { default as EntitySlider } from './EntitySlider';
export { default as EntityStarRating } from './EntityStarRating';
export { default as EntitySwitch } from './EntitySwitch';
export { default as EntityTextarea } from './EntityTextarea';
export { default as EntityTimePicker } from './EntityTimePicker';
export { default as EntityUUIDArray } from './EntityUUIDArray';
export { default as EntityUUIDField } from './EntityUUIDField';
export { FileUpload } from './file-upload';
export { default as ImageDisplay } from './image-display';
import EntityShowSelectedAccordion from './wired/EntityShowSelectedAccordion';
import EntityFetchByPkAccordion from "./wired/EntityFetchByPkAccordion";
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
    COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntityDatePicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,
    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
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
    COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntityDatePicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
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
    COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntityDatePicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
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
    COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntityDatePicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
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
    COLOR_PICKER: EntityColorPicker,
    DATE_PICKER: EntityDatePicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    JSON_EDITOR: EntityJsonEditor,
    NUMBER_INPUT: EntityNumberInput,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,

    RELATIONAL_INPUT: RelationalInput,
    RELATIONAL_BUTTON: RelationalButton,

    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
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
