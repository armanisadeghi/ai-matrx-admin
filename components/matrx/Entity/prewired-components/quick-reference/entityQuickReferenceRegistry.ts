import { EntityQuickReferenceAccordion } from "./EntityQuickReferenceAccordion";
import { EntityQuickReferenceAccordionEnhanced } from "./EntityQuickReferenceAccordionEnhanced";
import EntityQuickReferenceCards from "./EntityQuickReferenceCards";
import EntityQuickReferenceCardsEnhanced from "./EntityQuickReferenceCardsEnhanced";
import EntityQuickReferenceList from "./EntityQuickReferenceList";
import EntityQuickReferenceSelect from "./EntityQuickReferenceSelect";
import EntityQuickReferenceListWithRelated from "./EntityQuickReferenceListWithRelated";

export const ENTITY_QUICK_REFERENCE = {
  DEFAULT: EntityQuickReferenceCards,
  ACCORDION: EntityQuickReferenceAccordion,
  ACCORDION_ENHANCED: EntityQuickReferenceAccordionEnhanced,
  CARDS: EntityQuickReferenceCards,
  CARDS_ENHANCED: EntityQuickReferenceCardsEnhanced,
  LIST: EntityQuickReferenceList,
  SELECT: EntityQuickReferenceSelect,
  RELATED_LIST: EntityQuickReferenceListWithRelated,
};

export type QuickReferenceComponentType = keyof typeof ENTITY_QUICK_REFERENCE;
