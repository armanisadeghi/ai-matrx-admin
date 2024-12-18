'use client';

import { useRef, useCallback, useEffect, RefObject } from 'react';
import { GameState, Character, GameStatus } from '../types';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    SCORES,
    TOP_ZONE_THRESHOLD,
    BASE_SCROLL_SPEED,
    SCROLL_ACCELERATION,
    MAX_SCROLL_SPEED,
    JUMP_FORCE
} from '../constants';

interface GameLoopHookResult {
    canvasRef: RefObject<HTMLCanvasElement>;
}


export const useGameLoop = (
    gameState: GameState,
    setGameState: (updater: (prev: GameState) => GameState) => void,
    gameStatus: GameStatus,
    setGameStatus: (status: GameStatus) => void,
    character?: Character,
    updateEntities?: (state: GameState) => void
): GameLoopHookResult => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>();

    const calculateScrollSpeed = useCallback((playerY: number, playerVelocityY: number) => {
        const topZoneY = CANVAS_HEIGHT * TOP_ZONE_THRESHOLD;

        if (playerY >= topZoneY) {
            return BASE_SCROLL_SPEED;
        }

        const topZonePenetration = 1 - (playerY / topZoneY);
        const speedIncrease = topZonePenetration * SCROLL_ACCELERATION;
        const velocityFactor = playerVelocityY < 0
                               ? Math.abs(playerVelocityY) * 0.5
                               : 0;

        return Math.min(
            BASE_SCROLL_SPEED + speedIncrease + velocityFactor,
            MAX_SCROLL_SPEED
        );
    }, []);

    const updateGameState = useCallback(() => {
        if (!updateEntities || gameStatus !== 'playing') return;

        setGameState(prev => {
            const scrollSpeed = calculateScrollSpeed(prev.player.y, prev.player.velocityY);
            const platforms = prev.platforms.map(p => ({ ...p, y: p.y + scrollSpeed }));
            const coins = prev.coins.map(c => ({ ...c, y: c.y + scrollSpeed }));
            const enemies = prev.enemies.map(e => ({ ...e, y: e.y + scrollSpeed }));
            const playerY = prev.player.y + scrollSpeed;

            return {
                ...prev,
                platforms,
                coins,
                enemies,
                player: {
                    ...prev.player,
                    y: playerY
                },
                autoScrollSpeed: scrollSpeed
            };
        });

        updateEntities(gameState);
    }, [gameState, gameStatus, updateEntities, calculateScrollSpeed]);

    const checkCollisions = useCallback(() => {
        if (!character || gameStatus !== 'playing') return;

        setGameState(prev => {
            if (prev.isGameOver) return prev;

            const next = { ...prev };
            let collisionOccurred = false;

            // Platform collisions
            for (const platform of prev.platforms) {
                if (
                    prev.player.velocityY > 0 &&
                    prev.player.x < platform.x + platform.width &&
                    prev.player.x + prev.player.width > platform.x &&
                    prev.player.y + prev.player.height > platform.y &&
                    prev.player.y + prev.player.height < platform.y + platform.height
                ) {
                    next.player.velocityY = JUMP_FORCE;
                    next.player.y = platform.y - prev.player.height;
                    collisionOccurred = true;
                    break;
                }
            }

            // Coin collisions
            for (const coin of prev.coins) {
                if (
                    !coin.collected &&
                    prev.player.x < coin.x + coin.width &&
                    prev.player.x + prev.player.width > coin.x &&
                    prev.player.y < coin.y + coin.height &&
                    prev.player.y + prev.player.height > coin.y
                ) {
                    coin.collected = true;
                    next.score += SCORES.COIN_COLLECT;
                }
            }

            // Enemy collisions
            for (const enemy of prev.enemies) {
                if (
                    !enemy.isDead &&
                    prev.player.x < enemy.x + enemy.width &&
                    prev.player.x + prev.player.width > enemy.x &&
                    prev.player.y < enemy.y + enemy.height &&
                    prev.player.y + prev.player.height > enemy.y
                ) {
                    if (prev.player.velocityY > 0 && prev.player.y + prev.player.height < enemy.y + enemy.height / 2) {
                        enemy.isDead = true;
                        next.player.velocityY = JUMP_FORCE;
                        next.score += SCORES.ENEMY_DEFEAT;
                    } else {
                        next.isGameOver = true;
                        setGameStatus('gameover');
                    }
                    collisionOccurred = true;
                    break;
                }
            }

            if (next.player.y > CANVAS_HEIGHT) {
                next.isGameOver = true;
                setGameStatus('gameover');
                return next;
            }

            return collisionOccurred ? next : prev;
        });
    }, [character, gameStatus, setGameStatus]);

    // Rest of the hook implementation remains the same
    const renderGame = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !character) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (gameStatus === 'ready') {
            ctx.fillStyle = '#60a5fa';
            ctx.font = '30px Arial';
            ctx.fillText('Press Space to Start', CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2);
            return;
        }

        ctx.fillStyle = '#4ade80';
        gameState.platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        gameState.coins.forEach(coin => {
            if (!coin.collected) {
                ctx.fillStyle = '#fcd34d';
                ctx.beginPath();
                ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        gameState.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.fillStyle = '#60a5fa';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        character.render(ctx, gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
        ctx.fill();
        ctx.stroke();

        if (gameStatus === 'gameover') {
            ctx.fillStyle = '#ef4444';
            ctx.font = '30px Arial';
            ctx.fillText('Game Over!', CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Press Space to Restart', CANVAS_WIDTH / 2 - 90, CANVAS_HEIGHT / 2 + 40);
        }
    }, [gameState, character, gameStatus]);

    const gameLoop = useCallback(() => {
        if (gameStatus === 'playing') {
            updateGameState();
            checkCollisions();
        }
        renderGame();
    }, [gameStatus, updateGameState, checkCollisions, renderGame]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (gameStatus === 'ready') {
                    setGameStatus('playing');
                } else if (gameStatus === 'gameover') {
                    setGameStatus('ready');
                }
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [gameStatus, setGameStatus]);

    useEffect(() => {
        if (!frameRef.current) {
            const animate = () => {
                gameLoop();
                frameRef.current = requestAnimationFrame(animate);
            };
            frameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = undefined;
            }
        };
    }, [gameLoop]);

    return {
        canvasRef
    };
};
