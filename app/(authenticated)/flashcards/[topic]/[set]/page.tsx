import React from 'react';

import {Cover} from "@/components/ui";
import {FlashcardTopicOptions, vocabFlashcards} from "@/app/(authenticated)/flash-cards/lesson-data";
import FlashcardComponent from '../../components/FlashcardComponent';

type Params = Promise<{
    flashcardCategory: FlashcardTopicOptions;
    primaryKeyField: string;
    primaryKeyValue: string;
}>;

type SearchParams = Promise<{
    entityPrettyName: string;
    entityFieldPrettyName: string;
    [key: string]: string | string[] | undefined;
}>;


interface EntityRecordPageProps {
    params: any;
    searchParams: any;
}


export default async function FlashcardsPage(props) {

    const [params, searchParams] = await Promise.all([
        props.params,
        props.searchParams
    ]);


    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground overflow-auto">
            <h1 className="text-xl md:text-2xl lg:text-4xl font-semibold w-full text-center py-2 bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                Vocab <Cover>Flashcards</Cover>
            </h1>

            <div className="flex-grow p-4">
                <FlashcardComponent initialFlashcards={vocabFlashcards}/>
            </div>
        </div>
    );
};

