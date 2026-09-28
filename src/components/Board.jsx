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
  const handleWallHover = (r, c, overrideOrientation = null) => {
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
  const handleWallClick = (r, c, overrideOrientation = null) => {
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

  // Calculate nearest wall coordinate (r, c) from client coordinates
  // Only returns coordinates when the cursor is in between two cells (near a groove)
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
    let c = Math.round(cFloat);
    let r = Math.round(rFloat);
    c = Math.max(0, Math.min(maxWallIndex, c));
    r = Math.max(0, Math.min(maxWallIndex, r));

    // Distance to nearest groove line (0 = directly on groove, 0.5 = center of cell)
    const distToHorizGroove = Math.abs(rFloat - r);
    const distToVertGroove = Math.abs(cFloat - c);

    // Only allow wall recommendation when hovering in between two cells
    const currentOri = orientation || wallOrientation;
    const threshold = 0.32;
    const isBetweenCells = currentOri === 'h'
      ? distToHorizGroove <= threshold
      : distToVertGroove <= threshold;

    if (!isBetweenCells) {
      return null;
    }

    if (flipped) {
      r = maxWallIndex - r;
      c = maxWallIndex - c;
    }
    return { r, c };
  };

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
    <div className={`relative p-2 sm:p-4 rounded-2xl bg-[#21201d] border border-[#3c3934] shadow-2xl select-none theme-${theme}`}>
      {/* Target Edge Glow Banner */}
      <div className="absolute top-2 left-4 right-4 flex items-center justify-between text-[11px] text-[#9e9c98] px-2 py-0.5">
        <span className="font-mono">
          Turn {gameState.turnCount} • {currentPlayer?.name || 'Player'}'s move
        </span>
        {currentPlayer?.wallsLeft > 0 && isMyTurn && !currentPlayer?.isResigned && (
          <span className="text-[#81b64c] text-[10px] hidden sm:inline">
            Press <kbd className="px-1 py-0.5 rounded bg-[#3c3934] text-white font-mono text-[9px]">R</kbd> or click to rotate wall
          </span>
        )}
      </div>

      {/* Main Board Wrapper with Coordinate Labels */}
      <div className="relative mt-5 aspect-square w-full max-w-[540px] sm:max-w-[560px] md:max-w-[580px] mx-auto">
        {/* Coordinate Labels (Controlled via Settings: showCoords) */}
        {showCoords && (
          <>
            {/* Left Ranks */}
            <div className="absolute -left-4 sm:-left-5 top-0 bottom-0 flex flex-col justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
              {rows.map(r => (
                <span key={r} className="h-6 flex items-center justify-center font-mono">
                  {boardSize - r}
                </span>
              ))}
            </div>

            {/* Right Ranks */}
            <div className="absolute -right-4 sm:-right-5 top-0 bottom-0 flex flex-col justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
              {rows.map(r => (
                <span key={r} className="h-6 flex items-center justify-center font-mono">
                  {boardSize - r}
                </span>
              ))}
            </div>

            {/* Bottom Files */}
            <div className="absolute -bottom-5 sm:-bottom-6 left-0 right-0 flex justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
              {cols.map(c => (
                <span key={c} className="w-6 flex items-center justify-center font-mono">
                  {String.fromCharCode(97 + c)}
                </span>
              ))}
            </div>

            {/* Top Files */}
            <div className="absolute -top-5 sm:-top-6 left-0 right-0 flex justify-around text-[10px] sm:text-xs font-bold text-[#666461] pointer-events-none">
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
          className="w-full h-full rounded-xl overflow-hidden shadow-board border-4 border-[#313f24] relative"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${boardSize - 1}, 1fr clamp(6px, 1.4vw, 12px)) 1fr`,
            gridTemplateColumns: `repeat(${boardSize - 1}, 1fr clamp(6px, 1.4vw, 12px)) 1fr`,
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
                  className={`relative flex items-center justify-center cursor-pointer transition-all duration-100 ${
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
                        className={`relative w-[78%] h-[78%] rounded-full flex items-center justify-center transition-transform duration-200 pawn-shadow ${
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
                            ? `0 0 16px ${pawnStyle.wallGlow}, 0 6px 12px rgba(0, 0, 0, 0.6)`
                            : '0 4px 8px rgba(0, 0, 0, 0.5)',
                          border: isFrozen
                            ? '2px dashed #38bdf8'
                            : isCurrentTurnPawn
                            ? '2.5px solid #ffffff'
                            : `2px solid ${pawnStyle.ringColor || 'rgba(255, 255, 255, 0.4)'}`,
                        }}
                      >
                        {/* Frozen indicator badge */}
                        {isFrozen && (
                          <div className="absolute -top-1.5 -right-1.5 bg-cyan-950 border border-cyan-400 text-cyan-200 text-[10px] rounded-full px-1 shadow z-20 font-bold">
                            ❄️
                          </div>
                        )}

                        {/* Inner emblem / crest / gem core (NO numbers) */}
                        {pawnStyle.icon ? (
                          <span className="text-white text-base sm:text-lg select-none drop-shadow pointer-events-none font-serif leading-none">
                            {pawnStyle.icon}
                          </span>
                        ) : (
                          <div className="w-[46%] h-[46%] rounded-full border-2 border-white/60 bg-white/20 shadow-inner flex items-center justify-center pointer-events-none">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
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

          {/* 2. Placed Walls (Colors strictly match player piece colors) */}
          {walls.map((wall) => {
            // Find grid coordinates based on flipped orientation
            const rIdx = rows.indexOf(wall.r);
            const cIdx = cols.indexOf(wall.c);
            const wallPlayerStyle = getPlayerStyle(wall.player, pieceTheme);

            if (wall.orientation === 'h') {
              // Horizontal wall spans: groove between rIdx and rIdx+1, spanning from cIdx to cIdx+1 (3 grid units)
              const startRow = Math.min(rIdx, rIdx + (flipped ? -1 : 1)) * 2 + 2;
              const startCol = Math.min(cIdx, cIdx + (flipped ? -1 : 1)) * 2 + 1;

              return (
                <div
                  key={wall.id}
                  style={{
                    gridRow: `${startRow} / span 1`,
                    gridColumn: `${startCol} / span 3`,
                    backgroundColor: wallPlayerStyle.color,
                    backgroundImage: wallPlayerStyle.wallGradientH,
                    borderColor: wallPlayerStyle.wallBorder,
                    boxShadow: `0 3px 6px rgba(0, 0, 0, 0.5), 0 0 10px ${wallPlayerStyle.wallGlow}`,
                  }}
                  className="z-20 rounded-sm wall-3d-h border pointer-events-none transition-all"
                />
              );
            } else {
              // Vertical wall spans: groove between cIdx and cIdx+1, spanning from rIdx to rIdx+1 (3 grid units)
              const startRow = Math.min(rIdx, rIdx + (flipped ? -1 : 1)) * 2 + 1;
              const startCol = Math.min(cIdx, cIdx + (flipped ? -1 : 1)) * 2 + 2;

              return (
                <div
                  key={wall.id}
                  style={{
                    gridRow: `${startRow} / span 3`,
                    gridColumn: `${startCol} / span 1`,
                    backgroundColor: wallPlayerStyle.color,
                    backgroundImage: wallPlayerStyle.wallGradientV,
                    borderColor: wallPlayerStyle.wallBorder,
                    boxShadow: `2px 2px 6px rgba(0, 0, 0, 0.5), 0 0 10px ${wallPlayerStyle.wallGlow}`,
                  }}
                  className="z-20 rounded-sm wall-3d-v border pointer-events-none transition-all"
                />
              );
            }
          })}

          {/* 3. Wall Hover Preview (Ghost Wall matching current player color) */}
          {hoveredWall && (
            (() => {
              const rIdx = rows.indexOf(hoveredWall.r);
              const cIdx = cols.indexOf(hoveredWall.c);
              const currentPStyle = getPlayerStyle(currentPlayerIdx, pieceTheme);

              if (hoveredWall.orientation === 'h') {
                const startRow = Math.min(rIdx, rIdx + (flipped ? -1 : 1)) * 2 + 2;
                const startCol = Math.min(cIdx, cIdx + (flipped ? -1 : 1)) * 2 + 1;

                return (
                  <div
                    style={{
                      gridRow: `${startRow} / span 1`,
                      gridColumn: `${startCol} / span 3`,
                      backgroundImage: hoveredWall.isValid ? currentPStyle.wallGradientH : undefined,
                      backgroundColor: hoveredWall.isValid ? currentPStyle.color : 'rgba(239, 68, 68, 0.85)',
                      borderColor: hoveredWall.isValid ? '#ffffff' : '#fca5a5',
                      boxShadow: hoveredWall.isValid
                        ? `0 0 16px ${currentPStyle.wallGlow}, 0 0 6px #ffffff`
                        : '0 0 14px rgba(239, 68, 68, 0.9)',
                    }}
                    className="z-30 rounded-sm pointer-events-none transition-all duration-75 border-2 animate-pulse"
                  />
                );
              } else {
                const startRow = Math.min(rIdx, rIdx + (flipped ? -1 : 1)) * 2 + 1;
                const startCol = Math.min(cIdx, cIdx + (flipped ? -1 : 1)) * 2 + 2;

                return (
                  <div
                    style={{
                      gridRow: `${startRow} / span 3`,
                      gridColumn: `${startCol} / span 1`,
                      backgroundImage: hoveredWall.isValid ? currentPStyle.wallGradientV : undefined,
                      backgroundColor: hoveredWall.isValid ? currentPStyle.color : 'rgba(239, 68, 68, 0.85)',
                      borderColor: hoveredWall.isValid ? '#ffffff' : '#fca5a5',
                      boxShadow: hoveredWall.isValid
                        ? `0 0 16px ${currentPStyle.wallGlow}, 0 0 6px #ffffff`
                        : '0 0 14px rgba(239, 68, 68, 0.9)',
                    }}
                    className="z-30 rounded-sm pointer-events-none transition-all duration-75 border-2 animate-pulse"
                  />
                );
              }
            })()
          )}

          {/* 4a. Interactive Horizontal Grooves (between cells vertically) */}
          {rows.slice(0, boardSize - 1).map((r, rIdx) =>
            cols.map((c, cIdx) => {
              const gridRow = rIdx * 2 + 2;
              const gridCol = cIdx * 2 + 1;
              const anchorC = Math.min(c, maxWallIndex);

              return (
                <div
                  key={`h-groove-${r}-${c}`}
                  style={{
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-10 cursor-pointer"
                  onMouseEnter={() => handleWallHover(r, anchorC, 'h')}
                  onClick={() => handleWallClick(r, anchorC, 'h')}
                >
                  <div className="w-full h-full bg-transparent group-hover:bg-amber-400/40 transition-colors rounded-sm" />
                </div>
              );
            })
          )}

          {/* 4b. Interactive Vertical Grooves (between cells horizontally) */}
          {rows.map((r, rIdx) =>
            cols.slice(0, boardSize - 1).map((c, cIdx) => {
              const gridRow = rIdx * 2 + 1;
              const gridCol = cIdx * 2 + 2;
              const anchorR = Math.min(r, maxWallIndex);

              return (
                <div
                  key={`v-groove-${r}-${c}`}
                  style={{
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-10 cursor-pointer"
                  onMouseEnter={() => handleWallHover(anchorR, c, 'v')}
                  onClick={() => handleWallClick(anchorR, c, 'v')}
                >
                  <div className="w-full h-full bg-transparent group-hover:bg-cyan-400/40 transition-colors rounded-sm" />
                </div>
              );
            })
          )}

          {/* 4c. Interactive Intersections */}
          {rows.slice(0, boardSize - 1).map((r, rIdx) =>
            cols.slice(0, boardSize - 1).map((c, cIdx) => {
              const gridRow = rIdx * 2 + 2;
              const gridCol = cIdx * 2 + 2;

              return (
                <div
                  key={`intersection-${r}-${c}`}
                  style={{
                    gridRow: `${gridRow} / span 1`,
                    gridColumn: `${gridCol} / span 1`,
                  }}
                  className="relative group z-20 cursor-pointer"
                  onMouseEnter={() => handleWallHover(r, c)}
                  onClick={() => handleWallClick(r, c)}
                >
                  <div className="w-full h-full rounded-full bg-white/0 group-hover:bg-white/60 transition-colors" />
                </div>
              );
            })
          )}

          {/* Floating Animated Rage Reactions */}
          {showReactions && <ReactionOverlay reactions={reactions} />}
        </div>
      </div>

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
