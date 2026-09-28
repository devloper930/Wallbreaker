import React, { useState } from 'react';
import { RefreshCw, Flag, Handshake, Shield, Move, AlertTriangle } from 'lucide-react';

export default function GameControls({
  wallOrientation,
  onToggleOrientation,
  onResign,
  onOfferDraw,
  onFlipBoard,
  flipped,
  wallsLeft,
  canResign = true,
  canDraw = true,
  status = 'playing',
  confirmResign = true,
}) {
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const handleResignClick = () => {
    if (confirmResign) {
      setShowResignConfirm(true);
    } else {
      onResign();
    }
  };

  return (
    <div className="bg-[#21201d] rounded-xl border border-[#3c3934] p-3 space-y-3 select-none">
      {/* Wall Orientation Selector */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#9e9c98] flex items-center gap-1.5 uppercase tracking-wide">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          Wall Tool
        </span>

        <button
          onClick={onToggleOrientation}
          title="Toggle wall orientation (Shortcut: R)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2b2926] hover:bg-[#3c3934] border border-[#3c3934] transition-all text-xs font-semibold text-white active:scale-95"
        >
          <div
            className={`w-4 h-4 rounded-sm border transition-all flex items-center justify-center ${
              wallOrientation === 'h'
                ? 'border-amber-400 bg-amber-400/20'
                : 'border-cyan-400 bg-cyan-400/20'
            }`}
          >
            <div
              className={`bg-amber-400 rounded-full transition-all ${
                wallOrientation === 'h' ? 'w-3 h-1' : 'w-1 h-3 bg-cyan-400'
              }`}
            />
          </div>
          <span>{wallOrientation === 'h' ? 'Horizontal' : 'Vertical'}</span>
          <kbd className="text-[10px] bg-[#1b1a17] text-[#9e9c98] px-1 py-0.5 rounded font-mono border border-[#3c3934]">
            R
          </kbd>
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Flip Board */}
        <button
          onClick={onFlipBoard}
          title="Flip board perspective"
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#272522] hover:bg-[#2b2926] border border-[#3c3934] text-[#9e9c98] hover:text-white transition-all text-[11px] font-medium"
        >
          <RefreshCw className={`w-4 h-4 mb-1 transition-transform ${flipped ? 'rotate-180' : ''}`} />
          <span>Flip</span>
        </button>

        {/* Offer Draw */}
        <button
          onClick={onOfferDraw}
          disabled={!canDraw || status !== 'playing'}
          title="Offer Draw to Opponent"
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#272522] hover:bg-[#2b2926] border border-[#3c3934] text-[#9e9c98] hover:text-white transition-all text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Handshake className="w-4 h-4 mb-1 text-sky-400" />
          <span>Draw</span>
        </button>

        {/* Resign */}
        <button
          onClick={handleResignClick}
          disabled={!canResign || status !== 'playing'}
          title="Resign Game"
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#272522] hover:bg-red-950/40 hover:border-red-800/60 border border-[#3c3934] text-[#9e9c98] hover:text-red-400 transition-all text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Flag className="w-4 h-4 mb-1 text-red-400" />
          <span>Resign</span>
        </button>
      </div>

      {/* Resign Confirmation Modal Banner */}
      {showResignConfirm && (
        <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-center space-y-2 animate-in fade-in">
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-200 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Are you sure you want to resign?
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setShowResignConfirm(false);
                onResign();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded shadow"
            >
              Yes, Resign
            </button>
            <button
              onClick={() => setShowResignConfirm(false)}
              className="px-3 py-1 bg-[#3c3934] hover:bg-[#4d4942] text-white font-semibold text-xs rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
