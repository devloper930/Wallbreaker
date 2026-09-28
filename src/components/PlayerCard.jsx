import React from 'react';
import { Shield, Clock, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Bot, User } from 'lucide-react';
import { PLAYER_CONFIGS } from '../logic/gameEngine';
import { getPlayerStyle } from '../logic/pieceThemes';
import ReactionBox from './ReactionBox';

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayerCard({
  player,
  playerIndex,
  isActive,
  timer,
  hasTimer,
  isBot = false,
  isSelf = false,
  compact = false,
  rating: propRating = 400,
  avatar: propAvatar = null,
  showWallButtons = false,
  activeWallOrientation = 'h',
  onSelectWallOrientation,
  onDragStartWall,
  pieceTheme = 'gem',
  isMyTurn = true,
  onSendReaction,
  showReactions = true,
}) {
  if (!player) return null;

  const rating = (propRating && propRating !== 400) ? propRating : (player?.rating || propRating || 400);
  const avatar = propAvatar || player?.avatar || null;

  const config = PLAYER_CONFIGS[playerIndex] || PLAYER_CONFIGS[0];
  const playerStyle = getPlayerStyle(playerIndex, pieceTheme);
  const isFrozen = player?.isResigned || player?.isFrozen;
  const isLowTime = hasTimer && timer > 0 && timer < 30 && !isFrozen;

  // Arrow for goal
  const renderGoalArrow = () => {
    switch (player?.targetEdge) {
      case 'top':
        return <ArrowUp className="w-3.5 h-3.5 text-emerald-400" title="Goal: Top Edge" />;
      case 'bottom':
        return <ArrowDown className="w-3.5 h-3.5 text-emerald-400" title="Goal: Bottom Edge" />;
      case 'right':
        return <ArrowRight className="w-3.5 h-3.5 text-emerald-400" title="Goal: Right Edge" />;
      case 'left':
        return <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" title="Goal: Left Edge" />;
      case 'center':
        return <span className="text-amber-400 font-bold text-[10px] flex items-center gap-0.5" title="Goal: Center of Board">👑 Center</span>;
      default:
        return null;
    }
  };

  // Wall slots (visual representation of remaining walls)
  const wallsCount = player?.wallsLeft ?? 0;
  const totalMaxWalls = wallsCount > 5 ? 10 : 5;
  const wallSlots = Array.from({ length: totalMaxWalls }, (_, i) => i < wallsCount);

  const handleWallDragStart = (e, orientation) => {
    if (isFrozen) return;
    e.dataTransfer.setData('text/plain', orientation);
    e.dataTransfer.effectAllowed = 'copyMove';
    window.__draggedWallOrientation = orientation;
    if (onDragStartWall) onDragStartWall(orientation);
    if (onSelectWallOrientation) onSelectWallOrientation(orientation);
  };

  const handleWallDragEnd = () => {
    window.__draggedWallOrientation = null;
  };

  return (
    <div
      className={`rounded-xl transition-all duration-200 select-none ${
        isFrozen
          ? 'bg-[#1a2126] border border-cyan-800/60 opacity-65'
          : isActive
          ? 'bg-[#272522] border-2 shadow-lg'
          : 'bg-[#21201d] border border-[#3c3934]'
      } ${compact ? 'p-2' : 'p-3'}`}
      style={{
        borderColor: !isFrozen && isActive ? playerStyle.color : undefined,
        boxShadow: !isFrozen && isActive ? `0 0 16px ${playerStyle.wallGlow}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar & Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            {/* Pawn avatar circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-black shadow-md border-2 text-xl ${
                isFrozen ? 'border-cyan-400/80' : ''
              }`}
              style={{
                background: playerStyle.gradient,
                borderColor: isFrozen ? '#38bdf8' : isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
              }}
            >
              {avatar ? (
                <span>{avatar}</span>
              ) : playerStyle.icon ? (
                <span className="text-white drop-shadow">{playerStyle.icon}</span>
              ) : isBot ? (
                <Bot className="w-5 h-5 text-gray-900" />
              ) : (
                <User className="w-5 h-5 text-gray-900" />
              )}
            </div>

            {/* Frozen indicator badge or active turn indicator dot */}
            {isFrozen ? (
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-cyan-950 border border-cyan-400 rounded-full px-1 shadow">
                ❄️
              </span>
            ) : isActive && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#21201d] animate-pulse"
                style={{ backgroundColor: playerStyle.color }}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {player?.name || 'Player'}
              </span>
              {player?.country && (
                <span className="text-xs" title={`Country: ${player.country}`}>{player.country}</span>
              )}
              {player?.title && !isBot && !isFrozen && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50">
                  {player.title}
                </span>
              )}
              {isFrozen && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  FROZEN
                </span>
              )}
              {isSelf && !isFrozen && (
                <span
                  className="text-[9px] font-semibold px-1 rounded uppercase"
                  style={{ backgroundColor: '#3c3934', color: playerStyle.color }}
                >
                  YOU
                </span>
              )}
              {isBot && !isFrozen && (
                <span className="text-[9px] font-semibold bg-[#3c3934] text-[#38bdf8] px-1 rounded uppercase">
                  BOT
                </span>
              )}
              <span className="text-[10px] text-[#666461] font-mono">({rating})</span>
            </div>

            {/* Wall count & Goal indicator */}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#9e9c98]">
              {/* Wall slots visual */}
              <div className="flex items-center gap-0.5" title={`${wallsCount} walls left`}>
                <span
                  className="text-[11px] font-mono font-semibold mr-1 flex items-center gap-0.5"
                  style={{ color: playerStyle.color }}
                >
                  <Shield className="w-3 h-3" />
                  {wallsCount}
                </span>
                <div className="hidden sm:flex items-center gap-0.5">
                  {wallSlots.map((hasWall, idx) => (
                    <div
                      key={idx}
                      className="w-1 h-3 rounded-[1px] transition-colors"
                      style={{
                        backgroundColor: hasWall ? playerStyle.color : '#3c3934',
                        boxShadow: hasWall ? `0 0 3px ${playerStyle.wallGlow}` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] bg-[#2b2926] px-1.5 py-0.5 rounded border border-[#3c3934]/60">
                <span className="text-[#9e9c98] text-[10px]">GOAL:</span>
                {renderGoalArrow()}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Two Sleek Circular Wall Buttons (Horizontal & Vertical) */}
        {showWallButtons && wallsCount > 0 && (
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-2xl bg-[#1b1a17]/90 border border-[#3c3934] shadow-inner transition-all duration-150 ${
              isActive && isMyTurn ? 'opacity-100 ring-1 ring-white/10' : 'opacity-40 pointer-events-none'
            }`}
          >
            <span className="hidden md:inline text-[9px] font-mono text-[#9e9c98] uppercase font-bold tracking-tight">
              Walls:
            </span>

            {/* Circular Button 1: Horizontal Wall [ ── ] */}
            <div
              draggable={isActive && isMyTurn}
              onDragStart={(e) => handleWallDragStart(e, 'h')}
              onDragEnd={handleWallDragEnd}
              onClick={() => onSelectWallOrientation && onSelectWallOrientation('h')}
              title="Horizontal Wall [ ── ] (Click & Drag onto board, or tap to place)"
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all select-none ${
                activeWallOrientation === 'h' && isActive
                  ? 'scale-105 shadow-md'
                  : 'hover:scale-105 hover:border-white/40'
              }`}
              style={{
                backgroundColor: activeWallOrientation === 'h' ? '#2b2926' : '#21201d',
                border: `2px solid ${activeWallOrientation === 'h' && isActive ? playerStyle.color : '#3c3934'}`,
                boxShadow: activeWallOrientation === 'h' && isActive ? `0 0 12px ${playerStyle.wallGlow}` : undefined,
              }}
            >
              {/* Horizontal Wall Bar Icon */}
              <div
                className="w-5 sm:w-6 h-1.5 rounded-[2px] shadow-sm transition-transform pointer-events-none"
                style={{
                  backgroundImage: playerStyle.wallGradientH,
                  border: `1px solid ${playerStyle.wallBorder}`,
                }}
              />
              <span className="text-[8px] font-mono font-bold text-white/90 leading-none mt-0.5 pointer-events-none">
                ──
              </span>
            </div>

            {/* Circular Button 2: Vertical Wall [ │ ] */}
            <div
              draggable={isActive && isMyTurn}
              onDragStart={(e) => handleWallDragStart(e, 'v')}
              onDragEnd={handleWallDragEnd}
              onClick={() => onSelectWallOrientation && onSelectWallOrientation('v')}
              title="Vertical Wall [ │ ] (Click & Drag onto board, or tap to place)"
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all select-none ${
                activeWallOrientation === 'v' && isActive
                  ? 'scale-105 shadow-md'
                  : 'hover:scale-105 hover:border-white/40'
              }`}
              style={{
                backgroundColor: activeWallOrientation === 'v' ? '#2b2926' : '#21201d',
                border: `2px solid ${activeWallOrientation === 'v' && isActive ? playerStyle.color : '#3c3934'}`,
                boxShadow: activeWallOrientation === 'v' && isActive ? `0 0 12px ${playerStyle.wallGlow}` : undefined,
              }}
            >
              {/* Vertical Wall Bar Icon */}
              <div
                className="w-1.5 h-4 sm:h-5 rounded-[2px] shadow-sm transition-transform pointer-events-none"
                style={{
                  backgroundImage: playerStyle.wallGradientV,
                  border: `1px solid ${playerStyle.wallBorder}`,
                }}
              />
              <span className="text-[8px] font-mono font-bold text-white/90 leading-none mt-0.5 pointer-events-none">
                │
              </span>
            </div>
          </div>
        )}

        {/* Reaction Box in between (walls) and (time) */}
        {showReactions && onSendReaction && (
          <div className="flex-shrink-0">
            <ReactionBox onSendReaction={onSendReaction} />
          </div>
        )}

        {/* Right: Digital Chess Clock */}
        {hasTimer && (
          <div
            className={`flex-shrink-0 px-3 py-1.5 rounded-md font-mono font-bold text-base md:text-lg flex items-center gap-1.5 transition-all ${
              isActive
                ? isLowTime
                  ? 'bg-red-950/80 text-red-400 border border-red-500 animate-pulse'
                  : 'bg-[#2b2926] text-white border border-[#81b64c]'
                : 'bg-[#1b1a17] text-[#9e9c98] border border-[#3c3934]'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-[#81b64c]' : 'text-[#666461]'}`} />
            <span>{formatTime(timer)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
