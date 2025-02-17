"use client";

import { BrokerInputCard } from "@/components/brokers/main-layouts/BrokerInputCard";
import { usePrepareRecipeToRun } from "@/hooks/run-recipe/usePrepareRecipeToRun";

export default function DynamicPage() {
    const prepareRecipeHook = usePrepareRecipeToRun({
        recipeRecordKey: "id:ce63d140-5619-4f4f-9d7d-055f622f887b",
        version: "latest",
    });

    const onSubmit = () => {
        console.log("onSubmit");
    };


    return (
        <>
            <BrokerInputCard
                prepareRecipeHook={prepareRecipeHook}
                recipeTitle="Plan Your Perfect Trip"
                recipeDescription="Tell us about your travel plans"
                recipeActionText="Get Personalized Recommendations"
                onSubmit={onSubmit}
            />

        </>
    );
}