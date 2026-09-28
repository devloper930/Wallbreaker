import React from 'react';
import { X, Shield, Move, HelpCircle, AlertCircle, Award } from 'lucide-react';
import { RATING_TIERS } from '../logic/profile';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#272522] border-b border-[#3c3934] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#81b64c]" />
            <h2 className="text-base font-bold text-white tracking-wide">HOW TO PLAY WALLBREAKER</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#3c3934] text-[#9e9c98] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#9e9c98] leading-relaxed">
          {/* Goal */}
          <div className="bg-[#272522] p-3 rounded-xl border border-[#3c3934] space-y-1">
            <div className="flex items-center gap-1.5 text-white font-bold text-sm">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Objective</span>
            </div>
            <p>
              Navigate your pawn to the opposite goal edge before your opponents do, while strategically deploying walls to slow them down.
            </p>
          </div>

          {/* Turn Actions */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Turn Options (Choose One)</h3>

            {/* 1. Pawn Movement */}
            <div className="flex gap-3 bg-[#2b2926]/50 p-2.5 rounded-lg border border-[#3c3934]/60">
              <div className="w-7 h-7 rounded-lg bg-[#81b64c]/20 text-[#81b64c] flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div className="space-y-0.5">
                <span className="text-white font-semibold block">Step or Jump Pawn</span>
                <p>
                  Move one square orthogonally (up, down, left, right) to an open adjacent cell.
                </p>
                <p className="text-[11px] text-[#81b64c]">
                  <strong>Jumping:</strong> If an opponent pawn is directly adjacent, you can jump over them. If the space behind is blocked by a wall or edge, you may jump diagonally to either side!
                </p>
              </div>
            </div>

            {/* 2. Wall Placement */}
            <div className="flex gap-3 bg-[#2b2926]/50 p-2.5 rounded-lg border border-[#3c3934]/60">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div className="space-y-0.5">
                <span className="text-white font-semibold block">Place a Wall</span>
                <p>
                  Place a 2-cell wall on any groove between cells (Horizontal or Vertical). You start with 10 walls in 2-player mode and 5 walls in 4-player mode.
                </p>
              </div>
            </div>
          </div>

          {/* Golden Rule */}
          <div className="bg-red-950/30 p-3 rounded-xl border border-red-800/50 space-y-1">
            <div className="flex items-center gap-1.5 text-red-300 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>THE GOLDEN RULE: No Complete Blockade!</span>
            </div>
            <p className="text-red-200/90 text-[11px]">
              A wall can <strong>NEVER</strong> be placed if it completely seals every path to a player's goal. Our real-time BFS pathfinder enforces that every player maintains at least one unobstructed route to victory.
            </p>
          </div>

          {/* Competitive Rating Tiers & Title Badges */}
          <div className="space-y-2.5 bg-[#272522] p-3.5 rounded-xl border border-[#3c3934]">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Competitive Rating & Title Badges</span>
            </div>
            <p className="text-[11px] text-[#9e9c98] leading-tight">
              All players start with an initial rating of <strong className="text-amber-400">400 Elo</strong>. Title badges are automatically awarded as you climb the rating ladder and cannot be manually selected. You must maintain your rating to keep your badge!
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-[1fr_80px] text-[10px] font-bold text-[#666461] uppercase tracking-wider px-1">
                <span>Rank & Badge</span>
                <span className="text-right">Required Elo</span>
              </div>
              <div className="space-y-1">
                {RATING_TIERS.map((tier) => (
                  <div
                    key={tier.title}
                    className="p-1.5 rounded-lg bg-[#1b1a17] border border-[#3c3934]/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{tier.icon}</span>
                      <span className="font-mono font-bold text-white text-[11px]">{tier.title}</span>
                      <span className="text-[10px] text-[#9e9c98]">({tier.name})</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-[11px]">
                      {tier.maxRating === Infinity ? `${tier.minRating}+` : `${tier.minRating} - ${tier.maxRating}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Modes */}
          <div className="space-y-2">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Game Modes</h3>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-[#81b64c] font-bold">• Classic:</span>
                <span>Opposite edges, 10 walls each. Standard Quoridor barricade tactics.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">• Race Mode:</span>
                <span>Both start side-by-side on the same edge, racing to the opposite side.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-purple-400 font-bold">• Quad Compete:</span>
                <span>4 players on all 4 board edges, 5 walls each, clockwise turns. First to reach opposite side wins.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#272522] border-t border-[#3c3934] text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-bold text-xs shadow transition-all"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
