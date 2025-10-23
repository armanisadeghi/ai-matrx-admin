// hooks/useGameEntities.ts
'use client';

import { useState, useCallback } from 'react';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORM_WIDTH, PLATFORM_HEIGHT,
    COIN_SIZE, ENEMY_SIZE, ENEMY_SPEED, PLAYER_SIZE,
    PLAYER_SPEED, BASE_SCROLL_SPEED, GRAVITY,
    INITIAL_ENEMY_SPAWN_DELAY, MIN_ENEMY_COUNT, MAX_ENEMY_COUNT,
    ENEMY_SPAWN_HEIGHT_BUFFER
} from '../constants';
import type { GameState, Platform, Coin, Enemy, Character } from '../types';

export const useGameEntities = (character: Character) => {
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [gameState, setGameState] = useState<GameState>({
        player: {
            x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
            y: 300,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            velocityY: 0,
            speed: PLAYER_SPEED
        },
        platforms: [],
        coins: [],
        enemies: [],
        autoScrollSpeed: BASE_SCROLL_SPEED,
        isGameOver: false,
        score: 0
    });

    const generatePlatform = useCallback((y: number): Platform => ({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT
    }), []);

    const generateCoin = useCallback((y: number): Coin => ({
        x: Math.random() * (CANVAS_WIDTH - COIN_SIZE),
        y,
        width: COIN_SIZE,
        height: COIN_SIZE,
        collected: false
    }), []);

    const generateEnemy = useCallback((y: number): Enemy => ({
        x: Math.random() * (CANVAS_WIDTH - ENEMY_SIZE),
        y: Math.min(y, -ENEMY_SPAWN_HEIGHT_BUFFER),
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        speed: ENEMY_SPEED,
        direction: Math.random() > 0.5 ? 1 : -1,
        isDead: false
    }), []);

    const getDesiredEnemyCount = useCallback(() => {
        const gameTime = Date.now() - gameStartTime;
        if (gameTime < INITIAL_ENEMY_SPAWN_DELAY) return 0;

        const baseCount = Math.floor((gameTime - INITIAL_ENEMY_SPAWN_DELAY) / 20000);
        return Math.min(Math.max(baseCount, MIN_ENEMY_COUNT), MAX_ENEMY_COUNT);
    }, [gameStartTime]);

    const initializeGame = useCallback(() => {
        setGameStartTime(Date.now());

        const initialPlatforms = [
            {
                x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
                y: 350,
                width: PLATFORM_WIDTH,
                height: PLATFORM_HEIGHT
            }
        ];

        for (let i = 1; i < 8; i++) {
            initialPlatforms.push(generatePlatform(i * 100));
        }

        const initialCoins = Array(5).fill(null).map((_, i) =>
            generateCoin((i + 1) * 150)
        );

        setGameState(prev => ({
            ...prev,
            player: {
                ...prev.player,
                x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
                y: 300,
                velocityY: 0,
                speed: PLAYER_SPEED
            },
            platforms: initialPlatforms,
            coins: initialCoins,
            enemies: [], // Start with no enemies
            autoScrollSpeed: BASE_SCROLL_SPEED,
            isGameOver: false,
            score: 0
        }));
    }, [generatePlatform, generateCoin]);

    const updateEntities = useCallback((controls: { rightPressed: boolean; leftPressed: boolean }) => {
        setGameState(prev => {
            if (prev.isGameOver) return prev;

            const nextState = { ...prev };

            // Update player position
            if (controls.rightPressed) {
                nextState.player.x += nextState.player.speed;
                if (nextState.player.x > CANVAS_WIDTH) nextState.player.x = 0;
            }
            if (controls.leftPressed) {
                nextState.player.x -= nextState.player.speed;
                if (nextState.player.x < 0) nextState.player.x = CANVAS_WIDTH;
            }

            // Apply gravity
            nextState.player.velocityY += GRAVITY;
            nextState.player.y += nextState.player.velocityY;

            // Update entity positions
            const updatePositionForScroll = (entity: { y: number }) => {
                entity.y += nextState.autoScrollSpeed;
            };

            nextState.platforms.forEach(updatePositionForScroll);
            nextState.coins.forEach(updatePositionForScroll);
            nextState.enemies.forEach(enemy => {
                updatePositionForScroll(enemy);
                if (!enemy.isDead) {
                    enemy.x += enemy.speed * enemy.direction;
                    if (enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH) {
                        enemy.direction *= -1;
                    }
                }
            });

            // Clean up off-screen entities
            nextState.platforms = nextState.platforms.filter(p => p.y < CANVAS_HEIGHT);
            nextState.coins = nextState.coins.filter(c => c.y < CANVAS_HEIGHT && !c.collected);
            nextState.enemies = nextState.enemies.filter(e => e.y < CANVAS_HEIGHT);

            // Generate new platforms
            while (nextState.platforms.length < 8) {
                const highestPlatformY = Math.min(...nextState.platforms.map(p => p.y));
                nextState.platforms.push(generatePlatform(highestPlatformY - 100));
            }

            // Generate new coins
            while (nextState.coins.length < 5) {
                const highestCoinY = nextState.coins.length > 0
                                     ? Math.min(...nextState.coins.map(c => c.y))
                                     : 0;
                nextState.coins.push(generateCoin(highestCoinY - Math.random() * 100));
            }

            // Generate new enemies based on time-based count
            const desiredEnemyCount = getDesiredEnemyCount();
            while (nextState.enemies.length < desiredEnemyCount) {
                const highestEnemyY = nextState.enemies.length > 0
                                      ? Math.min(...nextState.enemies.map(e => e.y))
                                      : -ENEMY_SPAWN_HEIGHT_BUFFER;
                const spawnY = Math.min(highestEnemyY - Math.random() * 200, -ENEMY_SPAWN_HEIGHT_BUFFER);
                nextState.enemies.push(generateEnemy(spawnY));
            }

            if (nextState.player.y > CANVAS_HEIGHT) {
                nextState.isGameOver = true;
            }

            return nextState;
        });
    }, [generatePlatform, generateCoin, generateEnemy, getDesiredEnemyCount]);

    return {
        gameState,
        setGameState,
        initializeGame,
        updateEntities
    };
};
