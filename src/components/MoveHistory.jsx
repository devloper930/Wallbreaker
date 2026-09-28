import React, { useEffect, useRef } from 'react';
import { ScrollText, Shield, Zap } from 'lucide-react';

export default function MoveHistory({ history = [], mode = 'classic' }) {
  const scrollRef = useRef(null);

  // Auto-scroll to latest move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  // Count walls and jumps
  const wallCount = history.filter(h => h.action.type === 'wall').length;
  const jumpCount = history.filter(h => h.action.type === 'pawn' && h.notation.includes('-')).length;

  // Format move pairs for 2-player modes
  const is2Player = mode !== 'quad';
  const movePairs = [];

  if (is2Player) {
    for (let i = 0; i < history.length; i += 2) {
      movePairs.push({
        moveNum: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1] || null,
      });
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#21201d] rounded-xl border border-[#3c3934] overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 bg-[#272522] border-b border-[#3c3934] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-[#81b64c]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Move History</span>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#3c3934] text-[#9e9c98]">
          {history.length} moves
        </span>
      </div>

      {/* Move list body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs divide-y divide-[#3c3934]/30"
      >
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#666461] text-xs italic py-8">
            No moves played yet
          </div>
        ) : is2Player ? (
          movePairs.map((pair) => (
            <div
              key={pair.moveNum}
              className="grid grid-cols-[36px_1fr_1fr] items-center py-1 px-1.5 rounded hover:bg-[#2b2926] transition-colors"
            >
              <span className="text-[#666461] font-semibold">{pair.moveNum}.</span>
              <span
                className={`px-1.5 py-0.5 rounded truncate ${
                  pair.white?.action.type === 'wall'
                    ? 'text-amber-400 font-semibold'
                    : 'text-white'
                }`}
              >
                {pair.white?.notation.replace(/^P1:\s*/, '')}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded truncate ${
                  pair.black?.action.type === 'wall'
                    ? 'text-amber-400 font-semibold'
                    : 'text-[#9e9c98]'
                }`}
              >
                {pair.black ? pair.black.notation.replace(/^P2:\s*/, '') : ''}
              </span>
            </div>
          ))
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#2b2926] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#666461] w-6">{idx + 1}.</span>
                <span
                  className={
                    item.action.type === 'wall' ? 'text-amber-400 font-semibold' : 'text-white'
                  }
                >
                  {item.notation}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2.5 bg-[#272522] border-t border-[#3c3934] flex items-center justify-around text-[11px] text-[#9e9c98]">
        <div className="flex items-center gap-1.5" title="Total Walls Placed">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Walls: <strong className="text-white font-mono">{wallCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5" title="Total Jumps Made">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Jumps: <strong className="text-white font-mono">{jumpCount}</strong></span>
        </div>
      </div>
    </div>
  );
}
