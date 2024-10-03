// import React, { useState } from 'react';
// import FlashcardDisplay from './FlashcardDisplay';
// import AIChatInterface from './AIChatInterface';
// import {Flashcard, FlashcardData, AiAssistModalTab} from '@/types/flashcards.types';
//
// interface FlashcardWithAIChatProps {
//     card: Flashcard;
//     onAnswer: (isCorrect: boolean) => void;
// }
//
// const FlashcardWithAIChat: React.FC<FlashcardWithAIChatProps> = ({ card, onAnswer }) => {
//     const [isFlipped, setIsFlipped] = useState(false);
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [fontSize, setFontSize] = useState(16);
//
//     const handleFlip = () => {
//         setIsFlipped(!isFlipped);
//     };
//
//     const handleAskQuestion = () => {
//         setIsChatOpen(true);
//     };
//
//     return (
//         <>
//             <FlashcardDisplay
//                 card={card}
//                 isFlipped={isFlipped}
//                 fontSize={fontSize}
//                 onFlip={handleFlip}
//                 onAnswer={onAnswer}
//                 onAskQuestion={handleAskQuestion}
//             />
//             <AIChatInterface
//                 isOpen={isChatOpen}
//                 onClose={() => setIsChatOpen(false)}
//                 card={card}
//             />
//         </>
//     );
// };
//
// export default FlashcardWithAIChat;


// I think a better approach would be to replicate the flashcard, but change it to have an internal part with the chat interface
// Update the animation to have a grow effect of some sort.
