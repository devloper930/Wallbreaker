import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Flame, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

export const RAGE_REACTIONS = [
  { id: 'clown', emoji: '🤡', label: 'Clown Move', rage: 'Nice blunder clown 🤡' },
  { id: 'skull', emoji: '💀', label: 'Bro Thought', rage: '💀 Bro really thought' },
  { id: 'yawn', emoji: '🥱', label: 'Too Easy', rage: 'Yaaawn... too easy 🥱' },
  { id: 'salt', emoji: '🧂', label: 'Stay Salty', rage: 'Stay salty! 🧂' },
  { id: 'baby', emoji: '👶', label: 'Cry About It', rage: 'Cry about it 👶' },
  { id: 'fire', emoji: '🔥', label: 'Get Cooked', rage: 'You just got cooked! 🔥' },
  { id: 'zero_iq', emoji: '🧠', label: '0 IQ Play', rage: '0 IQ placement 🧠' },
  { id: 'skill', emoji: '💅', label: 'Skill Issue', rage: 'Pure skill issue 💅' },
  { id: 'turtle', emoji: '🐢', label: 'Move Faster', rage: 'Move faster bro 🐢' },
  { id: 'trash', emoji: '🗑️', label: 'Trash Wall', rage: 'Trash wall 🗑️' },
  { id: 'close', emoji: '🤏', label: 'So Close', rage: 'So close yet so far 🤏' },
  { id: 'quiet', emoji: '🤫', label: 'Shhh Quiet', rage: 'Shhh... quiet down 🤫' },
];

export default function ReactionBox({ onSendReaction, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectReaction = (reaction) => {
    soundManager.playReaction();
    if (onSendReaction) {
      onSendReaction(reaction);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Reaction Box Trigger Button (Between Walls and Timer) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Quick Rage Reactions 🤡"
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
            : 'bg-[#2b2926] hover:bg-[#34312c] border border-[#3c3934] hover:border-amber-400/60 text-[#9e9c98] hover:text-white'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <span className="text-base leading-none animate-bounce" style={{ animationDuration: '2s' }}>
          🤡
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-tighter text-[#9e9c98] leading-none mt-0.5">
          RAGE
        </span>
      </button>

      {/* Floating Animated Rage Reactions Popover */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#1f1e1b] border-2 border-amber-500/40 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-mono font-extrabold uppercase text-amber-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-500 fill-red-500" /> Ragebait Emotes
            </span>
            <span className="text-[9px] text-[#666461] font-mono">tap to send</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {RAGE_REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectReaction(r)}
                title={r.rage}
                className="group p-1.5 rounded-xl bg-[#272522] hover:bg-amber-950/40 border border-[#3c3934] hover:border-amber-400/60 flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className="text-xl group-hover:scale-125 transition-transform drop-shadow">
                  {r.emoji}
                </span>
                <span className="text-[8px] font-medium text-[#9e9c98] group-hover:text-amber-300 truncate max-w-[50px] leading-tight mt-0.5">
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
