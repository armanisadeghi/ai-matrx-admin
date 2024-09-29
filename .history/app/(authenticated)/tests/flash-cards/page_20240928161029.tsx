

import React, { useState } from 'react';

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

const flashCardData = [
    { "id": 1, "front": "Matter", "back": "Anything that has mass and takes up space." },
    { "id": 2, "front": "Mass", "back": "The amount of matter in an object, measured in kilograms or grams." },
    { "id": 3, "front": "Weight", "back": "The force exerted by gravity on an object’s mass, measured in newtons." },
    { "id": 4, "front": "Volume", "back": "The amount of space an object occupies, measured in liters or cubic meters." },
    { "id": 5, "front": "Density", "back": "Mass per unit volume of a substance, calculated as mass divided by volume (D = m/v)." },
    { "id": 6, "front": "States of Matter", "back": "The physical forms in which matter can exist: solid, liquid, gas, and plasma." },
    { "id": 7, "front": "Physical Properties", "back": "Characteristics that can be observed or measured without changing the substance’s chemical identity (e.g., color, melting point, density)." },
    { "id": 8, "front": "Chemical Properties", "back": "Characteristics that describe a substance’s ability to change into different substances (e.g., flammability, reactivity)." },
    { "id": 9, "front": "Elements", "back": "Pure substances that consist of only one type of atom." },
    { "id": 10, "front": "Atoms", "back": "The smallest unit of an element that retains the properties of that element." },
    { "id": 11, "front": "Periodic Table", "back": "A table of the chemical elements arranged by atomic number, symbol, and atomic mass, showing the periodic patterns in their properties." },
    { "id": 12, "front": "Atomic Number", "back": "The number of protons in the nucleus of an atom, which determines the element’s identity." },
    { "id": 13, "front": "Symbol", "back": "One or two letters that represent an element (e.g., H for hydrogen, O for oxygen)." },
    { "id": 14, "front": "Atomic Mass", "back": "The weighted average mass of the atoms in a naturally occurring sample of the element." },
    { "id": 15, "front": "Groups", "back": "Vertical columns in the periodic table where elements have similar chemical properties." },
    { "id": 16, "front": "Metal vs. Nonmetal", "back": "Metals are typically shiny, malleable, and good conductors of heat and electricity, while nonmetals are not." },
    { "id": 17, "front": "Pure Substances", "back": "Materials made of only one type of particle; includes elements and compounds." },
    { "id": 18, "front": "Molecules", "back": "Two or more atoms bonded together." },
    { "id": 19, "front": "Chemical Bonds", "back": "The forces that hold atoms together in a molecule." },
    { "id": 20, "front": "Compounds", "back": "Substances formed from two or more elements chemically bonded in fixed proportions." },
    { "id": 21, "front": "Atomic Ratios", "back": "The ratio of different types of atoms in a compound." },
    { "id": 22, "front": "Models of Molecules", "back": "Representations of molecules showing the arrangement of atoms and the bonds between them." },
    { "id": 23, "front": "Complex Molecules", "back": "Large molecules such as polymers, crystals, and metals, whose properties are influenced by their atomic composition and structure." },
    { "id": 24, "front": "Polymers", "back": "Large molecules made up of repeating units called monomers." },
    { "id": 25, "front": "Crystals", "back": "Solids whose atoms are arranged in a highly ordered, repeating pattern." },
    { "id": 26, "front": "Metals", "back": "Elements that are typically hard, shiny, and good conductors of heat and electricity." },
    { "id": 27, "front": "How a material’s properties are influenced by both its atomic composition and structure", "back": "The specific arrangement and types of atoms in a material determine its physical and chemical properties." },
    { "id": 28, "front": "How could you measure mass, weight, volume, or density?", "back": "Mass: balance scale; Weight: spring scale; Volume: graduated cylinder or displacement method; Density: calculate using mass and volume (D = m/v)." },
    { "id": 29, "front": "What are examples of physical / chemical properties, how are they different?", "back": "Physical: color, melting point; Chemical: flammability, reactivity. Physical properties can be observed without changing the substance, chemical properties involve a change in composition." },
    { "id": 30, "front": "Given a periodic table, identify an element’s properties.", "back": "Use the atomic number, symbol, and atomic mass to determine the element’s identity and properties." },
    { "id": 31, "front": "What are the similarities and differences of atoms, molecules, and compounds?", "back": "Atoms are single units of elements; molecules are two or more atoms bonded together; compounds are molecules made of different elements." },
    { "id": 32, "front": "Be able to draw a molecular model for a given molecule, or vice versa.", "back": "Practice drawing models showing atoms and bonds, or identify molecules from given models." },
    { "id": 33, "front": "Describe an experimental procedure to identify an unknown substance by comparing to known substances and their properties.", "back": "Measure physical and chemical properties (e.g., melting point, density, reactivity) and compare to known substances." },
    { "id": 34, "front": "Compare and contrast the properties that different extended structures molecules could have.", "back": "Polymers: flexible, durable; Crystals: hard, brittle; Metals: conductive, malleable." },
    { "id": 35, "front": "If different objects have the same mass, the most dense one has which volume?", "back": "The smallest volume." },
    { "id": 36, "front": "Which of the following is not a chemical property?", "back": "Melting point." },
    { "id": 37, "front": "What is the symbol for gold?", "back": "Au." },
    { "id": 38, "front": "The symbol Sb is for what element?", "back": "Antimony." },
    { "id": 39, "front": "Which element has an atomic number of 5?", "back": "Boron." },
    { "id": 40, "front": "Which group is known as the noble gases?", "back": "Group 18." },
    { "id": 41, "front": "The element of potassium is a metal.", "back": "True." },
    { "id": 42, "front": "English breakfast tea is an example of a pure substance.", "back": "False." },
    { "id": 43, "front": "Chlorine gas, Cl2, is a molecule.", "back": "True." },
    { "id": 44, "front": "Which of the following is an example of a compound?", "back": "Water (H2O)." },
    { "id": 45, "front": "Carbon dioxide is a molecule with which atom in the center?", "back": "Carbon." },
    { "id": 46, "front": "What is the atomic number defined by?", "back": "The number of protons in an atom’s nucleus." },
    { "id": 47, "front": "Alchemy was the study of attempting to turn lead into...", "back": "Gold." },
    { "id": 48, "front": "Molecules contain atoms held together by...", "back": "Chemical bonds." },
    { "id": 49, "front": "Sodium chloride, or table salt, is an example of a...", "back": "Compound." },
    { "id": 50, "front": "Elements in the same row in the periodic table are likely to have similar properties.", "back": "False." },
    { "id": 51, "front": "Elements in the same column (or group) in the periodic table are likely to have similar properties.", "back": "True." },
    { "id": 52, "front": "Volume is a measure of...", "back": "The amount of space an object occupies." },
    { "id": 53, "front": "Mass changes depending on the amount of gravity something experiences.", "back": "False. Weight changes, not mass." },
    { "id": 54, "front": "The most common molecule in the air is...", "back": "Nitrogen (N2)." }
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