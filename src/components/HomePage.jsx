import React, { useState, useMemo } from 'react';
import {
  CHESS_BOTS,
} from '../logic/aiBot';
import {
  MODES,
  TIME_CONTROLS,
} from '../logic/gameEngine';
import { getTitleTierForRating } from '../logic/profile';
import { getGlobalLeaderboard } from '../logic/leaderboard';
import LeaderboardModal from './LeaderboardModal';
import {
  Bot,
  Users,
  Wifi,
  Trophy,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  Gamepad2,
  Swords,
  Award,
  ChevronRight,
  Sliders,
  Edit2,
  Brain,
} from 'lucide-react';

export default function HomePage({
  userProfile,
  theme = 'classic',
  pieceTheme = 'gem',
  onStartBotGame,
  onStartLocalGame,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onQuickPlay,
  onOpenProfile,
  onOpenStatsAnalysis,
  onlineConnecting = false,
  onlineError = null,
  onOpenRules,
}) {
  const [playTab, setPlayTab] = useState('online'); // 'online' | 'bot' | 'room' | 'local'
  const [selectedBotId, setSelectedBotId] = useState('nelson');
  const [customEngineRating, setCustomEngineRating] = useState(1750);
  const [selectedMode, setSelectedMode] = useState(MODES.CLASSIC);
  const [quadGridSize, setQuadGridSize] = useState(11); // 9 | 11 | 13 (Dynamic grid size for Quads)
  const [timeControlKey, setTimeControlKey] = useState('BLITZ_3');
  const [onlineTab, setOnlineTab] = useState('create');
  const [joinCode, setJoinCode] = useState('');
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  const selectedBot = CHESS_BOTS.find(b => b.id === selectedBotId) || CHESS_BOTS[1];

  const { top3 } = useMemo(
    () => getGlobalLeaderboard(userProfile),
    [userProfile]
  );

  const handleStartPlay = () => {
    const boardSize = selectedMode === MODES.QUAD ? quadGridSize : 9;

    if (playTab === 'online') {
      onQuickPlay({
        mode: selectedMode,
        timeControlKey,
        boardSize,
      });
    } else if (playTab === 'bot') {
      onStartBotGame({
        botId: selectedBot.id,
        mode: selectedMode,
        timeControlKey,
        boardSize,
        customRating: selectedBot.isCustom ? customEngineRating : selectedBot.rating,
      });
    } else if (playTab === 'local') {
      onStartLocalGame({
        mode: selectedMode,
        timeControlKey,
        boardSize,
      });
    } else if (playTab === 'room') {
      if (onlineTab === 'create') {
        onCreateOnlineRoom({
          mode: selectedMode,
          timeControlKey,
          boardSize,
        });
      } else {
        if (!joinCode.trim()) return;
        onJoinOnlineRoom({
          roomCode: joinCode.trim(),
        });
      }
    }
  };

  const modeOptions = [
    { id: MODES.CLASSIC, name: 'Classic Barricade', tag: '2P • 10 Walls', icon: '🏆' },
    { id: MODES.RACE, name: 'Race Mode', tag: '2P • Fast Sprint', icon: '⚡' },
    { id: MODES.QUAD, name: 'Quad Compete', tag: `4P • Center Goal (${quadGridSize}×${quadGridSize})`, icon: '👑' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 lg:py-8 flex flex-col items-center justify-center gap-6 select-none">
      {/* ────────────────────────────────────────────────────
          CENTERED PLAY PANEL
         ──────────────────────────────────────────────────── */}
      <div className="w-full bg-[#21201d] rounded-2xl border border-[#3c3934] shadow-2xl p-5 sm:p-6 flex flex-col gap-5">
        {/* Player Stats & Match Analysis Card */}
        {(() => {
          const wins = userProfile?.wins || 0;
          const losses = userProfile?.losses || 0;
          const draws = userProfile?.draws || 0;
          const totalGames = wins + losses + draws;
          const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
          const rating = userProfile?.rating || 400;
          const tier = getTitleTierForRating(rating);
          const avatar = userProfile?.avatar || '👤';
          const name = userProfile?.name || 'Player';
          const peakRating = userProfile?.peakRating || rating;

          return (
            <div
              onClick={onOpenStatsAnalysis}
              title="Click to view full match history & game analysis"
              className="group p-3.5 sm:p-4 rounded-xl bg-[#272522] border border-[#3c3934] hover:border-[#81b64c] hover:bg-[#2b2926] cursor-pointer transition-all shadow-md flex flex-col gap-2.5"
            >
              {/* Top row: Avatar, Name, Title, and Peak Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white/20 group-hover:scale-105 transition-transform">
                    {avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 ${tier.bgBadge}`}
                      >
                        <span>{tier.icon}</span>
                        <span>{tier.title}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9e9c98] mt-0.5 font-mono">
                      <span>Rating: <strong className="text-amber-400 font-bold">{rating}</strong></span>
                      <span>•</span>
                      <span>W: <strong className="text-white">{wins}</strong></span>
                      <span>•</span>
                      <span>L: <strong className="text-white">{losses}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Peak Rating Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1a17] border border-[#3c3934] text-xs font-mono text-amber-400 font-bold shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Peak: {peakRating}</span>
                </div>
              </div>

              {/* Middle row: Win Rate & Previous Matches Analysis action */}
              <div className="pt-2 border-t border-[#3c3934]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#9e9c98] text-[11px]">Win Rate:</span>
                  <span className="font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[10px]">
                    {winRate}%
                  </span>
                  <span className="text-[#666461] text-[10px] hidden sm:inline">
                    ({wins}W / {losses}L)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold group-hover:text-cyan-200 transition-colors">
                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Previous Matches & Analysis</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Bottom row: Showcase Stats directly on front screen */}
              <div className="pt-2.5 border-t border-[#3c3934]/60 grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#1b1a17]/90 border border-[#3c3934]">
                  <div className="text-[10px] text-[#9e9c98] font-bold uppercase tracking-wider">Matches</div>
                  <div className="text-sm font-extrabold text-white font-mono mt-0.5">{totalGames}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1b1a17]/90 border border-[#3c3934]">
                  <div className="text-[10px] text-[#9e9c98] font-bold uppercase tracking-wider">Wins</div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{wins}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1b1a17]/90 border border-[#3c3934]">
                  <div className="text-[10px] text-[#9e9c98] font-bold uppercase tracking-wider">Losses</div>
                  <div className="text-sm font-extrabold text-red-400 font-mono mt-0.5">{losses}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1b1a17]/90 border border-[#3c3934]">
                  <div className="text-[10px] text-[#9e9c98] font-bold uppercase tracking-wider">Win Rate</div>
                  <div className="text-sm font-extrabold text-cyan-400 font-mono mt-0.5">{winRate}%</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Unified Tabbed Play Arena Container */}
        <div className="w-full rounded-2xl border border-[#3c3934] bg-[#1a1916] overflow-hidden shadow-xl">
          {/* Large, Prominent Play Category Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 sm:p-2 bg-[#141311] border-b border-[#3c3934]/70 gap-1.5 sm:gap-2">
            {/* Play online */}
            <button
              onClick={() => setPlayTab('online')}
              className={`py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                playTab === 'online'
                  ? 'bg-[#252320] text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/20'
                  : 'text-[#8a8884] hover:text-[#d4d2cc] hover:bg-[#1f1e1a]'
              }`}
            >
              <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${playTab === 'online' ? 'text-amber-400 fill-amber-400' : 'text-[#8a8884]'}`} />
              <span className="truncate">Play online</span>
            </button>

            {/* vs computer */}
            <button
              onClick={() => setPlayTab('bot')}
              className={`py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                playTab === 'bot'
                  ? 'bg-[#252320] text-[#81b64c] border border-[#81b64c]/40 shadow-lg shadow-[#81b64c]/10 ring-1 ring-[#81b64c]/20'
                  : 'text-[#8a8884] hover:text-[#d4d2cc] hover:bg-[#1f1e1a]'
              }`}
            >
              <Bot className={`w-4 h-4 sm:w-5 sm:h-5 ${playTab === 'bot' ? 'text-[#81b64c]' : 'text-[#8a8884]'}`} />
              <span className="truncate">vs computer</span>
            </button>

            {/* Room */}
            <button
              onClick={() => setPlayTab('room')}
              className={`py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                playTab === 'room'
                  ? 'bg-[#252320] text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/20'
                  : 'text-[#8a8884] hover:text-[#d4d2cc] hover:bg-[#1f1e1a]'
              }`}
            >
              <Wifi className={`w-4 h-4 sm:w-5 sm:h-5 ${playTab === 'room' ? 'text-cyan-400' : 'text-[#8a8884]'}`} />
              <span className="truncate">Room</span>
            </button>

            {/* Offline Mode */}
            <button
              onClick={() => setPlayTab('local')}
              className={`py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                playTab === 'local'
                  ? 'bg-[#252320] text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/10 ring-1 ring-purple-400/20'
                  : 'text-[#8a8884] hover:text-[#d4d2cc] hover:bg-[#1f1e1a]'
              }`}
            >
              <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${playTab === 'local' ? 'text-purple-400' : 'text-[#8a8884]'}`} />
              <span className="truncate">Offline Mode</span>
            </button>
          </div>

          {/* Attached Tab Content Panel */}
          <div className="p-4 sm:p-5 bg-[#252320] space-y-4">
            {/* 1. PLAY ONLINE */}
            {playTab === 'online' && (
              <div key="online" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent rounded-xl border border-amber-500/30 text-xs text-[#9e9c98] flex items-center gap-3.5 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Zap className="w-6 h-6 text-black fill-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Rank-Matched Matchmaking</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold font-mono">
                        Official Elo
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9e9c98] mt-0.5 leading-relaxed">
                      Pairs you against players around your rating in real-time. Rated match results dynamically update your official leaderboard rank!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VS COMPUTER */}
            {playTab === 'bot' && (
              <div key="bot" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent rounded-xl border border-emerald-500/30 text-xs text-[#9e9c98] flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 text-2xl shadow-md">
                      🤖
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Computer Opponents & AI Engine</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#81b64c] border border-emerald-500/30 font-bold">
                          All Skill Levels
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9e9c98] mt-0.5">
                        Play against tailored bot personas or adjust the deep-search engine strength slider.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bot Picker Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {CHESS_BOTS.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => setSelectedBotId(bot.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 relative ${
                        selectedBotId === bot.id
                          ? 'bg-[#81b64c]/20 border-[#81b64c] text-white shadow-md ring-1 ring-[#81b64c]/30'
                          : 'bg-[#1e1c19] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#504c45]'
                      }`}
                    >
                      <div className="text-2xl">{bot.avatar}</div>
                      <div className="font-bold text-xs truncate w-full">{bot.name}</div>
                      <div className="text-[10px] font-mono opacity-80">
                        {bot.isCustom ? `${customEngineRating}` : bot.rating}
                      </div>
                      {bot.isCustom && (
                        <span className="absolute -top-1.5 -right-1 bg-amber-500 text-black text-[8px] font-bold px-1 rounded-full uppercase">
                          Slider
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Engine Rating Slider if Engine is selected */}
                {selectedBot.isCustom && (
                  <div className="p-3.5 bg-[#1b1a17] rounded-xl border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Adjust Engine Strength</span>
                      </div>
                      <div className="text-sm font-mono font-extrabold text-amber-400 bg-[#24221f] px-2.5 py-0.5 rounded border border-[#3c3934]">
                        {customEngineRating} ELO
                      </div>
                    </div>

                    <input
                      type="range"
                      min={400}
                      max={3000}
                      step={50}
                      value={customEngineRating}
                      onChange={(e) => setCustomEngineRating(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-[#9e9c98] font-mono">
                      <span>400 (Beginner)</span>
                      <span>1500 (Club)</span>
                      <span>3000 (Grandmaster)</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      {[500, 1000, 1500, 2000, 2500, 3000].map((rVal) => (
                        <button
                          key={rVal}
                          onClick={() => setCustomEngineRating(rVal)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            customEngineRating === rVal
                              ? 'bg-amber-500 text-black'
                              : 'bg-[#24221f] text-[#9e9c98] hover:text-white'
                          }`}
                        >
                          {rVal}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. ROOM */}
            {playTab === 'room' && (
              <div key="room" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                <div className="p-3.5 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent rounded-xl border border-cyan-500/30 text-xs text-[#9e9c98] flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center flex-shrink-0 text-cyan-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Private Multiplayer Room</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                        Custom Lobby
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9e9c98] mt-0.5">
                      Create a private match and share the code, or enter a 5-letter room code created by a friend.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-[#1b1a17] rounded-xl border border-[#3c3934]">
                  <button
                    onClick={() => setOnlineTab('create')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      onlineTab === 'create'
                        ? 'bg-[#2b2926] text-white shadow border border-[#3c3934]'
                        : 'text-[#9e9c98] hover:text-white'
                    }`}
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setOnlineTab('join')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      onlineTab === 'join'
                        ? 'bg-[#2b2926] text-white shadow border border-[#3c3934]'
                        : 'text-[#9e9c98] hover:text-white'
                    }`}
                  >
                    Join Room
                  </button>
                </div>

                {onlineTab === 'join' ? (
                  <div className="space-y-3 pt-1">
                    <label className="text-xs font-bold text-[#9e9c98] uppercase tracking-wider block">
                      Enter 5-Letter Room Code
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="e.g. 7X9AB"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#1b1a17] border border-[#3c3934] focus:border-cyan-400 rounded-xl px-4 py-3 text-center font-mono text-xl font-extrabold tracking-widest uppercase outline-none text-white transition-colors"
                    />
                    <p className="text-[11px] text-[#666461] text-center">
                      The room rules, board variant, and time controls are already configured by the host.
                    </p>
                    {onlineError && (
                      <p className="text-xs text-red-400 text-center font-medium">{onlineError}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#9e9c98] leading-relaxed">
                    Select your game variant, grid dimension, and timer below. Once created, send the 5-letter code to your friends!
                  </p>
                )}
              </div>
            )}

            {/* 4. OFFLINE MODE */}
            {playTab === 'local' && (
              <div key="local" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                <div className="p-3.5 bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent rounded-xl border border-purple-500/30 text-xs text-[#9e9c98] flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center flex-shrink-0 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Pass & Play (Local Device)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                        Same Screen
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9e9c98] mt-0.5">
                      Play couch multiplayer locally with friends on this screen. Supports 2-Player Duel or 4-Player Quad.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SHARED GAME VARIANT & TIME CONTROLS (Hidden when Joining Room) ── */}
            {!(playTab === 'room' && onlineTab === 'join') && (
              <div className="space-y-4 pt-2 border-t border-[#3c3934]/60">
                {/* Game Variant Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#9e9c98] uppercase tracking-wider block">
                      Game Variant
                    </label>
                    <span className="text-[11px] font-mono text-[#81b64c] font-semibold">
                      {selectedMode === MODES.CLASSIC ? 'Quoridor Standard' : selectedMode === MODES.RACE ? 'Sprint Race' : 'Center Goal (4P)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {modeOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedMode(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selectedMode === opt.id
                            ? 'bg-[#81b64c]/20 border-[#81b64c] text-white shadow-md ring-1 ring-[#81b64c]/30'
                            : 'bg-[#1b1a17] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#504c45]'
                        }`}
                      >
                        <div className="text-xl mb-1">{opt.icon}</div>
                        <div>
                          <div className="font-bold text-xs text-white leading-tight">{opt.name}</div>
                          <div className="text-[10px] opacity-70 mt-0.5 truncate">{opt.tag}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quad Mode Grid Size Dropdown / Selector */}
                {selectedMode === MODES.QUAD && (
                  <div className="p-3 bg-[#1b1a17] rounded-xl border border-amber-500/30 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>👑 Quad Board Grid Size</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#9e9c98]">Select arena dimension</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { size: 9, label: '9×9 Standard', desc: 'Fast & Classic' },
                        { size: 11, label: '11×11 Large', desc: 'Spacious for 4P', recommended: true },
                        { size: 13, label: '13×13 Epic', desc: 'Deep Strategy' },
                      ].map((g) => (
                        <button
                          key={g.size}
                          type="button"
                          onClick={() => setQuadGridSize(g.size)}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer relative ${
                            quadGridSize === g.size
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                              : 'bg-[#24221f] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#555]'
                          }`}
                        >
                          {g.recommended && (
                            <span className="absolute -top-1.5 -right-1 bg-amber-500 text-black text-[8px] font-extrabold px-1 rounded-full uppercase">
                              Best
                            </span>
                          )}
                          <div className="font-extrabold text-xs font-mono">{g.label}</div>
                          <div className="text-[9px] opacity-75">{g.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Control Options (Available for ALL Modes) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#9e9c98] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Time Control</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#81b64c] font-semibold">
                      {TIME_CONTROLS[timeControlKey]?.label || '3 min'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Object.entries(TIME_CONTROLS).map(([key, tc]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTimeControlKey(key)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          timeControlKey === key
                            ? 'bg-[#81b64c]/20 border-[#81b64c] text-white shadow-sm ring-1 ring-[#81b64c]/30'
                            : 'bg-[#1b1a17] border-[#3c3934] text-[#9e9c98] hover:text-white hover:border-[#504c45]'
                        }`}
                      >
                        <div className="font-bold text-xs">{tc.label}</div>
                        <div className="text-[10px] opacity-70">
                          {tc.time > 0 ? `${tc.time / 60}m +${tc.increment}s` : 'No clock'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Primary Start Action Button */}
        <button
          onClick={handleStartPlay}
          disabled={onlineConnecting}
          className="w-full py-4 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] active:scale-[0.99] text-black font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl hover:shadow-[#81b64c]/20 transition-all cursor-pointer disabled:opacity-50 mt-1"
        >
          {onlineConnecting ? (
            <span>Connecting to Server...</span>
          ) : playTab === 'online' ? (
            <>
              <Zap className="w-5 h-5 fill-black" />
              <span>FIND MATCH (PLAY ONLINE)</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          ) : playTab === 'bot' ? (
            <>
              <Swords className="w-5 h-5" />
              <span>
                PLAY {selectedBot.isCustom ? `ENGINE (${customEngineRating})` : selectedBot.name.toUpperCase()}
              </span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          ) : playTab === 'room' ? (
            <>
              <Wifi className="w-5 h-5" />
              <span>{onlineTab === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              <span>START OFFLINE MODE</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          )}
        </button>
      </div>

      {/* ────────────────────────────────────────────────────
          BOTTOM SECTION: Global Leaderboard & Top 3 Podium Box
         ──────────────────────────────────────────────────── */}
      <div
        onClick={() => setShowLeaderboardModal(true)}
        title="Click to view Top 100 global player rankings"
        className="group w-full p-5 sm:p-6 rounded-2xl bg-[#21201d] border border-[#3c3934] hover:border-[#81b64c] transition-all cursor-pointer shadow-2xl relative overflow-hidden flex flex-col gap-4"
      >
        {/* Box Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-900 shadow-md flex-shrink-0">
              <Trophy className="w-4 h-4 fill-slate-900" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>Global Leaderboard</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2b2926] text-amber-400 border border-[#3c3934] font-bold">
                  Top 3 Podium
                </span>
              </h3>
              <p className="text-[11px] text-[#9e9c98]">Rankings based on Play Online competitive Elo</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#81b64c] font-bold group-hover:translate-x-0.5 transition-transform">
            <span className="hidden sm:inline">View Top 100</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Top 3 Podium Visualization */}
        <div className="pt-2 pb-1 flex items-end justify-center gap-2 sm:gap-4 px-2">
          {/* 2nd Place: Silver (Left) */}
          {top3[1] && (
            <div className="flex-1 max-w-[130px] flex flex-col items-center group/p2">
              <div className="relative mb-2 flex flex-col items-center">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 p-0.5 shadow-lg shadow-slate-500/20">
                  <div className="w-full h-full rounded-full bg-[#1b1a17] flex items-center justify-center text-xl">
                    {top3[1].avatar}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">{top3[1].country}</span>
                <div className="absolute -top-2 bg-slate-300 text-slate-950 text-[10px] font-black px-1.5 rounded-full shadow font-mono">
                  2
                </div>
              </div>

              <div className="text-center w-full mb-1">
                <div className="text-xs font-bold text-white truncate px-1">{top3[1].name}</div>
                <div className="text-[11px] font-mono font-extrabold text-slate-300">{top3[1].rating}</div>
              </div>

              {/* Pedestal Base */}
              <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-slate-700/50 via-slate-600/30 to-slate-400/30 border-t-2 border-slate-300 rounded-t-xl flex flex-col items-center justify-center shadow-inner group-hover/p2:brightness-110 transition-all">
                <span className="text-2xl sm:text-3xl font-black text-slate-300/80 drop-shadow">🥈</span>
                <span className="text-[10px] font-mono font-bold text-slate-400 mt-1">2ND</span>
              </div>
            </div>
          )}

          {/* 1st Place: Gold (Center, Elevated) */}
          {top3[0] && (
            <div className="flex-1 max-w-[145px] flex flex-col items-center z-10 group/p1">
              <div className="relative mb-2 flex flex-col items-center">
                <div className="text-sm -mb-1 animate-bounce-short">👑</div>
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/30 ring-2 ring-amber-400/50">
                  <div className="w-full h-full rounded-full bg-[#1b1a17] flex items-center justify-center text-2xl">
                    {top3[0].avatar}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">{top3[0].country}</span>
                <div className="absolute top-3 -left-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black px-1.5 rounded-full shadow font-mono">
                  1
                </div>
              </div>

              <div className="text-center w-full mb-1">
                <div className="text-xs sm:text-sm font-extrabold text-white truncate px-1 flex items-center justify-center gap-1">
                  <span>{top3[0].name}</span>
                </div>
                <div className="text-xs font-mono font-black text-amber-400">{top3[0].rating}</div>
              </div>

              {/* Pedestal Base */}
              <div className="w-full h-28 sm:h-32 bg-gradient-to-t from-amber-600/50 via-amber-500/30 to-amber-400/40 border-t-2 border-amber-400 rounded-t-xl flex flex-col items-center justify-center shadow-inner group-hover/p1:brightness-110 transition-all">
                <span className="text-3xl sm:text-4xl font-black text-amber-300 drop-shadow">🥇</span>
                <span className="text-[10px] font-mono font-bold text-amber-300 mt-1">CHAMPION</span>
              </div>
            </div>
          )}

          {/* 3rd Place: Bronze (Right) */}
          {top3[2] && (
            <div className="flex-1 max-w-[130px] flex flex-col items-center group/p3">
              <div className="relative mb-2 flex flex-col items-center">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 p-0.5 shadow-lg shadow-amber-800/20">
                  <div className="w-full h-full rounded-full bg-[#1b1a17] flex items-center justify-center text-xl">
                    {top3[2].avatar}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">{top3[2].country}</span>
                <div className="absolute -top-2 bg-amber-700 text-white text-[10px] font-black px-1.5 rounded-full shadow font-mono">
                  3
                </div>
              </div>

              <div className="text-center w-full mb-1">
                <div className="text-xs font-bold text-white truncate px-1">{top3[2].name}</div>
                <div className="text-[11px] font-mono font-extrabold text-amber-500">{top3[2].rating}</div>
              </div>

              {/* Pedestal Base */}
              <div className="w-full h-16 sm:h-18 bg-gradient-to-t from-amber-900/50 via-amber-800/30 to-amber-700/30 border-t-2 border-amber-700 rounded-t-xl flex flex-col items-center justify-center shadow-inner group-hover/p3:brightness-110 transition-all">
                <span className="text-2xl sm:text-3xl font-black text-amber-500 drop-shadow">🥉</span>
                <span className="text-[10px] font-mono font-bold text-amber-500 mt-1">3RD</span>
              </div>
            </div>
          )}
        </div>

        {/* Click Callout Footer Bar */}
        <div className="pt-2 border-t border-[#3c3934]/60 flex items-center justify-between text-xs text-[#9e9c98] font-mono">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tap to inspect top 100 ranked competitors & standing</span>
          </span>
          <span className="text-[#81b64c] font-bold group-hover:underline flex items-center gap-1 text-[11px]">
            View All 100 ➔
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────
          TOP 100 LEADERBOARD MODAL
         ──────────────────────────────────────────────────── */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        userProfile={userProfile}
      />
    </div>
  );
}
