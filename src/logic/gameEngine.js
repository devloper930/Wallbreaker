/**
 * Wallbreaker / Quoridor Game Engine
 * Core board representation, rules, wall collisions, jump logic, and BFS pathfinding.
 */

export const BOARD_SIZE = 9;

export const MODES = {
  CLASSIC: 'classic',
  RACE: 'race',
  QUAD: 'quad'
};

export const TIME_CONTROLS = {
  NO_TIMER: { label: 'No Clock', time: 0, increment: 0 },
  BULLET_1: { label: '1 min', time: 60, increment: 1 },
  BLITZ_3: { label: '3 min | 2s', time: 180, increment: 2 },
  RAPID_5: { label: '5 min', time: 300, increment: 3 },
  RAPID_10: { label: '10 min', time: 600, increment: 5 },
};

export const PLAYER_CONFIGS = [
  { id: 0, name: 'White / Gold', color: '#f59e0b', ringColor: '#fbbf24', edge: 'bottom' },
  { id: 1, name: 'Black / Cyan', color: '#0ea5e9', ringColor: '#38bdf8', edge: 'top' },
  { id: 2, name: 'Ruby / Red', color: '#ef4444', ringColor: '#f87171', edge: 'left' },
  { id: 3, name: 'Emerald / Green', color: '#10b981', ringColor: '#34d399', edge: 'right' },
];

/**
 * Returns initial player setups for given mode and board size
 */
export function getInitialPlayers(mode, boardSize = 9) {
  const center = Math.floor(boardSize / 2);
  const maxIdx = boardSize - 1;
  const walls2P = boardSize >= 13 ? 12 : 10;
  const wallsQuad = boardSize >= 13 ? 8 : boardSize >= 11 ? 7 : 5;

  if (mode === MODES.CLASSIC) {
    return [
      {
        id: 0,
        name: 'Player 1',
        r: maxIdx,
        c: center,
        wallsLeft: walls2P,
        targetEdge: 'top', // reach r === 0
        targetPredicate: (r, c) => r === 0,
      },
      {
        id: 1,
        name: 'Player 2',
        r: 0,
        c: center,
        wallsLeft: walls2P,
        targetEdge: 'bottom', // reach r === maxIdx
        targetPredicate: (r, c) => r === maxIdx,
      }
    ];
  }

  if (mode === MODES.RACE) {
    return [
      {
        id: 0,
        name: 'Player 1',
        r: maxIdx,
        c: Math.max(0, center - 1),
        wallsLeft: walls2P,
        targetEdge: 'top', // reach r === 0
        targetPredicate: (r, c) => r === 0,
      },
      {
        id: 1,
        name: 'Player 2',
        r: maxIdx,
        c: Math.min(maxIdx, center + 1),
        wallsLeft: walls2P,
        targetEdge: 'top', // reach r === 0
        targetPredicate: (r, c) => r === 0,
      }
    ];
  }

  if (mode === MODES.QUAD) {
    // Quad Compete: 4 players race to the exact center of the board!
    return [
      {
        id: 0,
        name: 'Player 1 (South)',
        r: maxIdx,
        c: center,
        wallsLeft: wallsQuad,
        targetEdge: 'center',
        targetPredicate: (r, c) => r === center && c === center,
      },
      {
        id: 1,
        name: 'Player 2 (West)',
        r: center,
        c: 0,
        wallsLeft: wallsQuad,
        targetEdge: 'center',
        targetPredicate: (r, c) => r === center && c === center,
      },
      {
        id: 2,
        name: 'Player 3 (North)',
        r: 0,
        c: center,
        wallsLeft: wallsQuad,
        targetEdge: 'center',
        targetPredicate: (r, c) => r === center && c === center,
      },
      {
        id: 3,
        name: 'Player 4 (East)',
        r: center,
        c: maxIdx,
        wallsLeft: wallsQuad,
        targetEdge: 'center',
        targetPredicate: (r, c) => r === center && c === center,
      }
    ];
  }

  throw new Error(`Unknown mode: ${mode}`);
}

/**
 * Creates a brand new game state
 */
export function createInitialGameState(mode = MODES.CLASSIC, timeControlKey = 'RAPID_5', boardSize = 9) {
  const tc = TIME_CONTROLS[timeControlKey] || TIME_CONTROLS.RAPID_5;
  const players = getInitialPlayers(mode, boardSize);

  return {
    mode,
    boardSize: boardSize || 9,
    timeControl: tc,
    turn: 0, // player index 0, 1, (2, 3)
    turnCount: 1,
    status: 'playing', // 'playing' | 'ended'
    winner: null,
    winReason: null,
    players,
    walls: [], // Array of { id, r, c, orientation: 'h'|'v', player: number }
    timers: players.map(() => tc.time),
    history: [], // [{ notation, player, type, details, timestamp }]
    drawOfferFrom: null,
    quadEndMode: 'first_win', // 'first_win' | 'placements'
    finishedPlayers: [],
    resignedPlayers: [], // player indices who resigned or timed out (frozen)
  };
}

/**
 * Checks if movement between adjacent cells (r1, c1) and (r2, c2) is blocked by board boundary or a placed wall.
 * r1, c1 and r2, c2 must be adjacent orthogonally.
 */
export function isPassageBlocked(r1, c1, r2, c2, walls, boardSize = 9) {
  // Offboard check
  if (r2 < 0 || r2 >= boardSize || c2 < 0 || c2 >= boardSize) {
    return true;
  }

  // Moving Vertically (r changes)
  if (c1 === c2) {
    const minR = Math.min(r1, r2);
    // A horizontal wall placed at (minR, c1) or (minR, c1 - 1) blocks movement across row minR and minR + 1
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (w.orientation === 'h' && w.r === minR) {
        if (w.c === c1 || w.c === c1 - 1) {
          return true;
        }
      }
    }
    return false;
  }

  // Moving Horizontally (c changes)
  if (r1 === r2) {
    const minC = Math.min(c1, c2);
    // A vertical wall placed at (r1, minC) or (r1 - 1, minC) blocks movement across col minC and minC + 1
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (w.orientation === 'v' && w.c === minC) {
        if (w.r === r1 || w.r === r1 - 1) {
          return true;
        }
      }
    }
    return false;
  }

  return true; // Not orthogonally adjacent
}

/**
 * Checks if a candidate wall overlaps or crosses any existing walls
 */
export function wallCollides(r, c, orientation, walls, boardSize = 9) {
  // Bounds check for walls: span 2 cells, so r in [0..boardSize - 2], c in [0..boardSize - 2]
  const maxWallCoord = boardSize - 2;
  if (r < 0 || r > maxWallCoord || c < 0 || c > maxWallCoord) {
    return true;
  }

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];

    // Same intersection crossing check: cannot have both 'h' and 'v' centered at (r, c)
    if (w.r === r && w.c === c) {
      return true;
    }

    if (orientation === 'h') {
      // Horizontal wall spans (r, c) and (r, c+1)
      // Conflicting if another 'h' is at (r, c), (r, c-1), or (r, c+1)
      if (w.orientation === 'h' && w.r === r) {
        if (Math.abs(w.c - c) <= 1) {
          return true;
        }
      }
    } else {
      // Vertical wall spans (r, c) and (r+1, c)
      // Conflicting if another 'v' is at (r, c), (r-1, c), or (r+1, c)
      if (w.orientation === 'v' && w.c === c) {
        if (Math.abs(w.r - r) <= 1) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Helper to check if coordinates (or player position) are on their target goal edge/center
 */
export function isPlayerAtTargetEdge(player, r, c, boardSize = 9) {
  if (!player) return false;
  const row = r !== undefined ? r : player.r;
  const col = c !== undefined ? c : player.c;

  // Custom predicate takes priority (e.g. Quad center goal)
  if (typeof player.targetPredicate === 'function') {
    return player.targetPredicate(row, col);
  }

  if (player.targetEdge === 'top') return row === 0;
  if (player.targetEdge === 'bottom') return row === boardSize - 1;
  if (player.targetEdge === 'right') return col === boardSize - 1;
  if (player.targetEdge === 'left') return col === 0;
  if (player.targetEdge === 'center') {
    const center = Math.floor(boardSize / 2);
    return row === center && col === center;
  }
  return row === 0;
}

/**
 * Helper to check if a player has reached their target goal
 */
export function isPlayerAtGoal(player, boardSize = 9) {
  return isPlayerAtTargetEdge(player, player.r, player.c, boardSize);
}

/**
 * BFS pathfinder to test if a player can reach their target edge given the walls.
 * Returns shortest path distance (number of steps) or Infinity if blocked.
 */
export function getShortestPathToGoal(player, walls, boardSize = 9) {
  const queue = [{ r: player.r, c: player.c, dist: 0 }];
  const visited = new Uint8Array(boardSize * boardSize);
  visited[player.r * boardSize + player.c] = 1;

  let head = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  while (head < queue.length) {
    const { r, c, dist } = queue[head++];

    if (isPlayerAtTargetEdge(player, r, c, boardSize)) {
      return dist;
    }

    for (let i = 0; i < dirs.length; i++) {
      const [dr, dc] = dirs[i];
      const nr = r + dr;
      const nc = c + dc;

      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        const idx = nr * boardSize + nc;
        if (!visited[idx] && !isPassageBlocked(r, c, nr, nc, walls, boardSize)) {
          visited[idx] = 1;
          queue.push({ r: nr, c: nc, dist: dist + 1 });
        }
      }
    }
  }

  return Infinity;
}

/**
 * Validates that ALL active players still have at least one valid path to their goal.
 * Excludes finished or resigned/frozen players.
 */
export function allPlayersHavePath(players, walls, finishedPlayers = [], resignedPlayers = [], boardSize = 9) {
  const inactive = [...finishedPlayers, ...resignedPlayers];
  for (let i = 0; i < players.length; i++) {
    if (inactive.includes(i) || players[i].isResigned || players[i].isFrozen) continue;
    const dist = getShortestPathToGoal(players[i], walls, boardSize);
    if (dist === Infinity) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a wall placement is completely legal:
 * 1. Player has remaining walls.
 * 2. Does not collide or cross existing walls.
 * 3. Does not trap ANY player (all players have path to goal).
 */
export function isLegalWallPlacement(r, c, orientation, playerIndex, gameState) {
  const player = gameState.players[playerIndex];
  if (!player || player.wallsLeft <= 0 || player.isResigned || player.isFrozen) {
    return { valid: false, reason: player?.isResigned ? 'Player is frozen/resigned' : 'No walls remaining' };
  }

  const boardSize = gameState.boardSize || 9;

  if (wallCollides(r, c, orientation, gameState.walls, boardSize)) {
    return { valid: false, reason: 'Overlaps or crosses an existing wall' };
  }

  // Tentatively add wall and check path for all players
  const testWall = { id: `test-${r}-${c}-${orientation}`, r, c, orientation, player: playerIndex };
  const candidateWalls = [...gameState.walls, testWall];

  if (!allPlayersHavePath(gameState.players, candidateWalls, gameState.finishedPlayers || [], gameState.resignedPlayers || [], boardSize)) {
    return { valid: false, reason: 'Illegal wall: Completely blocks a player from their goal' };
  }

  return { valid: true };
}

/**
 * Calculates all legal pawn moves for the given player according to official Quoridor rules.
 * Includes straight jumps and diagonal jumps when straight jump is blocked.
 */
export function getLegalPawnMoves(playerIndex, gameState) {
  const player = gameState.players[playerIndex];
  if (!player || player.isResigned || player.isFrozen) return [];

  const { r, c } = player;
  const legalMoves = [];
  const walls = gameState.walls;
  const boardSize = gameState.boardSize || 9;

  // Map of occupied cells by other pawns on board (including frozen/resigned pawns which remain as obstacles)
  const occupied = new Map();
  gameState.players.forEach((p, idx) => {
    if (idx !== playerIndex && (!gameState.finishedPlayers || !gameState.finishedPlayers.includes(idx))) {
      occupied.set(`${p.r},${p.c}`, idx);
    }
  });

  const orthogonalDirs = [
    { dr: -1, dc: 0 }, // Up
    { dr: 1, dc: 0 },  // Down
    { dr: 0, dc: -1 }, // Left
    { dr: 0, dc: 1 },  // Right
  ];

  for (const { dr, dc } of orthogonalDirs) {
    const nr = r + dr;
    const nc = c + dc;

    // Is move to adjacent cell blocked by wall or board edge?
    if (isPassageBlocked(r, c, nr, nc, walls, boardSize)) {
      continue;
    }

    const isOccupied = occupied.has(`${nr},${nc}`);

    if (!isOccupied) {
      // Normal single step
      legalMoves.push({ r: nr, c: nc, isJump: false });
    } else {
      // Adjacent cell has another pawn! Quoridor Jump Rules apply:
      const jumpR = nr + dr;
      const jumpC = nc + dc;

      // Check if straight jump is blocked
      const straightBlocked = isPassageBlocked(nr, nc, jumpR, jumpC, walls, boardSize) || occupied.has(`${jumpR},${jumpC}`);

      if (!straightBlocked) {
        // Straight jump is legal!
        legalMoves.push({ r: jumpR, c: jumpC, isJump: true, straight: true });
      } else {
        // Official Quoridor rule:
        // If straight jump is blocked (by wall, board boundary, or another pawn),
        // player can jump diagonally to either side of the opponent pawn.
        const perpendicularDirs = dr !== 0
          ? [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }]
          : [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }];

        for (const pDir of perpendicularDirs) {
          const diagR = nr + pDir.dr;
          const diagC = nc + pDir.dc;

          // Must not be blocked by wall between opponent cell and diagonal cell
          // And diagonal cell must not be occupied
          if (!isPassageBlocked(nr, nc, diagR, diagC, walls, boardSize) && !occupied.has(`${diagR},${diagC}`)) {
            legalMoves.push({ r: diagR, c: diagC, isJump: true, diagonal: true });
          }
        }
      }
    }
  }

  return legalMoves;
}

/**
 * Algebraic notation helper
 * Board coords: col 0 -> 'a', col (boardSize - 1) -> letter
 * row 0 (top) -> boardSize, row (boardSize - 1) -> '1'
 */
export function toAlgebraic(r, c, boardSize = 9) {
  const colLetter = String.fromCharCode(97 + c);
  const rowNumber = boardSize - r;
  return `${colLetter}${rowNumber}`;
}

export function formatMoveNotation(action, playerIndex, prevPos = null, boardSize = 9) {
  const prefix = `P${playerIndex + 1}`;
  if (action.type === 'pawn') {
    const dest = toAlgebraic(action.to.r, action.to.c, boardSize);
    if (prevPos) {
      return `${prefix}: ${toAlgebraic(prevPos.r, prevPos.c, boardSize)}-${dest}`;
    }
    return `${prefix}: ${dest}`;
  }
  if (action.type === 'wall') {
    const coord = toAlgebraic(action.r, action.c, boardSize);
    return `${prefix}: W${coord}${action.orientation}`;
  }
  return `${prefix}: ${action.type}`;
}

/**
 * Applies a move to the game state and returns a new state object.
 */
export function applyMove(gameState, action) {
  if (gameState.status !== 'playing') {
    return { success: false, error: 'Game is already over' };
  }

  const currentPlayerIdx = gameState.turn;
  const player = gameState.players[currentPlayerIdx];
  if (!player || player.isResigned || player.isFrozen) {
    return { success: false, error: 'Player is resigned/frozen' };
  }

  const boardSize = gameState.boardSize || 9;
  const nextPlayers = gameState.players.map(p => ({ ...p }));
  const nextWalls = [...gameState.walls];
  let notation = '';

  if (action.type === 'pawn') {
    const legalMoves = getLegalPawnMoves(currentPlayerIdx, gameState);
    const isLegal = legalMoves.some(m => m.r === action.to.r && m.c === action.to.c);

    if (!isLegal) {
      return { success: false, error: 'Illegal pawn move' };
    }

    const prevPos = { r: player.r, c: player.c };
    nextPlayers[currentPlayerIdx].r = action.to.r;
    nextPlayers[currentPlayerIdx].c = action.to.c;
    notation = formatMoveNotation(action, currentPlayerIdx, prevPos, boardSize);
  } else if (action.type === 'wall') {
    const validation = isLegalWallPlacement(action.r, action.c, action.orientation, currentPlayerIdx, gameState);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    nextPlayers[currentPlayerIdx].wallsLeft -= 1;
    const newWall = {
      id: `w-${action.r}-${action.c}-${action.orientation}`,
      r: action.r,
      c: action.c,
      orientation: action.orientation,
      player: currentPlayerIdx,
    };
    nextWalls.push(newWall);
    notation = formatMoveNotation(action, currentPlayerIdx, null, boardSize);
  } else {
    return { success: false, error: 'Unknown action type' };
  }

  // Update Clock timers with increment
  const nextTimers = [...gameState.timers];
  if (gameState.timeControl.increment > 0 && nextTimers[currentPlayerIdx] > 0) {
    nextTimers[currentPlayerIdx] += gameState.timeControl.increment;
  }

  // Check Win Condition
  let nextStatus = 'playing';
  let winner = null;
  let winReason = null;
  const finishedPlayers = [...(gameState.finishedPlayers || [])];

  const updatedPlayer = nextPlayers[currentPlayerIdx];
  if (isPlayerAtGoal(updatedPlayer, boardSize)) {
    if (gameState.mode === MODES.QUAD) {
      nextStatus = 'ended';
      winner = currentPlayerIdx;
      winReason = `${updatedPlayer.name} reached the center of the board first!`;
    } else {
      nextStatus = 'ended';
      winner = currentPlayerIdx;
      winReason = `${updatedPlayer.name} reached the goal edge!`;
    }
  }

  // Determine next turn (skip finished AND resigned/frozen players)
  let nextTurn = (currentPlayerIdx + 1) % gameState.players.length;
  if (nextStatus === 'playing') {
    const inactive = [...finishedPlayers, ...(gameState.resignedPlayers || [])];
    let loopGuard = 0;
    while (inactive.includes(nextTurn) && loopGuard < gameState.players.length) {
      nextTurn = (nextTurn + 1) % gameState.players.length;
      loopGuard++;
    }
  }

  const nextHistory = [
    ...gameState.history,
    {
      action,
      player: currentPlayerIdx,
      notation,
      timestamp: Date.now(),
    }
  ];

  return {
    success: true,
    state: {
      ...gameState,
      players: nextPlayers,
      walls: nextWalls,
      timers: nextTimers,
      turn: nextTurn,
      turnCount: gameState.turnCount + 1,
      status: nextStatus,
      winner,
      winReason,
      history: nextHistory,
      finishedPlayers,
      drawOfferFrom: null,
    }
  };
}

/**
 * Handles player resignation or timeout in a game.
 * In 2-player modes: other player wins immediately.
 * In Quad mode: resigning player's piece is frozen and their turns are skipped.
 * The game continues between remaining active players.
 * If only 1 active player remains, that player wins.
 */
export function handlePlayerResign(gameState, resigningPlayerIdx, customReason = null) {
  if (gameState.status !== 'playing') return gameState;

  const playerName = gameState.players[resigningPlayerIdx]?.name || 'Player';
  const defaultReason = customReason || `${playerName} resigned.`;

  // 2-player game: instant win for opponent
  if (gameState.mode !== MODES.QUAD || gameState.players.length <= 2) {
    const winnerIdx = (resigningPlayerIdx + 1) % gameState.players.length;
    return {
      ...gameState,
      status: 'ended',
      winner: winnerIdx,
      winReason: defaultReason,
    };
  }

  // Quad Mode: Freeze the piece, skip turn, continue game
  const resigned = [...(gameState.resignedPlayers || [])];
  if (!resigned.includes(resigningPlayerIdx)) {
    resigned.push(resigningPlayerIdx);
  }

  const nextPlayers = gameState.players.map((p, idx) => {
    if (idx === resigningPlayerIdx) {
      return {
        ...p,
        isResigned: true,
        isFrozen: true,
      };
    }
    return p;
  });

  // Calculate remaining active players
  const activePlayers = nextPlayers.filter(
    (p, idx) => !resigned.includes(idx) && (!gameState.finishedPlayers || !gameState.finishedPlayers.includes(idx))
  );

  // If only 1 active player remains, they are the last standing champion!
  if (activePlayers.length <= 1) {
    const winner = activePlayers[0] ? activePlayers[0].id : 0;
    return {
      ...gameState,
      players: nextPlayers,
      resignedPlayers: resigned,
      status: 'ended',
      winner,
      winReason: `${nextPlayers[winner]?.name || 'Player'} is the last player standing!`,
    };
  }

  // If 2 or more active players remain, game continues!
  let nextTurn = gameState.turn;
  if (nextTurn === resigningPlayerIdx) {
    let loopGuard = 0;
    const inactive = [...(gameState.finishedPlayers || []), ...resigned];
    while (inactive.includes(nextTurn) && loopGuard < gameState.players.length) {
      nextTurn = (nextTurn + 1) % gameState.players.length;
      loopGuard++;
    }
  }

  return {
    ...gameState,
    players: nextPlayers,
    resignedPlayers: resigned,
    turn: nextTurn,
  };
}
