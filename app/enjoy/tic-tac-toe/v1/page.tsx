"use client";

import React, { useState, useEffect } from "react";

const TikTacToe = () => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState(null);
    const [winningLine, setWinningLine] = useState([]);
    const [gameStats, setGameStats] = useState({ X: 0, O: 0, draws: 0 });
    const [showCelebration, setShowCelebration] = useState(false);

    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8], // rows
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8], // columns
        [0, 4, 8],
        [2, 4, 6], // diagonals
    ];

    const checkWinner = (squares) => {
        for (let combo of winningCombinations) {
            const [a, b, c] = combo;
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return { winner: squares[a], line: combo };
            }
        }
        return null;
    };

    const handleClick = (index) => {
        if (board[index] || winner) return;

        const newBoard = [...board];
        newBoard[index] = isXNext ? "X" : "O";
        setBoard(newBoard);

        const result = checkWinner(newBoard);
        if (result) {
            setWinner(result.winner);
            setWinningLine(result.line);
            setGameStats((prev) => ({ ...prev, [result.winner]: prev[result.winner] + 1 }));
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 2000);
        } else if (newBoard.every((square) => square !== null)) {
            setWinner("draw");
            setGameStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
        } else {
            setIsXNext(!isXNext);
        }
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setWinningLine([]);
        setShowCelebration(false);
    };

    const resetStats = () => {
        setGameStats({ X: 0, O: 0, draws: 0 });
    };

    const getSquareClasses = (index) => {
        let classes =
            "relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-400/30 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/25 active:scale-95";

        if (winningLine.includes(index)) {
            classes +=
                " bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-xl shadow-emerald-400/50 animate-pulse";
        }

        return classes;
    };

    const getPlayerClasses = (player) => {
        if (player === "X") {
            return "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 drop-shadow-lg animate-bounce-in";
        } else {
            return "text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 drop-shadow-lg animate-bounce-in";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-600/10 to-transparent rounded-full animate-spin-slow"></div>
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/10 to-transparent rounded-full animate-spin-reverse"></div>
            </div>

            {/* Celebration overlay */}
            {showCelebration && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="text-center animate-bounce">
                        <div className="text-6xl md:text-8xl mb-4">🎉</div>
                        <div className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            {winner === "draw" ? "Draw!" : `${winner} Wins!`}
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 text-center max-w-md mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600 mb-4 animate-pulse">
                        MatrxTacToe
                    </h1>
                    <div className="text-xl md:text-2xl font-semibold text-gray-300 mb-4">
                        {winner ? (winner === "draw" ? "It's a Draw!" : `${winner} Wins!`) : `Player ${isXNext ? "X" : "O"}'s Turn`}
                    </div>
                </div>

                {/* Game Board */}
                <div className="grid grid-cols-3 gap-3 mb-8 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl backdrop-blur-sm border border-cyan-400/20 shadow-2xl">
                    {board.map((square, index) => (
                        <button key={index} className={getSquareClasses(index)} onClick={() => handleClick(index)} disabled={!!winner}>
                            {square && <span className={getPlayerClasses(square)}>{square}</span>}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="mb-6 p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-2xl backdrop-blur-sm border border-cyan-400/20">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                                {gameStats.X}
                            </div>
                            <div className="text-sm text-gray-400">Player X</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-400">{gameStats.draws}</div>
                            <div className="text-sm text-gray-400">Draws</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                                {gameStats.O}
                            </div>
                            <div className="text-sm text-gray-400">Player O</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={resetGame}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        New Game
                    </button>
                    <button
                        onClick={resetStats}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        Reset Stats
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce-in {
                    0% {
                        transform: scale(0);
                    }
                    50% {
                        transform: scale(1.2);
                    }
                    100% {
                        transform: scale(1);
                    }
                }

                @keyframes spin-slow {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes spin-reverse {
                    from {
                        transform: rotate(360deg);
                    }
                    to {
                        transform: rotate(0deg);
                    }
                }

                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }

                .animate-spin-reverse {
                    animation: spin-reverse 15s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default TikTacToe;
