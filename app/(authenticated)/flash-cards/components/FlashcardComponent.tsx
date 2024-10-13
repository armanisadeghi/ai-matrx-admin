'use client';

import React, {Suspense} from 'react';

import FlashcardControls from './FlashcardControls';
import FlashcardDisplay from './FlashcardDisplay';
import PerformanceChart from './PerformanceChart';
import EditFlashcardDialog from './EditFlashcardDialog';
import {Progress} from "@/components/ui/progress";
import AiAssistModal from '../ai/AiAssistModal';
import {useFlashcard} from "@/app/(authenticated)/flash-cards/hooks/useFlashcard";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";
import {
    SmallComponentLoading,
    MediumComponentLoading,
    LargeComponentLoading,
    CardLoading
} from '@/components/matrx/LoadingComponents';
import {ensureId} from "@/utils/schema/schemaUtils";

const FlashcardComponent: React.FC = () => {
    const {
        allFlashcards,
        currentIndex,
        editingCard,
        isModalOpen,
        modalMessage,
        modalDefaultTab,
        handleSaveEdit,
        setIsModalOpen,
        setEditingCard,
        handleAction,
    } = useFlashcard();


    const flashcardsWithUUIDs = ensureId(allFlashcards);

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row justify-between items-stretch mb-4 gap-4">
                <div className="w-full lg:w-2/3 flex">
                    <Suspense fallback={<CardLoading/>}>
                        <FlashcardDisplay/>
                    </Suspense>
                </div>
                <div className="w-full lg:w-1/3 flex">
                    <Suspense fallback={<MediumComponentLoading/>}>
                        <PerformanceChart/>
                    </Suspense>
                </div>
            </div>

            <Suspense fallback={<SmallComponentLoading/>}>
                <FlashcardControls/>
            </Suspense>

            <div className="mt-4">
                <Progress value={((currentIndex + 1) / allFlashcards.length) * 100} className="w-full"/>
            </div>

            <Suspense fallback={<LargeComponentLoading/>}>
                <MatrxTable
                    data={flashcardsWithUUIDs}
                    onAction={handleAction}
                    defaultVisibleColumns={['lesson', 'topic','front', 'reviewCount', 'correctCount', 'incorrectCount']}
                />
            </Suspense>

            <EditFlashcardDialog
                editingCard={editingCard}
                onSave={handleSaveEdit}
                onClose={() => setEditingCard(null)}
            />

            <AiAssistModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                defaultTab={modalDefaultTab}
                message={modalMessage}
            />
        </div>
    );
};

export default FlashcardComponent;
