import React, { useState } from 'react';
import {
  MODES,
  TIME_CONTROLS,
} from '../logic/gameEngine';
import {
  Users,
  Bot,
  Wifi,
  Trophy,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  Gamepad2,
  Copy,
  Check,
} from 'lucide-react';

export default function LobbyModal({
  isOpen,
  onStartGame,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onlineConnecting = false,
  error = null,
}) {
  const [selectedMode, setSelectedMode] = useState(MODES.CLASSIC);
  const [gameType, setGameType] = useState('bot'); // 'bot' | 'local' | 'online'
  const [botDifficulty, setBotDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [timeControlKey, setTimeControlKey] = useState('BLITZ_3');
  const [playerName, setPlayerName] = useState('Grandmaster');
  const [joinCode, setJoinCode] = useState('');
  const [onlineTab, setOnlineTab] = useState('create'); // 'create' | 'join'

  if (!isOpen) return null;

  const handleStart = () => {
    if (gameType === 'online') {
      if (onlineTab === 'create') {
        onCreateOnlineRoom({
          mode: selectedMode,
          timeControlKey,
          playerName: playerName.trim() || 'Player 1',
        });
      } else {
        if (!joinCode.trim()) return;
        onJoinOnlineRoom({
          roomCode: joinCode.trim(),
          playerName: playerName.trim() || 'Player 2',
        });
      }
    } else {
      onStartGame({
        mode: selectedMode,
        gameType,
        botDifficulty,
        timeControlKey,
        playerName: playerName.trim() || 'Player 1',
      });
    }
  };

  const modeCards = [
    {
      id: MODES.CLASSIC,
      title: 'Classic Barricade',
      players: '2 Players',
      walls: '10 Walls each',
      desc: 'Opposite edges. Traditional Quoridor barricade and traversal.',
      icon: '🏆',
      badge: 'POPULAR',
    },
    {
      id: MODES.RACE,
      title: 'Race Mode',
      players: '2 Players',
      walls: '10 Walls each',
      desc: 'Both start side-by-side. First to touch the far edge wins.',
      icon: '⚡',
      badge: 'FAST PACED',
    },
    {
      id: MODES.QUAD,
      title: 'Quad Compete',
      players: '4 Players',
      walls: '5 Walls each',
      desc: 'North, South, East, and West start. 4-way clockwise clash.',
      icon: '👑',
      badge: 'CHAOS 4P',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#272522] via-[#21201d] to-[#272522] border-b border-[#3c3934] text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#81b64c] to-[#537a2e] shadow-lg mb-2">
            <span className="text-2xl">🧱</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
            WALLBREAKER
          </h2>
          <p className="text-xs text-[#9e9c98] mt-0.5">
            Quoridor Strategy • Chess.com Style Experience
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. Select Game Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#9e9c98] block">
              1. Select Game Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {modeCards.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    selectedMode === m.id
                      ? 'bg-[#2b2926] border-[#81b64c] shadow-md shadow-[#81b64c]/10 ring-1 ring-[#81b64c]'
                      : 'bg-[#272522] border-[#3c3934] hover:border-[#504c45]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#3c3934] text-[#81b64c]">
                      {m.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight">{m.title}</h4>
                  <div className="text-[10px] text-[#81b64c] font-medium mt-0.5">{m.players} • {m.walls}</div>
                  <p className="text-[10px] text-[#9e9c98] mt-1 leading-snug">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Select Play Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#9e9c98] block">
              2. Play Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setGameType('bot')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameType === 'bot'
                    ? 'bg-[#2b2926] border-[#81b64c] text-white shadow-sm'
                    : 'bg-[#272522] border-[#3c3934] text-[#9e9c98] hover:text-white'
                }`}
              >
                <Bot className="w-5 h-5 text-[#81b64c]" />
                <span className="text-xs font-bold">vs AI Bot</span>
              </button>

              <button
                onClick={() => setGameType('local')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameType === 'local'
                    ? 'bg-[#2b2926] border-[#38bdf8] text-white shadow-sm'
                    : 'bg-[#272522] border-[#3c3934] text-[#9e9c98] hover:text-white'
                }`}
              >
                <Users className="w-5 h-5 text-[#38bdf8]" />
                <span className="text-xs font-bold">Pass & Play</span>
              </button>

              <button
                onClick={() => setGameType('online')}
                className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  gameType === 'online'
                    ? 'bg-[#2b2926] border-emerald-400 text-white shadow-sm'
                    : 'bg-[#272522] border-[#3c3934] text-[#9e9c98] hover:text-white'
                }`}
              >
                <Wifi className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">Online Live</span>
              </button>
            </div>
          </div>

          {/* Conditional Options: Bot Difficulty OR Online Room */}
          {gameType === 'bot' && (
            <div className="p-3 bg-[#272522] rounded-xl border border-[#3c3934] space-y-2">
              <span className="text-[11px] font-bold uppercase text-[#9e9c98] block">
                Bot Difficulty
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'easy', label: 'Casual (Easy)', color: 'text-emerald-400' },
                  { id: 'medium', label: 'Tactical (Med)', color: 'text-amber-400' },
                  { id: 'hard', label: 'Master (Hard)', color: 'text-rose-400' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setBotDifficulty(d.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      botDifficulty === d.id
                        ? 'bg-[#3c3934] border-white text-white shadow'
                        : 'bg-[#21201d] border-[#3c3934] text-[#9e9c98] hover:text-white'
                    }`}
                  >
                    <span className={d.color}>● </span>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameType === 'online' && (
            <div className="p-3 bg-[#272522] rounded-xl border border-[#3c3934] space-y-3">
              <div className="flex border-b border-[#3c3934] pb-2 gap-4 text-xs font-bold">
                <button
                  onClick={() => setOnlineTab('create')}
                  className={`pb-1 transition-colors ${
                    onlineTab === 'create'
                      ? 'text-[#81b64c] border-b-2 border-[#81b64c]'
                      : 'text-[#9e9c98]'
                  }`}
                >
                  Create New Room
                </button>
                <button
                  onClick={() => setOnlineTab('join')}
                  className={`pb-1 transition-colors ${
                    onlineTab === 'join'
                      ? 'text-[#81b64c] border-b-2 border-[#81b64c]'
                      : 'text-[#9e9c98]'
                  }`}
                >
                  Join via Room Code
                </button>
              </div>

              {onlineTab === 'join' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#9e9c98] block">Enter 5-character Code:</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X9K2"
                    className="w-full px-3 py-2 bg-[#161512] border border-[#3c3934] rounded-lg text-white font-mono text-sm tracking-widest uppercase focus:outline-none focus:border-[#81b64c]"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-[#9e9c98]">
                  A unique room code will be generated. You can share it with your friend to play in real-time.
                </p>
              )}
            </div>
          )}

          {/* 3. Time Control & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Time Control */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#9e9c98] block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#81b64c]" /> Time Control
              </label>
              <select
                value={timeControlKey}
                onChange={(e) => setTimeControlKey(e.target.value)}
                className="w-full px-3 py-2 bg-[#272522] border border-[#3c3934] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#81b64c]"
              >
                {Object.entries(TIME_CONTROLS).map(([key, tc]) => (
                  <option key={key} value={key}>
                    {tc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Player Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#9e9c98] block">
                Your Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Grandmaster"
                maxLength={16}
                className="w-full px-3 py-2 bg-[#272522] border border-[#3c3934] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#81b64c]"
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-300 text-center font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Start Action */}
          <button
            onClick={handleStart}
            disabled={onlineConnecting}
            className="w-full py-3.5 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {onlineConnecting ? (
              <span>Connecting to Room...</span>
            ) : (
              <>
                <Gamepad2 className="w-4 h-4" />
                <span>
                  {gameType === 'online'
                    ? onlineTab === 'create'
                      ? 'Create Room & Play'
                      : 'Join Room'
                    : 'Start Game'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
