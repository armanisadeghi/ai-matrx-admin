'use client';

import React, { Suspense } from 'react';

import FlashcardControls from './FlashcardControls';
import FlashcardDisplay from './FlashcardDisplay';
import PerformanceChart from './PerformanceChart';
import EditFlashcardDialog from './EditFlashcardDialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AiAssistModal from '../ai/AiAssistModal';
import { useFlashcard } from "@/app/(authenticated)/flash-cards/hooks/useFlashcard";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";
import {
    SmallComponentLoading,
    MediumComponentLoading,
    LargeComponentLoading,
    FullPageLoading,
    CardLoading
} from '@/components/matrx/LoadingComponents';

const FlashcardComponent: React.FC = () => {
    const {
        allFlashcards,
        currentIndex,
        activeFlashcard,
        firstName,
        isFlipped,
        fontSize,
        editingCard,
        isModalOpen,
        modalMessage,
        modalDefaultTab,
        isExpandedChatOpen,
        handleFlip,
        handleNext,
        handlePrevious,
        handleSelectChange,
        shuffleCards,
        handleAnswer,
        handleEditCard,
        handleSaveEdit,
        showModal,
        handleAskQuestion,
        setFontSize,
        setIsModalOpen,
        setIsExpandedChatOpen,
        setEditingCard,
        handleAction,
        handleAddMessage,
        handleClearChat,
        handleResetAllChats,
        handleDeleteFlashcard,
        handleAddFlashcard,
    } = useFlashcard();

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row justify-between items-stretch mb-4 gap-4">
                <div className="w-full lg:w-2/3 flex">
                    <Suspense fallback={<CardLoading />}>
                        <FlashcardDisplay
                            isFlipped={isFlipped}
                            fontSize={fontSize}
                            onFlip={handleFlip}
                            onAnswer={handleAnswer}
                            onAskQuestion={handleAskQuestion}
                        />
                    </Suspense>
                </div>
                <div className="w-full lg:w-1/3 flex">
                    <Suspense fallback={<MediumComponentLoading />}>
                        <PerformanceChart />
                    </Suspense>
                </div>
            </div>

            <Suspense fallback={<SmallComponentLoading />}>
                <FlashcardControls
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onShuffle={shuffleCards}
                    onShowModal={showModal}
                    onSelectChange={handleSelectChange}
                    firstName={firstName}
                />
            </Suspense>

            <div className="mt-4">
                <Progress value={((currentIndex + 1) / allFlashcards.length) * 100} className="w-full"/>
            </div>

            <div className="mt-4 flex items-center space-x-2">
                <span>Font Size:</span>
                <Button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} variant="outline">-</Button>
                <span>{fontSize}px</span>
                <Button onClick={() => setFontSize(prev => Math.min(36, prev + 2))} variant="outline">+</Button>
            </div>

            <Suspense fallback={<LargeComponentLoading />}>
                <MatrxTable
                    data={allFlashcards}
                    onAction={handleAction}
                    defaultVisibleColumns={['lesson','front', 'reviewCount', 'correctCount','incorrectCount']}
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
            {/*{activeFlashcard && (*/}
            {/*    <ExpandedFlashcardWithChat*/}
            {/*        isOpen={isExpandedChatOpen}*/}
            {/*        onClose={() => setIsExpandedChatOpen(false)}*/}
            {/*        cardId={activeFlashcard.id}*/}
            {/*        firstName={firstName}*/}
            {/*        fontSize={fontSize}*/}
            {/*    />*/}
            {/*)}*/}
        </div>
    );
};

export default FlashcardComponent;
