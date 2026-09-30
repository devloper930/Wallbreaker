import React from 'react';
import { AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function LeaveGameModal({
  isOpen,
  onClose,
  onConfirmLeave,
  isRankedOnline = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-sm bg-[#21201d] border-2 border-red-500/50 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-950/80 border border-red-600/60 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-white tracking-wide">
            {isRankedOnline ? 'Forfeit Ranked Match?' : 'Leave Game in Progress?'}
          </h3>
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider font-mono">
            {isRankedOnline ? '⚠️ Will Count as a Loss' : '⚠️ Progress Will Be Lost'}
          </p>
        </div>

        {/* Description Warning Card */}
        <div className="p-3.5 bg-[#272522] rounded-xl border border-red-900/40 text-xs text-[#b8b6b2] leading-relaxed text-left space-y-2">
          {isRankedOnline ? (
            <>
              <p>
                You have an official ranked match currently in progress. Leaving now will be treated as an <strong className="text-red-400">immediate forfeit</strong>.
              </p>
              <div className="pt-1.5 border-t border-[#3c3934] flex flex-col gap-1 text-[11px] text-[#9e9c98]">
                <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                  <span>•</span>
                  <span>Your Elo rating will decrease</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                  <span>•</span>
                  <span>Recorded as a defeat in career stats</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span>•</span>
                  <span>Opponent receives the victory</span>
                </div>
              </div>
            </>
          ) : (
            <p>
              You have a game currently in progress. If you leave now, your current board position and match moves will be forfeited.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Stay in Game Button (Recommended) */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Stay in Game & Continue Playing</span>
          </button>

          {/* Forfeit / Leave Button */}
          <button
            type="button"
            onClick={onConfirmLeave}
            className="w-full py-2.5 rounded-xl bg-[#2b2926] hover:bg-red-950/80 text-red-400 hover:text-red-300 border border-red-900/50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{isRankedOnline ? 'Forfeit Match & Leave' : 'Quit Match & Return Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
