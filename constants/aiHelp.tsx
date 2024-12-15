// constants/aiHelp.ts
import AIHelpButton from "@/components/ai-help/AIHelpButton";
import React from "react";

export const AI_HELP_PROMPTS = {
    INITIAL_CONTEXT: "You are tasked with assisting a user in AI Matrx. Below, you can find a wealth of information about the context for exactly what the user is doing. The user has clicked the help icon and you are receiving the exact screenshot of what they see right now and the context should provide you the information you need to guide the user.\n\nAt this time, the user does not have the ability to respond back to you so you have one chance to give the user some help. Please do your best. We are working on improving our system to allow for a conversation.",
    FINAL_INSTRUCTION: "Please do your best to respond to the user with as much helpful information as you can. We are working to improve the system and provide you with even more relevant context, but for now, we hope you have enough to provide the user with as much help as possible. Your response will be streamed directly to the user. Please proceed..."
};

export const FeatureHelpDocs = {
    EntityForm: {
        pageHelp: "This is the entity management interface. You can interact with the data in the system through this interface.",
        entityHelp: `Currently viewing: {{selectedEntity}} which is one of the tables in the system.
                        Each table is represented by a dynamic, dedicated Redux Slice that is keyed for the entity.
                        The slice is called Entity and it's incredibly dynamic. The user can interact with the table, as well as all related tables.
                        That includes Foreign keys and even inverse Foreign keys, as well as many to many relationships.
                        Of course, from the user's perspective, this isn't a table, it's a page of the app that let's them interact with the data.`,
    },
    EntityField: {
        pageHelp: "This is the entity field interface. You can interact with the fields in the system through this interface.",
        fieldHelp: `Currently viewing: {{selectedField}} which is one of the fields in the system.
                        Each field is represented by a dynamic, dedicated Redux Slice that is keyed for the field.
                        The slice is called Field and it's incredibly dynamic. The user can interact with the field, as well as all related fields.
                        That includes Foreign keys and even inverse Foreign keys, as well as many to many relationships.
                        Of course, from the user's perspective, this isn't a field, it's a page of the app that let's them interact with the data.`,
    },
}

export const AIHelpButtonWithDocs = ({helpDocs}) => {
    return (
        <AIHelpButton
            helpDocs={helpDocs}
        />
    );
}
