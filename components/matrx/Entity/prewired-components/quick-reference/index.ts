import {EntityQuickReferenceAccordion} from './EntityQuickReferenceAccordion';
import {EntityQuickReferenceAccordionEnhanced} from './EntityQuickReferenceAccordionEnhanced';
import EntityQuickReferenceCards from './EntityQuickReferenceCards';
import EntityQuickReferenceCardsEnhanced from './EntityQuickReferenceCardsEnhanced';
import EntityQuickReferenceList from './EntityQuickReferenceList';
import EntityQuickReferenceSelect from './EntityQuickReferenceSelect';
import EntityQuickReferenceListWithRelated from './EntityQuickReferenceListWithRelated';



export {EntityQuickReferenceAccordion} from './EntityQuickReferenceAccordion';
export {EntityQuickReferenceAccordionEnhanced} from './EntityQuickReferenceAccordionEnhanced';
export {default as EntityQuickReferenceCards} from './EntityQuickReferenceCards';
export {default as EntityQuickReferenceCardsEnhanced} from './EntityQuickReferenceCardsEnhanced';
export {default as EntityQuickReferenceList} from './EntityQuickReferenceList';
export {default as EntityQuickReferenceSelect} from './EntityQuickReferenceSelect';



export const ENTITY_QUICK_REFERENCE = {
    DEFAULT: EntityQuickReferenceCards,
    ACCORDION: EntityQuickReferenceAccordion,
    ACCORDION_ENHANCED: EntityQuickReferenceAccordionEnhanced,
    CARDS: EntityQuickReferenceCards,
    CARDS_ENHANCED: EntityQuickReferenceCardsEnhanced,
    LIST: EntityQuickReferenceList,
    SELECT: EntityQuickReferenceSelect,
    RELATED_LIST: EntityQuickReferenceListWithRelated
};

export type QuickReferenceComponentType = keyof typeof ENTITY_QUICK_REFERENCE;
