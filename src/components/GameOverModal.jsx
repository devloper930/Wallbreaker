import React, { useEffect, useState } from 'react';
import { Trophy, RotateCcw, Home, Eye, CheckCircle, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

export default function GameOverModal({
  winner,
  winReason,
  gameState,
  ratingChange = null,
  currentRating = 400,
  onRematch,
  onNewGame,
  isOpen = true,
}) {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (isOpen && winner !== null) {
      setMinimized(false);
      try {
        soundManager.playVictory();
      } catch (e) {
        console.warn('Sound play error:', e);
      }
      // Fire festive confetti safely
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#81b64c', '#f59e0b', '#38bdf8', '#ffffff'],
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const winnerPlayer = (winner !== null && gameState?.players) ? gameState.players[winner] : null;

  const handleReturnHome = (e) => {
    if (e) e.stopPropagation();
    setMinimized(false);
    if (onNewGame) {
      onNewGame();
    }
  };

  const handleRematchClick = (e) => {
    if (e) e.stopPropagation();
    setMinimized(false);
    if (onRematch) {
      onRematch();
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
        <button
          onClick={() => setMinimized(false)}
          className="px-4 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-bold text-xs shadow-2xl flex items-center gap-2 border-2 border-white/20 transition-all hover:scale-105"
        >
          <Trophy className="w-4 h-4 text-black" />
          <span>View Game Results</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
    >
      <div
        className="relative w-full max-w-sm bg-[#21201d] border-2 border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden text-center p-6 space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Top-Right Dismiss / Return Home button */}
        <button
          onClick={handleReturnHome}
          title="Return to Home"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-[#2b2926] text-[#9e9c98] hover:text-white hover:bg-[#3c3934] border border-[#3c3934] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown / Trophy Banner */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-9 h-9 text-slate-900" />
        </div>

        {/* Title & Reason */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-white tracking-wide">
            {winner !== null ? `${winnerPlayer?.name || `Player ${winner + 1}`} Won!` : 'Game Drawn!'}
          </h2>
          <p className="text-xs text-[#9e9c98] font-medium flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-[#81b64c]" />
            {winReason || 'Victory achieved!'}
          </p>
        </div>

        {/* Elo Rating Delta Card (Chess.com Style) */}
        {ratingChange !== null && (
          <div className="p-3 bg-[#272522] rounded-xl border border-[#3c3934] flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-[#9e9c98] uppercase font-bold tracking-wider block">
                Your Rating
              </span>
              <span className="text-base font-extrabold text-white font-mono">
                {currentRating}
              </span>
            </div>

            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                ratingChange > 0
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : ratingChange < 0
                  ? 'bg-red-950/80 text-red-400 border border-red-800'
                  : 'bg-[#3c3934] text-white'
              }`}
            >
              {ratingChange > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{ratingChange}</span>
                </>
              ) : ratingChange < 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{ratingChange}</span>
                </>
              ) : (
                <>
                  <Minus className="w-3.5 h-3.5" />
                  <span>0</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Game Stats Snapshot */}
        <div className="grid grid-cols-2 gap-2 bg-[#272522] rounded-xl p-3 border border-[#3c3934] text-xs">
          <div className="text-left">
            <span className="text-[#666461] block text-[10px] uppercase font-mono">Total Turns</span>
            <span className="text-sm font-bold text-white font-mono">{gameState.turnCount}</span>
          </div>
          <div className="text-left">
            <span className="text-[#666461] block text-[10px] uppercase font-mono">Walls Placed</span>
            <span className="text-sm font-bold text-amber-400 font-mono">{gameState.walls.length}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Rematch */}
          <button
            onClick={handleRematchClick}
            className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch</span>
          </button>

          {/* New Game / Back to Home */}
          <button
            onClick={handleReturnHome}
            className="w-full py-2.5 rounded-xl bg-[#2b2926] hover:bg-[#3c3934] text-white font-semibold text-xs border border-[#3c3934] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4 text-[#9e9c98]" />
            <span>Main Home Page</span>
          </button>

          {/* Review Board */}
          <button
            onClick={() => setMinimized(true)}
            className="w-full py-1 text-xs text-[#9e9c98] hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Review Final Board</span>
          </button>
        </div>
      </div>
    </div>
  );
}
