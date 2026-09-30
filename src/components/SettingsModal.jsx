import React from 'react';
import { X, Settings, Volume2, Eye, Zap, ShieldCheck, RotateCcw, Palette, CircleDot } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { PIECE_THEMES } from '../logic/pieceThemes';

export const BOARD_THEMES = [
  { id: 'classic', label: 'Classic Green', color: '#769656' },
  { id: 'rough', label: 'Shady Slate', color: '#4b5563' },
  { id: 'magma', label: 'Volcanic Crag', color: '#5c2919' },
  { id: 'wood', label: 'Warm Wood', color: '#b58863' },
  { id: 'dark', label: 'Carbon Dark', color: '#27272a' },
  { id: 'glass', label: 'Midnight Blue', color: '#1e293b' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  showCoords = true,
  setShowCoords,
  isMuted = false,
  setIsMuted,
  confirmResign = true,
  setConfirmResign,
  showReactions = true,
  setShowReactions,
  theme = 'classic',
  setTheme,
  pieceTheme = 'gem',
  setPieceTheme,
  userProfile,
  onOpenAuthModal,
  onResetDefaults,
}) {
  if (!isOpen) return null;

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    if (setIsMuted) setIsMuted(muted);
    if (!muted) {
      soundManager.playMove();
    }
  };

  const handleResetDefaults = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      if (setShowCoords) setShowCoords(true);
      if (setIsMuted && isMuted) {
        soundManager.toggleMute();
        setIsMuted(false);
      }
      if (setConfirmResign) setConfirmResign(true);
      if (setShowReactions) setShowReactions(true);
      if (setTheme) setTheme('classic');
      if (setPieceTheme) setPieceTheme('gem');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#21201d] border border-[#3c3934] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3c3934] flex items-center justify-between bg-[#272522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3c3934] flex items-center justify-center text-white">
              <Settings className="w-4 h-4 text-[#81b64c]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Game Settings</h2>
              <p className="text-[11px] text-[#9e9c98]">Configure board, gameplay, audio & themes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1b1a17] hover:bg-[#3c3934] text-[#9e9c98] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Board Coordinates Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934]">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Board Coordinates</div>
                <div className="text-[10px] text-[#9e9c98]">Show 1..9 and a..i edge notations on arena</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCoords && setShowCoords((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                showCoords ? 'bg-[#81b64c]' : 'bg-[#3c3934]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  showCoords ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 2. Sound Effects Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934]">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">Game Audio & Pops</div>
                <div className="text-[10px] text-[#9e9c98]">Synthesized piece & wall sound effects</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                !isMuted ? 'bg-[#81b64c]' : 'bg-[#3c3934]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  !isMuted ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 3. Animated Rage Reactions Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934]">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">Animated Rage Emotes</div>
                <div className="text-[10px] text-[#9e9c98]">Show floating ragebaiting emotes in game</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReactions && setShowReactions((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                showReactions ? 'bg-[#81b64c]' : 'bg-[#3c3934]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  showReactions ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 4. Resignation Confirmation Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs font-bold text-white">Confirm Resignations</div>
                <div className="text-[10px] text-[#9e9c98]">Prompt confirmation before resigning match</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmResign && setConfirmResign((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                confirmResign ? 'bg-[#81b64c]' : 'bg-[#3c3934]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  confirmResign ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 5. Board Theme Selector */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Board Theme</span>
              </div>
              <span className="text-[10px] font-mono text-[#81b64c] uppercase font-bold">
                {BOARD_THEMES.find((b) => b.id === theme)?.label || 'Classic Green'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {BOARD_THEMES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setTheme && setTheme(b.id)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    theme === b.id
                      ? 'bg-[#2b2926] border-[#81b64c] text-white shadow ring-1 ring-[#81b64c]/40'
                      : 'bg-[#21201d] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-[11px] font-medium truncate leading-tight">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Piece & Wall Theme Selector */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold text-white">Piece & Wall Theme</span>
              </div>
              <span className="text-[10px] font-mono text-[#81b64c] uppercase font-bold">
                {PIECE_THEMES.find((p) => p.id === pieceTheme)?.name || 'Gemstones'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {PIECE_THEMES.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPieceTheme && setPieceTheme(pt.id)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                    pieceTheme === pt.id
                      ? 'bg-[#2b2926] border-[#81b64c] text-white shadow ring-1 ring-[#81b64c]/40'
                      : 'bg-[#21201d] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{pt.preview}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-white leading-tight truncate">
                        {pt.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {pt.players.slice(0, 2).map((pl, idx) => (
                          <span
                            key={idx}
                            className="w-2 h-2 rounded-full border border-black/40"
                            style={{ backgroundColor: pl.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {pieceTheme === pt.id && (
                    <span className="text-[#81b64c] font-bold text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#1b1a17] border-t border-[#3c3934] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-[#9e9c98] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-xs transition-all cursor-pointer shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
