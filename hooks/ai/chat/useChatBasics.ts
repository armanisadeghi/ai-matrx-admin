import { useAiModelWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { useEffect } from "react";

export const useChatBasics = () => {

    const {
        aiModelRecords: models,
        fetchAll,
    } = useAiModelWithFetch();

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);


    return {
        models,
    }
}

export default useChatBasics;
