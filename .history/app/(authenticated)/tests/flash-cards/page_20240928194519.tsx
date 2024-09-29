'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useTheme } from 'next-themes';
import { ArrowLeft, ArrowRight, Shuffle, CheckCircle, XCircle, Edit, Plus, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InitialFalshcardsWithExample } from './lesson-data';

export interface Flashcard {
    id: number;
    front: string;
    back: string;
    example: string;
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
  };
  


const FlashcardComponent: React.FC = () => {
    const [cards, setCards] = useState<Flashcard[]>(initialFlashCardData);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fontSize, setFontSize] = useState(16);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const { theme } = useTheme();
  
    useEffect(() => {
      setProgress((currentIndex / (cards.length - 1)) * 100);
    }, [currentIndex, cards.length]);
  
    const handleFlip = () => setIsFlipped(!isFlipped);
  
    const handleNext = () => {
      if (isFlipped) {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsFlipped(false);
        }
      } else {
        setIsFlipped(true);
      }
    };
  
    const handlePrevious = () => {
      if (isFlipped) {
        setIsFlipped(false);
      } else if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setIsFlipped(false);
      }
    };
  
    const handleSelectChange = (value: string) => {
      setCurrentIndex(parseInt(value));
      setIsFlipped(false);
    };
  
    const shuffleCards = () => {
      setCards([...cards].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
      setIsFlipped(false);
    };
  
    const handleAnswer = (isCorrect: boolean) => {
      setCards(prevCards => 
        prevCards.map((card, index) => 
          index === currentIndex
            ? {
                ...card,
                reviewCount: card.reviewCount + 1,
                correctCount: isCorrect ? card.correctCount + 1 : card.correctCount,
                incorrectCount: isCorrect ? card.incorrectCount : card.incorrectCount + 1
              }
            : card
        )
      );
      handleNext();
    };
  
    const getPerformanceColor = (percentage: number, reviewCount: number) => {
      if (reviewCount === 0) return "text-gray-500";
      if (percentage >= 80) return "text-green-500";
      if (percentage >= 60) return "text-yellow-500";
      return "text-red-500";
    };
  
    const handleEditCard = (card: Flashcard) => {
      setEditingCard(card);
    };
  
    const handleSaveEdit = () => {
      if (editingCard) {
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === editingCard.id ? editingCard : card
          )
        );
        setEditingCard(null);
      }
    };
  
    const showModal = (message: string) => {
      // Placeholder for modal functionality
      alert(message);
    };
  
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
          <h1 className="text-3xl font-bold mb-6">Flashcard Learning</h1>
          <div className="w-full max-w-md mb-4">
            <Select onValueChange={handleSelectChange} value={currentIndex.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select a flashcard" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card, index) => (
                  <SelectItem key={card.id} value={index.toString()}>
                    Flashcard {card.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
    
          <div className="w-full max-w-md h-80 [perspective:1000px]">
            <div
              className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              }`}
              onClick={handleFlip}
            >
              <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                <Card className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-card">
                  <CardContent>
                    <p className="text-center" style={{ fontSize: `${fontSize}px` }}>
                      {cards[currentIndex].front.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <Card className="w-full h-full flex items-start justify-start p-6 overflow-auto bg-card">
                  <CardContent>
                    <p className="text-left" style={{ fontSize: `${fontSize}px` }}>
                      {cards[currentIndex].back.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
        <div className="mt-6 flex items-center space-x-4">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {isFlipped && (
            <>
              <Button onClick={() => handleAnswer(false)} variant="outline">
                <XCircle className="mr-2 h-4 w-4" /> Incorrect
              </Button>
              <Button onClick={() => handleAnswer(true)} variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" /> Correct
              </Button>
            </>
          )}
          <Button onClick={handleNext} variant="outline">
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={shuffleCards} variant="outline">
            <Shuffle className="mr-2 h-4 w-4" /> Shuffle
          </Button>
        </div>
  
        <div className="mt-4 flex space-x-2">
          <Button onClick={() => showModal("I'm confused")} variant="outline">I'm confused</Button>
          <Button onClick={() => showModal("Give me an example")} variant="outline">Give me an example</Button>
          <Button onClick={() => showModal("I have a question")} variant="outline">I have a question</Button>
          <Button onClick={() => showModal("Split into two cards")} variant="outline">Split into two cards</Button>
          <Button onClick={() => showModal("Combine cards")} variant="outline">Combine cards</Button>
          <Button onClick={() => showModal("Compare Cards")} variant="outline">Compare Cards</Button>
        </div>
  
        <div className="w-full max-w-md mt-6">
          <Progress value={progress} className="w-full" />
        </div>
  
        <div className="mt-4 flex items-center space-x-2">
          <span>Font Size:</span>
          <Button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} variant="outline"><Minus className="h-4 w-4" /></Button>
          <span>{fontSize}px</span>
          <Button onClick={() => setFontSize(prev => Math.min(24, prev + 2))} variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
  
        <div className="w-full max-w-4xl mt-12 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Review Count</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Incorrect</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card, index) => {
                const percentage = card.reviewCount > 0 
                  ? (card.correctCount / card.reviewCount) * 100 
                  : 0;
                return (
                  <TableRow key={card.id} className="cursor-pointer" onClick={() => { setCurrentIndex(index); setIsFlipped(false); }}>
                    <TableCell>{card.front}</TableCell>
                    <TableCell>{card.reviewCount}</TableCell>
                    <TableCell>{card.correctCount}</TableCell>
                    <TableCell>{card.incorrectCount}</TableCell>
                    <TableCell className={getPerformanceColor(percentage, card.reviewCount)}>
                      {percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Button onClick={(e) => { e.stopPropagation(); handleEditCard(card); }} variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
  
        <Dialog open={editingCard !== null} onOpenChange={() => setEditingCard(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Flashcard</DialogTitle>
            </DialogHeader>
            {editingCard && (
              <div className="space-y-4">
                <Textarea
                  value={editingCard.front}
                  onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                  placeholder="Front of card"
                />
                <Textarea
                  value={editingCard.back}
                  onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                  placeholder="Back of card"
                />
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  export default FlashcardComponent;
  