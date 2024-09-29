import React, { useState } from 'react';

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

const flashCardData: Flashcard[] = [
  // ... (Insert the flashCardData array here)
];

const FlashcardComponent: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashCardData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(event.target.value);
    setCurrentIndex(selectedIndex);
    setIsFlipped(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Flashcard Learning</h1>
      <select
        className="mb-4 p-2 border border-gray-300 rounded"
        value={currentIndex}
        onChange={handleSelectChange}
      >
        {flashCardData.map((card, index) => (
          <option key={card.id} value={index}>
            Flashcard {card.id}
          </option>
        ))}
      </select>

      <div
        className={`w-80 h-48 flex items-center justify-center border border-gray-300 rounded-lg cursor-pointer transition-transform transform ${
          isFlipped ? 'bg-blue-200' : 'bg-white'
        }`}
        onClick={handleFlip}
      >
        <p className="text-xl text-center">
          {isFlipped ? flashCardData[currentIndex].back : flashCardData[currentIndex].front}
        </p>
      </div>

      <div className="mt-4">
        <button
          className="mr-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </button>
        <button
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleNext}
          disabled={currentIndex === flashCardData.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default FlashcardComponent;