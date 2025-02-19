// app/entities/fields/component-lookup.tsx

import EntityFkAccordion from "@/components/matrx/ArmaniForm/field-components/wired/EntityFkAccordion";
import EntitySearchableSelect from "./field-components/EntitySearchableSelect";
import EntitySimpleDate from "./field-components/EntitySimpleDate";
import EntityInput from "./field-components/EntityInput";
import EntityTextarea from "./field-components/EntityTextarea";
import EntitySwitch from "./field-components/EntitySwitch";
import EntitySelect from "./field-components/EntitySelect";
import EntitySlider from "./field-components/EntitySlider";
import EntityUUIDField from "./field-components/EntityUUIDField";
import EntityUUIDArray from "./field-components/EntityUUIDArray";
import EntityButton from "./other-components/EntityButton";
import EntityCheckbox from "./field-components/EntityCheckbox";
import EntityChip from "./field-components/EntityChip";
import EntityImageDisplay from "./field-components/EntityImageDisplay";
import EntityDropdownMenu from "./other-components/EntityDropdownMenu";
import EntityJsonEditor from "./field-components/EntityJsonEditor";
import EntityPhoneInput from "./field-components/EntityPhoneInput";
import EntityRadioGroup from "./field-components/EntityRadioGroup";
import { RelationalButton, RelationalInput } from "./EntityRelationshipInput";
import EntityNumberInput from "./field-components/EntityNumberInput";
import EntitySearchInput from "./field-components/EntitySearchInput";
import EntityStarRating from "./field-components/EntityStarRating";
import EntityTimePicker from "./field-components/EntityTimePicker";
import EntityColorPicker from "./field-components/EntityColorPicker";
import { SideDrawer } from "./other-components/EntityDrawer";
import EntityFileUpload from "./other-components/EntityFileUpload";
import EntitySheet from "./other-components/EntitySheet";
import EntityShowSelectedAccordion from "../relationships/EntityShowSelectedAccordion";
import EntitySelectSpecial from "./field-components/EntitySelectSpecial";
import EntitySpecialField from "./field-components/custom-fields/EntitySpecialField";
import EntityForeignKeySelect from "./field-components/relationship-fields/EntityForeignKeySelect";
import EntityTextArray from "./field-components/EntityTextArray";


export const ENTITY_FIELD_COMPONENTS = {
    INPUT: EntityInput,
    TEXTAREA: EntityTextarea,
    SWITCH: EntitySwitch,
    SELECT: EntitySelectSpecial,

    NUMBER_INPUT: EntityNumberInput,
    DATE_PICKER: EntitySimpleDate,
    JSON_EDITOR: EntityJsonEditor,

    UUID_FIELD: EntityUUIDField,
    UUID_ARRAY: EntityUUIDArray,
    RELATIONAL_INPUT: RelationalInput,
    SPECIAL: EntitySpecialField,
    TEXT_ARRAY: EntityTextArray,
    FK_SELECT: EntityForeignKeySelect,


    SLIDER: EntitySlider,    
    BUTTON: EntityButton,
    CHECKBOX: EntityCheckbox,
    CHIP: EntityChip,
    COLOR_PICKER: EntityColorPicker,
    DRAWER: SideDrawer,
    MENU: EntityDropdownMenu,
    FILE_UPLOAD: EntityFileUpload,
    IMAGE_DISPLAY: EntityImageDisplay,
    PHONE_INPUT: EntityPhoneInput,
    RADIO_GROUP: EntityRadioGroup,
    RELATIONAL_BUTTON: RelationalButton,
    SEARCH_INPUT: EntitySearchInput,
    SHEET: EntitySheet,
    STAR_RATING: EntityStarRating,
    TIME_PICKER: EntityTimePicker,
    SEARCHABLE_SELECT: EntitySearchableSelect,
    ACCORDION_VIEW: EntityFkAccordion,
    // ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;


// "default_component_count": {
//     "UUID_FIELD": 73,
//     "INPUT": 33,
//     "TEXTAREA": 45,
//     "SWITCH": 15,
//     "JSON_EDITOR": 43,
//     "NUMBER_INPUT": 25,
//     "DATE_PICKER": 17,
//     "SELECT": 17,
//     "UUID_ARRAY": 2
//   },

const default_component_count = {
    "UUID_FIELD": 59,
    "INPUT": 61,
    "FK_SELECT": 49,
    "TEXTAREA": 57,
    "SWITCH": 19,
    "JSON_EDITOR": 47,
    "NUMBER_INPUT": 45,
    "DATE_PICKER": 29,
    "SELECT": 30,
    "TEXT_ARRAY": 3,
    "TIME_PICKER": 2,
    "UUID_ARRAY": 2
} as const;