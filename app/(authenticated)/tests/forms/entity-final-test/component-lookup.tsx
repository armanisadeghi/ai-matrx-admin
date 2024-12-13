import EntityInputFinal from "./entityInputFinal";
import EntityTextareaFinal from "./EntityTextareaFinal";
import RelatedEntityAccordionFinal from "./RelatedEntityAccordionFinal";


export const ENTITY_FIELD_COMPONENTS_FINAL = {
    INPUT: EntityInputFinal,
    TEXTAREA: EntityTextareaFinal,
    ACCORDION_VIEW_ADD_EDIT: RelatedEntityAccordionFinal,
} as const;
