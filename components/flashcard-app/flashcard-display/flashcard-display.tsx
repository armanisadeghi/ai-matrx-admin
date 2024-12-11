import { motion, AnimatePresence } from 'framer-motion';
import { FlashcardHook } from "./types";
import { FlashcardFront } from "./flashcard-front";
import { FlashcardBack } from "./flashcard-back";

const FlashcardDisplay = ({ flashcardHook }: { flashcardHook: FlashcardHook }) => {
    const {
        activeFlashcard,
        isFlipped,
        fontSize,
        handleFlip,
        handleAnswer,
        mobileHandlers,
        aiModalActions: { openAiModal }
    } = flashcardHook;

    if (!activeFlashcard) {
        return <div>No card data available</div>;
    }

    return (
        <div className="w-full min-h-[400px] lg:h-full [perspective:1000px]" {...mobileHandlers}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeFlashcard.id}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                        isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                    onClick={handleFlip}
                >
                    <FlashcardFront
                        content={activeFlashcard.front}
                        fontSize={fontSize}
                    />
                    <FlashcardBack
                        answer={activeFlashcard.back}
                        detailedExplanation={activeFlashcard.detailedExplanation}
                        example={activeFlashcard.example}
                        dynamicContent={activeFlashcard.dynamicContent}
                        fontSize={fontSize}
                        onAnswer={handleAnswer}
                        onAskQuestion={openAiModal}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default FlashcardDisplay;
