import EntityInputFinal from "./entityInputFinal";
import EntityTextareaFinal from "./EntityTextareaFinal";
import RelatedEntityAccordionFinal from "./RelatedEntityAccordionFinal";
import EntityFkAccordion from "@/components/matrx/ArmaniForm/field-components/wired/EntityFkAccordion";
import RelatedEntityAccordion
    from "@/components/matrx/ArmaniForm/field-components/wired/accordion-modes/RelatedEntityAccordion";
import EntityShowSelectedAccordion
    from "@/components/matrx/ArmaniForm/field-components/wired/EntityShowSelectedAccordion";
import {
    EntityButton,
    EntityCheckbox,
    EntityChip,
    EntityColorPicker,
    EntityDatePicker,
    EntityDropdownMenu,
    EntityFileUpload,
    EntityImageDisplay,
    EntityInput, EntityJsonEditor, EntityNumberInput, EntityPhoneInput, EntityRadioGroup, EntitySearchInput,
    EntitySelect, EntitySheet,
    EntitySlider, EntityStarRating,
    EntitySwitch,
    EntityTextarea, EntityTimePicker,
    EntityUUIDArray,
    EntityUUIDField,
    RelationalButton,
    RelationalInput,
    SideDrawer
} from "@/components/matrx/ArmaniForm/field-components";


export const ENTITY_FIELD_COMPONENTS_FINAL = {
    INPUT: EntityInputFinal,
    TEXTAREA: EntityTextareaFinal,
    ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordionFinal,
} as const;







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
    ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordion, // TODO Check if this works,
    ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;
