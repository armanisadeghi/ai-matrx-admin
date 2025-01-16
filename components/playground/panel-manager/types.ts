import { MatrxRecordId, MessageTemplateDataOptional } from "@/types";

export type ProcessedRecipeMessages = MessageTemplateDataOptional & {
    matrxRecordId: MatrxRecordId;
    order: number;
    recipeId?: string;
};
