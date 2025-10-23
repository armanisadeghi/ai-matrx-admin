// app\enjoy\matrx-jump\jump-with-settings\GamePageClient.tsx
'use client';

import React, { useState, RefObject } from 'react';
import { CharacterSelect } from '../components/CharacterSelect';
import { useGameControls } from '../hooks/useGameControls';
import { useGameEntities } from '../hooks/useGameEntities';
import { useGameLoop } from '../hooks/useGameLoop';
import type { Character, GameStatus } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GameSettings } from '../components/GameSettings';

// https://claude.ai/chat/2979c853-e93c-49ca-89ee-d0528cbcb8df

export default function GamePage() {
    const [character, setCharacter] = useState<Character>();
    const [gameStatus, setGameStatus] = useState<GameStatus>('selecting');
    const {
        controls,
        isGyroAvailable,
        hasGyroPermission,
        requestGyroPermission
    } = useGameControls();

    const { gameState, setGameState, initializeGame, updateEntities } = useGameEntities(character);
    const { canvasRef } = useGameLoop(
        gameState,
        setGameState,
        gameStatus,
        setGameStatus,
        character,
        gameStatus === 'playing' ? (state) => updateEntities({ ...state, ...controls }) : undefined
    );

    const handleCharacterSelect = (selectedCharacter: Character) => {
        setCharacter(selectedCharacter);
        initializeGame();
        setGameStatus('ready');
    };

    const handleStartGame = () => {
        setGameStatus('playing');
    };

    const handleRestartGame = () => {
        initializeGame();
        setGameStatus('playing');
    };

    React.useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (gameStatus === 'ready') {
                    handleStartGame();
                } else if (gameStatus === 'gameover') {
                    handleRestartGame();
                }
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [gameStatus]);

    if (!character) {
        return <CharacterSelect onSelect={handleCharacterSelect} />;
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <GameSettings />
            <div className="text-xl font-bold">Score: {gameState.score}</div>
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-border rounded-lg bg-background"
                />
                {gameStatus === 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <button
                            onClick={handleStartGame}
                            className="px-6 py-3 text-lg font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Start Game
                        </button>
                    </div>
                )}
            </div>
            {isGyroAvailable && !hasGyroPermission && (
                <button
                    onClick={requestGyroPermission}
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    Enable Device Motion Controls
                </button>
            )}
            {isGyroAvailable && hasGyroPermission && (
                <p>Tilt device left/right to move</p>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
                <p>Use ← → arrows to move</p>
                <p>Jump on enemies to defeat them</p>
                <p>Collect coins for points</p>
                <p>Avoid hitting enemies from the sides</p>
            </div>
        </div>
    );
}
