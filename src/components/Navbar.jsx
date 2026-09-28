import React, { useState } from 'react';
import { Volume2, VolumeX, Palette, Users, Bot, Wifi, HelpCircle, Home, Zap, Settings, User } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { PIECE_THEMES } from '../logic/pieceThemes';

export default function Navbar({
  view = 'home', // 'home' | 'game'
  mode,
  gameType,
  theme,
  setTheme,
  pieceTheme = 'gem',
  setPieceTheme,
  isMuted,
  setIsMuted,
  userProfile,
  onNavigateHome,
  onQuickPlay,
  onOpenProfile,
  onOpenRules,
  onOpenSettings,
  roomCode,
}) {
  const [themeSection, setThemeSection] = useState('board'); // 'board' | 'pieces'

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const themes = [
    { id: 'classic', label: 'Classic Green', color: '#769656' },
    { id: 'rough', label: 'Shady Slate', color: '#4b5563' },
    { id: 'magma', label: 'Volcanic Crag', color: '#5c2919' },
    { id: 'wood', label: 'Warm Wood', color: '#b58863' },
    { id: 'dark', label: 'Carbon Dark', color: '#27272a' },
    { id: 'glass', label: 'Midnight Blue', color: '#1e293b' },
  ];

  return (
    <header className="h-14 bg-[#21201d] border-b border-[#3c3934] px-4 flex items-center justify-between select-none shadow-md z-30">
      {/* Brand & Mode */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#81b64c] to-[#537a2e] flex items-center justify-center shadow-md">
            <span className="text-lg">🧱</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide leading-none flex items-center gap-1.5">
              WALLBREAKER
              {view === 'game' && (
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#3c3934] text-[#81b64c] font-mono tracking-normal">
                  {mode?.toUpperCase()}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-[#9e9c98] leading-none mt-0.5">Quoridor Strategy</p>
          </div>
        </div>

        {/* Room Code Badge if online */}
        {roomCode && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#2b2926] border border-[#3c3934] text-xs font-mono">
            <span className="text-[#9e9c98]">ROOM:</span>
            <span className="text-[#81b64c] font-bold tracking-wider">{roomCode}</span>
          </div>
        )}
      </div>

      {/* Center status (in-game only) */}
      <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-[#9e9c98]">
        {view === 'game' && (
          <>
            {gameType === 'bot' && (
              <span className="flex items-center gap-1 bg-[#272522] px-2.5 py-1 rounded-full border border-[#3c3934]">
                <Bot className="w-3.5 h-3.5 text-[#81b64c]" /> vs Computer
              </span>
            )}
            {gameType === 'local' && (
              <span className="flex items-center gap-1 bg-[#272522] px-2.5 py-1 rounded-full border border-[#3c3934]">
                <Users className="w-3.5 h-3.5 text-[#38bdf8]" /> Pass & Play
              </span>
            )}
            {gameType === 'online' && (
              <span className="flex items-center gap-1 bg-[#272522] px-2.5 py-1 rounded-full border border-[#3c3934]">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Online Live
              </span>
            )}
          </>
        )}
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Unified Theme Dropdown (Board Theme + Piece & Wall Theme) */}
        <div className="relative group">
          <button
            title="Themes (Board, Pieces & Walls)"
            className="p-2 rounded-md hover:bg-[#2b2926] text-[#9e9c98] hover:text-white transition-colors flex items-center gap-1.5 text-xs border border-transparent hover:border-[#3c3934]"
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="hidden xl:inline text-[11px] font-medium text-white/90">Theme</span>
          </button>

          <div className="absolute right-0 mt-1 w-60 bg-[#272522] border border-[#3c3934] rounded-xl shadow-2xl p-2 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold text-white uppercase px-1 pb-1.5 flex items-center justify-between border-b border-[#3c3934] mb-2">
              <span className="flex items-center gap-1">
                <Palette className="w-3 h-3 text-amber-400" /> Theme Options
              </span>
            </div>

            {/* Sub-section Switcher Tabs: Board Theme | Piece & Wall Theme */}
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#1b1a17] rounded-lg mb-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setThemeSection('board');
                }}
                className={`py-1 rounded text-center transition-colors ${
                  themeSection === 'board'
                    ? 'bg-[#3c3934] text-white shadow-sm'
                    : 'text-[#9e9c98] hover:text-white'
                }`}
              >
                Board Theme
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setThemeSection('pieces');
                }}
                className={`py-1 rounded text-center transition-colors ${
                  themeSection === 'pieces'
                    ? 'bg-[#3c3934] text-white shadow-sm'
                    : 'text-[#9e9c98] hover:text-white'
                }`}
              >
                Piece & Wall
              </button>
            </div>

            {/* Sub-option 1: Board Theme */}
            {themeSection === 'board' ? (
              <div className="space-y-0.5">
                <div className="text-[9px] font-semibold text-[#9e9c98] uppercase px-1.5 py-0.5 tracking-wider">
                  Select Board Theme
                </div>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg transition-colors ${
                      theme === t.id
                        ? 'bg-[#3c3934] text-white font-semibold'
                        : 'text-[#9e9c98] hover:bg-[#2b2926] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/30 flex-shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.label}</span>
                    </div>
                    {theme === t.id && <span className="text-[10px] text-[#81b64c] font-bold">✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              /* Sub-option 2: Piece & Wall Theme */
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                <div className="text-[9px] font-semibold text-[#9e9c98] uppercase px-1.5 py-0.5 tracking-wider">
                  Select Piece & Wall Theme
                </div>
                {PIECE_THEMES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setPieceTheme && setPieceTheme(pt.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg transition-colors ${
                      pieceTheme === pt.id
                        ? 'bg-[#3c3934] text-white font-semibold'
                        : 'text-[#9e9c98] hover:bg-[#2b2926] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{pt.preview}</span>
                      <div className="text-left truncate">
                        <div className="text-xs font-semibold leading-tight text-white">{pt.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center -space-x-1 flex-shrink-0 ml-2">
                      {pt.players.slice(0, 2).map((p, idx) => (
                        <span
                          key={idx}
                          className="w-3 h-3 rounded-full border border-black/50 shadow-sm"
                          style={{ backgroundColor: p.color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Game Settings"
          className="p-2 rounded-md hover:bg-[#2b2926] text-[#9e9c98] hover:text-white transition-colors flex items-center gap-1 text-xs"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Profile option in the right side of settings */}
        <button
          onClick={onOpenProfile}
          title="Profile & Customization"
          className="p-2 rounded-md hover:bg-[#2b2926] text-[#9e9c98] hover:text-white transition-colors flex items-center gap-1 text-xs"
        >
          <User className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
          className="p-2 rounded-md hover:bg-[#2b2926] text-[#9e9c98] hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Rules button */}
        <button
          onClick={onOpenRules}
          title="Game Rules"
          className="p-2 rounded-md hover:bg-[#2b2926] text-[#9e9c98] hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Navigation Button: Home vs Quick Play */}
        {view === 'game' ? (
          <button
            onClick={onNavigateHome}
            title="Return to Home Page"
            className="ml-1 px-3 py-1.5 rounded-md bg-[#2b2926] hover:bg-[#3c3934] text-white font-semibold text-xs flex items-center gap-1.5 border border-[#3c3934] transition-all active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-[#9e9c98]" />
            <span>Home</span>
          </button>
        ) : (
          <button
            onClick={onQuickPlay}
            className="ml-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Quick Play</span>
          </button>
        )}
      </div>
    </header>
  );
}
