import React from 'react';

export default function ReactionOverlay({ reactions = [] }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute reaction-bubble-anim flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#1b1a17]/95 border-2 border-amber-400 shadow-[0_8px_24px_rgba(0,0,0,0.8),0_0_16px_rgba(245,158,11,0.5)] text-white font-sans max-w-[280px]"
          style={{
            left: r.left || '50%',
            top: r.top || '40%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Animated Emoji with rage wobble */}
          <span className="text-3xl filter drop-shadow rage-shake flex-shrink-0">
            {r.emoji}
          </span>

          <div className="min-w-0">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-tight flex items-center gap-1">
              <span>{r.senderName || 'Player'}</span>
              <span className="text-[#9e9c98] font-mono text-[9px]">• reaction</span>
            </div>
            <div className="text-xs font-extrabold text-white leading-tight break-words drop-shadow">
              "{r.rage || r.text}"
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
