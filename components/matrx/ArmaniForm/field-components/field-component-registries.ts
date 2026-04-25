import EntityButton from "./EntityButton";
import EntityCheckbox from "./EntityCheckbox";
import { EntityChip } from "./EntityChip";
import EntityColorPicker from "./EntityColorPicker";
import EntityDatePicker from "./EntityDatePicker";
import { SideDrawer } from "./EntityDrawer";
import { EntityDropdownMenu } from "./EntityDropdownMenu";
import EntityFileUpload from "./EntityFileUpload";
import EntityImageDisplay from "./EntityImageDisplay";
import EntityInput from "./EntityInput";
import EntityJsonEditor from "./EntityJsonEditor";
import EntityNumberInput from "./EntityNumberInput";
import EntityPhoneInput from "./EntityPhoneInput";
import EntityRadioGroup from "./EntityRadioGroup";
import { RelationalInput, RelationalButton } from "./EntityRelationshipInput";
import EntitySearchInput from "./EntitySearchInput";
import EntitySelect from "./EntitySelect";
import EntitySheet from "./EntitySheet";
import EntitySlider from "./EntitySlider";
import EntityStarRating from "./EntityStarRating";
import EntitySwitch from "./EntitySwitch";
import EntityTextarea from "./EntityTextarea";
import EntityTimePicker from "./EntityTimePicker";
import EntityUUIDArray from "./EntityUUIDArray";
import EntityUUIDField from "./EntityUUIDField";
import EntityShowSelectedAccordion from "./wired/EntityShowSelectedAccordion";
import EntityFkAccordion from "@/components/matrx/ArmaniForm/field-components/wired/EntityFkAccordion";

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
  ACCORDION_SELECTED: EntityShowSelectedAccordion,
} as const;
