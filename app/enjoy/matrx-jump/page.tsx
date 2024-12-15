'use client';
import React, { useEffect, useRef, useState } from 'react';

const PlatformJumper = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const gameStateRef = useRef({
        player: {
            x: 200,
            y: 300,
            velocityY: 0,
            width: 30,
            height: 30,
            speed: 5
        },
        platforms: [],
        coins: [],
        autoScrollSpeed: 0.5,
        isGameOver: false,
        gameLoop: null,
        rightPressed: false,
        leftPressed: false
    });

    const generatePlatform = (y) => ({
        x: Math.random() * (400 - 60),
        y,
        width: 60,
        height: 10
    });

    const generateCoin = (y) => ({
        x: Math.random() * (400 - 20),
        y,
        width: 20,
        height: 20,
        collected: false
    });

    const initGame = () => {
        const state = gameStateRef.current;
        state.platforms = [];
        state.coins = [];

        // Create initial platform directly under player
        const initialPlatform = {
            x: 170,
            y: 350,
            width: 60,
            height: 10
        };
        state.platforms.push(initialPlatform);

        // Generate other platforms
        for (let i = 1; i < 8; i++) {
            state.platforms.push(generatePlatform(i * 100));
        }

        // Generate initial coins
        for (let i = 1; i < 5; i++) {
            state.coins.push(generateCoin(i * 150));
        }

        state.player = {
            x: 200,
            y: 300,
            velocityY: 0,
            width: 30,
            height: 30,
            speed: 5
        };
        state.autoScrollSpeed = 0.5;
        state.isGameOver = false;
        setScore(0);
    };

    const handleKeyDown = (e) => {
        const state = gameStateRef.current;
        if (e.key === 'ArrowRight') state.rightPressed = true;
        if (e.key === 'ArrowLeft') state.leftPressed = true;
        if (e.key === ' ' && state.isGameOver) {
            initGame();
            startGameLoop();
        }
    };

    const handleKeyUp = (e) => {
        const state = gameStateRef.current;
        if (e.key === 'ArrowRight') state.rightPressed = false;
        if (e.key === 'ArrowLeft') state.leftPressed = false;
    };

    const update = () => {
        const state = gameStateRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Apply auto-scroll
        state.platforms.forEach(platform => {
            platform.y += state.autoScrollSpeed;
        });
        state.coins.forEach(coin => {
            coin.y += state.autoScrollSpeed;
        });
        state.player.y += state.autoScrollSpeed;

        // Update player position
        if (state.rightPressed) {
            state.player.x += state.player.speed;
            if (state.player.x > canvas.width) state.player.x = 0;
        }
        if (state.leftPressed) {
            state.player.x -= state.player.speed;
            if (state.player.x < 0) state.player.x = canvas.width;
        }

        // Apply gravity
        state.player.velocityY += 0.5;
        state.player.y += state.player.velocityY;

        // Check platform collisions
        state.platforms.forEach((platform) => {
            if (
                state.player.velocityY > 0 &&
                state.player.x < platform.x + platform.width &&
                state.player.x + state.player.width > platform.x &&
                state.player.y + state.player.height > platform.y &&
                state.player.y + state.player.height < platform.y + platform.height
            ) {
                state.player.velocityY = -13;
            }
        });

        // Check coin collisions
        state.coins.forEach((coin) => {
            if (
                !coin.collected &&
                state.player.x < coin.x + coin.width &&
                state.player.x + state.player.width > coin.x &&
                state.player.y < coin.y + coin.height &&
                state.player.y + state.player.height > coin.y
            ) {
                coin.collected = true;
                setScore(prev => prev + 50);
            }
        });

        // Move view up and generate new platforms
        if (state.player.y < 300) {
            const diff = 300 - state.player.y;
            state.player.y = 300;
            state.platforms.forEach((platform) => {
                platform.y += diff;
            });
            state.coins.forEach((coin) => {
                coin.y += diff;
            });
        }

        // Remove and regenerate platforms
        state.platforms = state.platforms.filter(platform => platform.y < canvas.height);
        while (state.platforms.length < 8) {
            state.platforms.push(generatePlatform(Math.min(...state.platforms.map(p => p.y)) - 100));
        }

        // Remove and regenerate coins
        state.coins = state.coins.filter(coin => coin.y < canvas.height && !coin.collected);
        while (state.coins.length < 5) {
            state.coins.push(generateCoin(Math.min(...state.platforms.map(p => p.y)) - Math.random() * 100));
        }

        // Gradually increase scroll speed
        state.autoScrollSpeed += 0.0001;

        // Check game over
        if (state.player.y > canvas.height) {
            state.isGameOver = true;
            if (state.gameLoop) {
                cancelAnimationFrame(state.gameLoop);
                state.gameLoop = null;
            }
        }

        render();
    };

    const render = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const state = gameStateRef.current;

        // Draw platforms
        ctx.fillStyle = '#4ade80';
        state.platforms.forEach((platform) => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        // Draw coins
        state.coins.forEach((coin) => {
            if (!coin.collected) {
                ctx.fillStyle = '#fcd34d';
                ctx.beginPath();
                ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw player
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(
            state.player.x,
            state.player.y,
            state.player.width,
            state.player.height
        );

        // Draw game over text
        if (state.isGameOver) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '30px Arial';
            ctx.fillText('Game Over!', canvas.width / 2 - 70, canvas.height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Press SPACE to restart', canvas.width / 2 - 90, canvas.height / 2 + 40);
        }
    };

    const startGameLoop = () => {
        const state = gameStateRef.current;
        const loop = () => {
            update();
            if (!state.isGameOver) {
                state.gameLoop = requestAnimationFrame(loop);
            }
        };
        state.gameLoop = requestAnimationFrame(loop);
    };

    useEffect(() => {
        initGame();
        startGameLoop();
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (gameStateRef.current.gameLoop) {
                cancelAnimationFrame(gameStateRef.current.gameLoop);
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="text-xl font-bold">Score: {score}</div>
            <canvas
                ref={canvasRef}
                width={400}
                height={600}
                className="border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-900"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Use ← → arrows to move
            </div>
        </div>
    );
};

export default PlatformJumper;
