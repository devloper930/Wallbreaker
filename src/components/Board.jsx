import React, { useState, useEffect, useRef } from 'react';
import {
  MODES,
  getLegalPawnMoves,
  isLegalWallPlacement,
  isPlayerAtTargetEdge,
} from '../logic/gameEngine';
import { getPlayerStyle } from '../logic/pieceThemes';
import { soundManager } from '../utils/audio';
import ReactionOverlay from './ReactionOverlay';

export default function Board({
  gameState,
  onMakeMove,
  isMyTurn = true,
  theme = 'classic',
  pieceTheme = 'gem',
  flipped = false,
  wallOrientation = 'h',
  onToggleOrientation,
  placementMode = 'auto', // 'auto' | 'pawn' | 'wall'
  reactions = [],
  showCoords = true,
  showReactions = true,
}) {
  const [selectedPawn, setSelectedPawn] = useState(false);
  const [hoveredWall, setHoveredWall] = useState(null); // { r, c, orientation, isValid, reason }
  const [touchGhost, setTouchGhost] = useState(null); // { x, y, orientation } for mobile drag
  const boardRef = useRef(null);

  const currentPlayerIdx = gameState.turn;
  const currentPlayer = gameState.players[currentPlayerIdx];
  const walls = gameState.walls;

  // Compute legal pawn moves for current player
  const legalPawnMoves = isMyTurn ? getLegalPawnMoves(currentPlayerIdx, gameState) : [];

  // When turn changes, automatically select current player's pawn for quick moves
  useEffect(() => {
    if (isMyTurn && gameState.status === 'playing') {
      setSelectedPawn(true);
    } else {
      setSelectedPawn(false);
    }
    setHoveredWall(null);
  }, [currentPlayerIdx, isMyTurn, gameState.status]);

  // Handle cell click (pawn movement)
  const handleCellClick = (r, c) => {
    if (!isMyTurn || gameState.status !== 'playing') return;

    // Check if clicking own pawn (toggle selection)
    if (r === currentPlayer.r && c === currentPlayer.c) {
      setSelectedPawn(!selectedPawn);
      return;
    }

    // Check if clicking a legal move cell
    const targetMove = legalPawnMoves.find(m => m.r === r && m.c === c);
    if (targetMove) {
      soundManager.playMove();
      onMakeMove({ type: 'pawn', to: { r, c } });
      setSelectedPawn(false);
    } else {
      // If clicking elsewhere, deselect
      setSelectedPawn(false);
    }
  };

  // Check wall legality on hover
  const handleWallHover = (r, c, overrideOrientation = null, isDirectBoardTouch = false) => {
    // On mobile devices, direct groove hover is disabled; only drag-and-drop shows preview
    if (isDirectBoardTouch && (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches))) {
      return;
    }
    if (!isMyTurn || gameState.status !== 'playing' || currentPlayer.wallsLeft <= 0) {
      setHoveredWall(null);
      return;
    }

    const orientation = overrideOrientation || wallOrientation;
    const validation = isLegalWallPlacement(r, c, orientation, currentPlayerIdx, gameState);
    setHoveredWall({
      r,
      c,
      orientation,
      isValid: validation.valid,
      reason: validation.reason,
    });
  };

  // Place wall
  const handleWallClick = (r, c, overrideOrientation = null, isDirectBoardTouch = false) => {
    // On mobile screens, direct board touch/tap to create walls is disabled.
    // The player drags and drops walls from their player card dock onto the board.
    if (isDirectBoardTouch && (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches))) {
      return;
    }
    if (!isMyTurn || gameState.status !== 'playing') return;
    if (currentPlayer.wallsLeft <= 0) {
      soundManager.playIllegal();
      return;
    }

    const orientation = overrideOrientation || wallOrientation;
    const validation = isLegalWallPlacement(r, c, orientation, currentPlayerIdx, gameState);
    if (validation.valid) {
      soundManager.playWall();
      onMakeMove({ type: 'wall', r, c, orientation });
      setHoveredWall(null);
    } else {
      soundManager.playIllegal();
      setHoveredWall({
        r,
        c,
        orientation,
        isValid: false,
        reason: validation.reason,
      });
    }
  };

  const boardSize = gameState.boardSize || 9;
  const maxWallIndex = boardSize - 2;
  const centerCoord = Math.floor(boardSize / 2);

  // Coordinate mapping for wall placements (Unified across Flipped and Normal Perspectives)
  // Visual groove index (0 to maxWallIndex) -> Real Board Wall Coordinate (r, c)
  const getBoardWallCoords = (visualR, visualC) => {
    const vR = Math.max(0, Math.min(maxWallIndex, visualR));
    const vC = Math.max(0, Math.min(maxWallIndex, visualC));
    return {
      r: flipped ? (maxWallIndex - vR) : vR,
      c: flipped ? (maxWallIndex - vC) : vC,
    };
  };

  // Real Board Wall Coordinate (r, c) -> Visual groove index (0 to maxWallIndex)
  const getVisualWallCoords = (boardR, boardC) => {
    return {
      visualR: flipped ? (maxWallIndex - boardR) : boardR,
      visualC: flipped ? (maxWallIndex - boardC) : boardC,
    };
  };

  // Calculate nearest wall coordinate (r, c) from client pointer/touch coordinates
  const getCoordinatesFromEvent = (e, orientation = null) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX === null || clientY === null) return null;

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    if (relX < -0.05 || relX > 1.05 || relY < -0.05 || relY > 1.05) return null;

    const cFloat = relX * boardSize - 1;
    const rFloat = relY * boardSize - 1;
    let visualC = Math.round(cFloat);
    let visualR = Math.round(rFloat);
    visualC = Math.max(0, Math.min(maxWallIndex, visualC));
    visualR = Math.max(0, Math.min(maxWallIndex, visualR));

    // Distance to nearest groove line
    const distToHorizGroove = Math.abs(rFloat - visualR);
    const distToVertGroove = Math.abs(cFloat - visualC);

    const currentOri = orientation || wallOrientation;
    const isTouch = Boolean(e.touches && e.touches.length > 0) || window.__draggedWallOrientation !== null;
    const threshold = isTouch ? 0.44 : 0.35;
    const isBetweenCells = currentOri === 'h'
      ? distToHorizGroove <= threshold
      : distToVertGroove <= threshold;

    if (!isBetweenCells) {
      return null;
    }

    return getBoardWallCoords(visualR, visualC);
  };

  // Mobile Touch Drag-and-Drop Global Listeners
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (!isMyTurn || gameState.status !== 'playing' || currentPlayer?.wallsLeft <= 0) return;
      const { orientation, clientX, clientY } = e.detail;
      setTouchGhost({ x: clientX, y: clientY, orientation });
      const coords = getCoordinatesFromEvent({ clientX, clientY }, orientation);
      if (coords) {
        handleWallHover(coords.r, coords.c, orientation);
      }
    };

    const handleTouchMove = (e) => {
      if (!isMyTurn || gameState.status !== 'playing' || currentPlayer?.wallsLeft <= 0) return;
      const { orientation, clientX, clientY } = e.detail;
      setTouchGhost({ x: clientX, y: clientY, orientation });
      const coords = getCoordinatesFromEvent({ clientX, clientY }, orientation);
      if (coords) {
        handleWallHover(coords.r, coords.c, orientation);
      } else {
        setHoveredWall(null);
      }
    };

    const handleTouchEnd = (e) => {
      setTouchGhost(null);
      if (!isMyTurn || gameState.status !== 'playing' || currentPlayer?.wallsLeft <= 0) return;
      const { orientation, clientX, clientY } = e.detail;
      const coords = getCoordinatesFromEvent({ clientX, clientY }, orientation);
      if (coords) {
        handleWallClick(coords.r, coords.c, orientation);
      }
      setHoveredWall(null);
    };

    window.addEventListener('boardWallTouchStart', handleTouchStart);
    window.addEventListener('boardWallTouchMove', handleTouchMove);
    window.addEventListener('boardWallTouchEnd', handleTouchEnd);
    return () => {
      window.removeEventListener('boardWallTouchStart', handleTouchStart);
      window.removeEventListener('boardWallTouchMove', handleTouchMove);
      window.removeEventListener('boardWallTouchEnd', handleTouchEnd);
    };
  }, [isMyTurn, gameState.status, currentPlayer?.wallsLeft, wallOrientation, flipped]);

  const handleBoardDragOver = (e) => {
    e.preventDefault();
    if (!isMyTurn || gameState.status !== 'playing' || currentPlayer.wallsLeft <= 0) return;
    e.dataTransfer.dropEffect = 'copy';

    let draggedOrientation = window.__draggedWallOrientation;
    if (!draggedOrientation && e.dataTransfer) {
      const data = e.dataTransfer.getData('text/plain');
      if (data === 'h' || data === 'v') draggedOrientation = data;
    }
    const finalOrientation = (draggedOrientation === 'h' || draggedOrientation === 'v') ? draggedOrientation : wallOrientation;

    const coords = getCoordinatesFromEvent(e, finalOrientation);
    if (coords) {
      handleWallHover(coords.r, coords.c, finalOrientation);
    } else {
      setHoveredWall(null);
    }
  };

  const handleBoardDrop = (e) => {
    e.preventDefault();
    if (!isMyTurn || gameState.status !== 'playing' || currentPlayer.wallsLeft <= 0) return;

    let draggedOrientation = window.__draggedWallOrientation;
    if (!draggedOrientation && e.dataTransfer) {
      const data = e.dataTransfer.getData('text/plain');
      if (data === 'h' || data === 'v') draggedOrientation = data;
    }
    const finalOrientation = (draggedOrientation === 'h' || draggedOrientation === 'v') ? draggedOrientation : wallOrientation;

    const coords = getCoordinatesFromEvent(e, finalOrientation);
    if (coords) {
      handleWallClick(coords.r, coords.c, finalOrientation);
    }
    window.__draggedWallOrientation = null;
    setHoveredWall(null);
  };

  // Coordinate arrays
  const rows = flipped
    ? Array.from({ length: boardSize }, (_, i) => boardSize - 1 - i)
    : Array.from({ length: boardSize }, (_, i) => i);
  const cols = flipped
    ? Array.from({ length: boardSize }, (_, i) => boardSize - 1 - i)
    : Array.from({ length: boardSize }, (_, i) => i);

  // Helper to test if a cell is on the current player's target edge
  const isGoalCell = (r, c) => {
    return currentPlayer && isPlayerAtTargetEdge(currentPlayer, r, c, boardSize);
  };

  return (
    <div className={`relative px-0.5 sm:px-4 py-1.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#21201d] border border-[#3c3934] shadow-2xl select-none theme-${theme}`}>
      {/* Target Edge Glow Banner */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#9e9c98] px-1 pb-1 font-bold">
        <span className="font-mono text-white">
          Turn {gameState.turnCount} • <span className="text-amber-400 font-extrabold">{currentPlayer?.name || 'Player'}</span>'s move
        </span>
        {currentPlayer?.wallsLeft > 0 && isMyTurn && !currentPlayer?.isResigned && (
          <span className="text-[#81b64c] text-xs hidden sm:inline">
            Press <kbd className="px-1 py-0.5 rounded bg-[#3c3934] text-white font-mono text-[10px]">R</kbd> or click to rotate wall
          </span>
        )}
      </div>

      {/* Main Board Wrapper with Coordinate Labels */}
      <div className="relative aspect-square w-full max-w-[540px] sm:max-w-[560px] md:max-w-[580px] mx-auto">
        {/* Coordinate Labels (Controlled via Settings: showCoords) */}
        {showCoords && (
          <>
            {/* Left Ranks */}
            <div className="absolute -left-2 sm:-left-5 top-0 bottom-0 flex flex-col justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
              {rows.map(r => (
                <span key={r} className="h-6 flex items-center justify-center font-mono">
                  {boardSize - r}
                </span>
              ))}
            </div>

            {/* Right Ranks (Desktop only to maximize mobile width) */}
            <div className="hidden sm:flex absolute -right-5 top-0 bottom-0 flex-col justify-around text-xs font-bold text-[#666461] pointer-events-none">
              {rows.map(r => (
                <span key={r} className="h-6 flex items-center justify-center font-mono">
                  {boardSize - r}
                </span>
              ))}
            </div>

            {/* Bottom Files */}
            <div className="absolute -bottom-3 sm:-bottom-6 left-0 right-0 flex justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
              {cols.map(c => (
                <span key={c} className="w-6 flex items-center justify-center font-mono">
                  {String.fromCharCode(97 + c)}
                </span>
              ))}
            </div>

            {/* Top Files (Desktop only to maximize mobile width) */}
            <div className="hidden sm:flex absolute -top-6 left-0 right-0 flex justify-around text-xs font-bold text-[#666461] pointer-events-none">
              {cols.map(c => (
                <span key={c} className="w-6 flex items-center justify-center font-mono">
                  {String.fromCharCode(97 + c)}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Dynamic Interactive Grid Board */}
        <div
          ref={boardRef}
          className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden shadow-board border-2 sm:border-4 border-[#313f24] relative touch-none"
          style={{
            touchAction: 'none',
            display: 'grid',
            gridTemplateRows: `repeat(${boardSize - 1}, 1fr clamp(3.5px, 0.9vw, 8px)) 1fr`,
            gridTemplateColumns: `repeat(${boardSize - 1}, 1fr clamp(3.5px, 0.9vw, 8px)) 1fr`,
            backgroundColor: 'var(--board-bg, #455933)',
          }}
          onDragOver={handleBoardDragOver}
          onDrop={handleBoardDrop}
          onMouseLeave={() => setHoveredWall(null)}
        >
          {/* 1. Cells */}
          {rows.map((r, rIdx) =>
            cols.map((c, cIdx) => {
              const gridRow = rIdx * 2 + 1;
              const gridCol = cIdx * 2 + 1;
              const isDarkSquare = (r + c) % 2 === 1;

              // Check if cell contains a pawn
              const pawnPlayerIdx = gameState.players.findIndex(p => p.r === r && p.c === c);
              const hasPawn = pawnPlayerIdx !== -1;
              const pawnPlayer = hasPawn ? gameState.players[pawnPlayerIdx] : null;
              const isCurrentTurnPawn = hasPawn && pawnPlayerIdx === currentPlayerIdx && !pawnPlayer?.isResigned;

              // Check if cell is a legal move
              const isLegalMove = selectedPawn && legalPawnMoves.some(m => m.r === r && m.c === c);
              const legalMoveData = isLegalMove ? legalPawnMoves.find(m => m.r === r && m.c === c) : null;

              // Check if goal cell
              const isGoal = isGoalCell(r, c);
              const isCenterGoal = gameState.mode === MODES.QUAD && r === centerCoord && c === centerCoord;

              return (
                <div
                  key={`cell-${r}-${c}`}
                  style={{
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                    backgroundColor: isDarkSquare ? 'var(--cell-dark, #769656)' : 'var(--cell-light, #eeeed2)',
                  }}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoveredWall(null)}
                  onMouseMove={() => { if (hoveredWall) setHoveredWall(null); }}
                  className={`relative z-20 flex items-center justify-center cursor-pointer transition-all duration-100 touch-none ${
                    isCurrentTurnPawn ? 'z-30' : ''
                  } ${isLegalMove ? 'z-30 ring-2 ring-emerald-400/90 shadow-md' : ''} ${
                    isGoal ? 'ring-1 ring-inset ring-amber-400/40' : ''
                  }`}
                >
                  {/* Center Crown / Target in Quad Mode */}
                  {isCenterGoal && (
                    <div className="absolute inset-0 bg-amber-400/25 border-2 border-amber-400/80 rounded-sm flex items-center justify-center pointer-events-none shadow-[0_0_15px_rgba(251,191,36,0.6)] z-0">
                      <span className="text-amber-300 font-extrabold text-xs sm:text-base select-none drop-shadow animate-pulse">
                        👑
                      </span>
                    </div>
                  )}

                  {/* Goal Edge Indicator Line (Classic / Race) */}
                  {isGoal && !isCenterGoal && (
                    <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />
                  )}

                  {/* Render Pawn */}
                  {hasPawn && (() => {
                    const pawnStyle = getPlayerStyle(pawnPlayerIdx, pieceTheme);
                    const isFrozen = pawnPlayer.isResigned || pawnPlayer.isFrozen;

                    return (
                      <div
                        className={`relative w-[80%] h-[80%] rounded-full flex items-center justify-center pawn-shadow pawn-3d-tactile pawn-settle ${
                          isFrozen
                            ? 'opacity-60 scale-95 border-2 border-cyan-400'
                            : isCurrentTurnPawn
                            ? 'scale-105 z-10'
                            : 'scale-100'
                        }`}
                        style={{
                          background: pawnStyle.gradient,
                          boxShadow: isFrozen
                            ? '0 0 10px rgba(34, 211, 238, 0.7)'
                            : isCurrentTurnPawn
                            ? `0 0 18px ${pawnStyle.wallGlow}, 0 6px 14px rgba(0, 0, 0, 0.65), inset 0 2.5px 2px rgba(255, 255, 255, 0.75), inset 0 -3px 4px rgba(0, 0, 0, 0.6)`
                            : '0 5px 10px rgba(0, 0, 0, 0.55), inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -3px 3px rgba(0, 0, 0, 0.55)',
                          border: isFrozen
                            ? '2px dashed #38bdf8'
                            : isCurrentTurnPawn
                            ? '2.5px solid #ffffff'
                            : `2px solid ${pawnStyle.ringColor || 'rgba(255, 255, 255, 0.45)'}`,
                        }}
                      >
                        {/* 3D Specular Light Overlay */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent pointer-events-none" />

                        {/* Frozen indicator badge */}
                        {isFrozen && (
                          <div className="absolute -top-1.5 -right-1.5 bg-cyan-950 border border-cyan-400 text-cyan-200 text-[10px] rounded-full px-1 shadow z-20 font-bold">
                            ❄️
                          </div>
                        )}

                        {/* Inner emblem / crest / gem core */}
                        {pawnStyle.icon ? (
                          <span className="text-white text-base sm:text-lg select-none drop-shadow pointer-events-none font-serif leading-none z-10">
                            {pawnStyle.icon}
                          </span>
                        ) : (
                          <div className="w-[46%] h-[46%] rounded-full border-2 border-white/70 bg-white/25 shadow-inner flex items-center justify-center pointer-events-none z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/95 shadow-sm" />
                          </div>
                        )}

                        {/* Active Pawn Pulsing Ring */}
                        {isCurrentTurnPawn && (
                          <div className="absolute -inset-1.5 rounded-full border-2 border-white/60 animate-ping opacity-30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })()}

                  {/* Legal Move Indicator Dot / Ring */}
                  {isLegalMove && !hasPawn && (
                    <div
                      className={legalMoveData?.isJump ? 'move-dot-jump' : 'move-dot'}
                      title={legalMoveData?.isJump ? 'Jump move' : 'Move step'}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* 2. Placed Walls (Normalized with getVisualWallCoords for all perspectives) */}
          {walls.map((wall) => {
            const { visualR, visualC } = getVisualWallCoords(wall.r, wall.c);
            const wallPlayerStyle = getPlayerStyle(wall.player, pieceTheme);

            if (wall.orientation === 'h') {
              const startRow = visualR * 2 + 2;
              const startCol = visualC * 2 + 1;

              return (
                <div
                  key={wall.id}
                  style={{
                    gridRow: `${startRow} / span 1`,
                    gridColumn: `${startCol} / span 3`,
                    backgroundColor: wallPlayerStyle.color,
                    backgroundImage: wallPlayerStyle.wallGradientH,
                    boxShadow: `0 3px 6px rgba(0, 0, 0, 0.65), 0 0 10px ${wallPlayerStyle.wallGlow}`,
                  }}
                  className="z-20 wall-3d-h wall-anim-slam pointer-events-none transition-all"
                />
              );
            } else {
              const startRow = visualR * 2 + 1;
              const startCol = visualC * 2 + 2;

              return (
                <div
                  key={wall.id}
                  style={{
                    gridRow: `${startRow} / span 3`,
                    gridColumn: `${startCol} / span 1`,
                    backgroundColor: wallPlayerStyle.color,
                    backgroundImage: wallPlayerStyle.wallGradientV,
                    boxShadow: `3px 0 6px rgba(0, 0, 0, 0.65), 0 0 10px ${wallPlayerStyle.wallGlow}`,
                  }}
                  className="z-20 wall-3d-v wall-anim-slam pointer-events-none transition-all"
                />
              );
            }
          })}

          {/* 3. Wall Hover Preview (Ghost Wall matching current player color) */}
          {hoveredWall && (
            (() => {
              const { visualR, visualC } = getVisualWallCoords(hoveredWall.r, hoveredWall.c);
              const currentPStyle = getPlayerStyle(currentPlayerIdx, pieceTheme);

              if (hoveredWall.orientation === 'h') {
                const startRow = visualR * 2 + 2;
                const startCol = visualC * 2 + 1;

                return (
                  <div
                    style={{
                      gridRow: `${startRow} / span 1`,
                      gridColumn: `${startCol} / span 3`,
                      backgroundImage: hoveredWall.isValid ? currentPStyle.wallGradientH : undefined,
                      backgroundColor: hoveredWall.isValid ? currentPStyle.color : 'rgba(239, 68, 68, 0.85)',
                      boxShadow: hoveredWall.isValid
                        ? `0 0 16px ${currentPStyle.wallGlow}`
                        : '0 0 16px rgba(239, 68, 68, 0.9)',
                    }}
                    className="z-30 wall-3d-h pointer-events-none transition-all duration-75 animate-pulse"
                  />
                );
              } else {
                const startRow = visualR * 2 + 1;
                const startCol = visualC * 2 + 2;

                return (
                  <div
                    style={{
                      gridRow: `${startRow} / span 3`,
                      gridColumn: `${startCol} / span 1`,
                      backgroundImage: hoveredWall.isValid ? currentPStyle.wallGradientV : undefined,
                      backgroundColor: hoveredWall.isValid ? currentPStyle.color : 'rgba(239, 68, 68, 0.85)',
                      boxShadow: hoveredWall.isValid
                        ? `0 0 16px ${currentPStyle.wallGlow}`
                        : '0 0 16px rgba(239, 68, 68, 0.9)',
                    }}
                    className="z-30 wall-3d-v pointer-events-none transition-all duration-75 animate-pulse"
                  />
                );
              }
            })()
          )}

          {/* 4a. Interactive Horizontal Grooves (Mobile: pointer-events-none; Desktop: interactive click/hover) */}
          {Array.from({ length: boardSize - 1 }, (_, vR) =>
            Array.from({ length: boardSize }, (_, vC) => {
              const gridRow = vR * 2 + 2;
              const gridCol = vC * 2 + 1;
              const anchorC = Math.min(vC, maxWallIndex);
              const { r, c } = getBoardWallCoords(vR, anchorC);

              return (
                <div
                  key={`h-groove-${vR}-${vC}`}
                  style={{
                    touchAction: 'none',
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-10 sm:cursor-pointer touch-none pointer-events-none sm:pointer-events-auto before:absolute before:inset-0 sm:before:-inset-y-0.5 before:z-10"
                  onMouseEnter={() => handleWallHover(r, c, 'h', true)}
                  onClick={() => handleWallClick(r, c, 'h', true)}
                >
                  <div className="w-full h-full bg-transparent sm:group-hover:bg-amber-400/40 transition-colors rounded-sm" />
                </div>
              );
            })
          )}

          {/* 4b. Interactive Vertical Grooves (Mobile: pointer-events-none; Desktop: interactive click/hover) */}
          {Array.from({ length: boardSize }, (_, vR) =>
            Array.from({ length: boardSize - 1 }, (_, vC) => {
              const gridRow = vR * 2 + 1;
              const gridCol = vC * 2 + 2;
              const anchorR = Math.min(vR, maxWallIndex);
              const { r, c } = getBoardWallCoords(anchorR, vC);

              return (
                <div
                  key={`v-groove-${vR}-${vC}`}
                  style={{
                    touchAction: 'none',
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-10 sm:cursor-pointer touch-none pointer-events-none sm:pointer-events-auto before:absolute before:inset-0 sm:before:-inset-x-0.5 before:z-10"
                  onMouseEnter={() => handleWallHover(r, c, 'v', true)}
                  onClick={() => handleWallClick(r, c, 'v', true)}
                >
                  <div className="w-full h-full bg-transparent sm:group-hover:bg-cyan-400/40 transition-colors rounded-sm" />
                </div>
              );
            })
          )}

          {/* 4c. Interactive Intersections (Mobile: pointer-events-none; Desktop: interactive click/hover) */}
          {Array.from({ length: boardSize - 1 }, (_, vR) =>
            Array.from({ length: boardSize - 1 }, (_, vC) => {
              const gridRow = vR * 2 + 2;
              const gridCol = vC * 2 + 2;
              const { r, c } = getBoardWallCoords(vR, vC);

              return (
                <div
                  key={`intersection-${vR}-${vC}`}
                  style={{
                    touchAction: 'none',
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-10 sm:cursor-pointer touch-none pointer-events-none sm:pointer-events-auto before:absolute before:inset-0 sm:before:-inset-0.5 before:z-10"
                  onMouseEnter={() => handleWallHover(r, c, null, true)}
                  onClick={() => handleWallClick(r, c, null, true)}
                >
                  <div className="w-full h-full rounded-full bg-white/0 sm:group-hover:bg-white/60 transition-colors" />
                </div>
              );
            })
          )}

          {/* Floating Animated Rage Reactions */}
          {showReactions && <ReactionOverlay reactions={reactions} />}
        </div>
      </div>

      {/* Floating mobile touch-drag wall preview ghost following the player's finger */}
      {touchGhost && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 opacity-95 transition-none"
          style={{
            left: `${touchGhost.x}px`,
            top: `${touchGhost.y}px`,
          }}
        >
          <div
            className={`shadow-2xl ${
              touchGhost.orientation === 'h' ? 'w-24 h-4.5 wall-3d-h' : 'w-4.5 h-24 wall-3d-v'
            }`}
            style={{
              backgroundColor: getPlayerStyle(currentPlayerIdx, pieceTheme).color,
              backgroundImage: touchGhost.orientation === 'h'
                ? getPlayerStyle(currentPlayerIdx, pieceTheme).wallGradientH
                : getPlayerStyle(currentPlayerIdx, pieceTheme).wallGradientV,
              boxShadow: `0 0 24px ${getPlayerStyle(currentPlayerIdx, pieceTheme).wallGlow}, 0 6px 16px rgba(0, 0, 0, 0.8)`,
            }}
          />
        </div>
      )}

      {/* Wall Placement Warning Tooltip if hovered wall is illegal */}
      {hoveredWall && !hoveredWall.isValid && (
        <div className="mt-4 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-red-950/90 text-red-300 text-xs font-semibold border border-red-800 shadow-md animate-pulse">
            ⚠️ {hoveredWall.reason || 'Illegal wall placement'}
          </span>
        </div>
      )}
    </div>
  );
}
