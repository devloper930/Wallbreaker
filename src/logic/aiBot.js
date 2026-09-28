/**
 * Wallbreaker AI Bot Engine
 * Models Chess.com-style bot personalities with standard Elo ratings.
 */

import {
  getLegalPawnMoves,
  getShortestPathToGoal,
  isLegalWallPlacement,
  isPassageBlocked,
  isPlayerAtTargetEdge,
  BOARD_SIZE,
} from './gameEngine.js';

export const CHESS_BOTS = [
  {
    id: 'martin',
    name: 'Martin',
    title: 'Beginner',
    rating: 400,
    avatar: '👨‍🎓',
    color: '#10b981',
    difficulty: 'easy',
    quote: "I'm still learning how to place walls. Don't be too hard on me!",
    description: 'Casual beginner. Focuses on moving forward and rarely drops walls.',
  },
  {
    id: 'nelson',
    name: 'Nelson',
    title: 'Intermediate',
    rating: 1100,
    avatar: '🧔',
    color: '#f59e0b',
    difficulty: 'medium',
    quote: 'You will not cross my wall! I like to strike early.',
    description: 'Aggressive barricader. Loves to place early walls right across your path.',
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'Advanced',
    rating: 1600,
    avatar: '👩‍💼',
    color: '#0ea5e9',
    difficulty: 'hard',
    quote: 'Every wall must have a purpose. Positional tempo wins games.',
    description: 'Positional calculator. Places walls only when they create massive detours.',
  },
  {
    id: 'magnus',
    name: 'Magnus Bot',
    title: 'Grandmaster',
    rating: 2300,
    avatar: '👑',
    color: '#a855f7',
    difficulty: 'master',
    quote: 'Quoridor is all about tempo and geography. Let us calculate.',
    description: 'Grandmaster engine. Deep shortest-path minimax evaluation and jump mastery.',
  },
  {
    id: 'engine',
    name: 'Stockfish Engine',
    title: 'Custom Engine',
    rating: 1800,
    avatar: '⚙️',
    color: '#ec4899',
    difficulty: 'custom',
    quote: 'Adjust my rating slider to test your tactical precision against any level.',
    description: 'Configurable engine. Rating adjustable from 200 to 3000 Elo via slider.',
    isCustom: true,
  },
];

/**
 * Finds the sequence of cells for the shortest path to goal
 */
export function getShortestPathCoordinates(player, walls, boardSize = 9) {
  const queue = [{ r: player.r, c: player.c, path: [{ r: player.r, c: player.c }] }];
  const visited = new Uint8Array(boardSize * boardSize);
  visited[player.r * boardSize + player.c] = 1;

  let head = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (head < queue.length) {
    const { r, c, path } = queue[head++];

    if (isPlayerAtTargetEdge(player, r, c, boardSize)) {
      return path;
    }

    for (let i = 0; i < dirs.length; i++) {
      const [dr, dc] = dirs[i];
      const nr = r + dr;
      const nc = c + dc;

      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        const idx = nr * boardSize + nc;
        if (!visited[idx] && !isPassageBlocked(r, c, nr, nc, walls, boardSize)) {
          visited[idx] = 1;
          queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
        }
      }
    }
  }

  return [];
}

/**
 * Generates promising wall placements around a target player or across the board
 */
function getCandidateWalls(targetPlayer, botPlayerIndex, gameState, limit = 20) {
  const botPlayer = gameState.players[botPlayerIndex];
  if (!botPlayer || botPlayer.wallsLeft <= 0 || botPlayer.isResigned || botPlayer.isFrozen) return [];

  const boardSize = gameState.boardSize || 9;
  const maxWallCoord = boardSize - 2;
  const candidates = [];
  const targetPath = getShortestPathCoordinates(targetPlayer, gameState.walls, boardSize);

  // 1. Walls directly blocking the immediate next steps on opponent's shortest path
  if (targetPath.length > 1) {
    for (let i = 0; i < Math.min(4, targetPath.length - 1); i++) {
      const curr = targetPath[i];
      const next = targetPath[i + 1];

      if (curr.r !== next.r) {
        // Vertical step, candidate horizontal wall
        const minR = Math.min(curr.r, next.r);
        candidates.push({ r: minR, c: Math.max(0, curr.c - 1), orientation: 'h' });
        candidates.push({ r: minR, c: Math.min(maxWallCoord, curr.c), orientation: 'h' });
      } else if (curr.c !== next.c) {
        // Horizontal step, candidate vertical wall
        const minC = Math.min(curr.c, next.c);
        candidates.push({ r: Math.max(0, curr.r - 1), c: minC, orientation: 'v' });
        candidates.push({ r: Math.min(maxWallCoord, curr.r), c: minC, orientation: 'v' });
      }
    }
  }

  // 2. Walls in the 3x3 vicinity of the target player
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const wr = targetPlayer.r + dr;
      const wc = targetPlayer.c + dc;
      if (wr >= 0 && wr <= maxWallCoord && wc >= 0 && wc <= maxWallCoord) {
        candidates.push({ r: wr, c: wc, orientation: 'h' });
        candidates.push({ r: wr, c: wc, orientation: 'v' });
      }
    }
  }

  // Deduplicate and filter legal walls
  const uniqueKeys = new Set();
  const validWalls = [];

  for (const w of candidates) {
    const key = `${w.r},${w.c},${w.orientation}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      const res = isLegalWallPlacement(w.r, w.c, w.orientation, botPlayerIndex, gameState);
      if (res.valid) {
        validWalls.push(w);
      }
    }
    if (validWalls.length >= limit) break;
  }

  return validWalls;
}

/**
 * Computes the best move for the AI Bot based on bot persona / rating
 */
export function getBotMove(gameState, botPlayerIndex, botIdOrDifficulty = 'nelson', customRating = 1800) {
  const botPlayer = gameState.players[botPlayerIndex];
  if (!botPlayer || botPlayer.isResigned || botPlayer.isFrozen) return null;

  const legalPawnMoves = getLegalPawnMoves(botPlayerIndex, gameState);
  if (legalPawnMoves.length === 0) return null;

  const boardSize = gameState.boardSize || 9;

  // Resolve bot personality
  const botDef = CHESS_BOTS.find(b => b.id === botIdOrDifficulty || b.difficulty === botIdOrDifficulty) || CHESS_BOTS[1];
  
  let effectiveRating = (botDef.isCustom || botIdOrDifficulty === 'engine' || botIdOrDifficulty === 'quick_opp' || typeof customRating === 'number')
    ? (customRating || botDef.rating)
    : botDef.rating;

  let effectiveDifficulty = 'medium';
  if (effectiveRating < 800) effectiveDifficulty = 'easy';
  else if (effectiveRating < 1500) effectiveDifficulty = 'medium';
  else if (effectiveRating < 2200) effectiveDifficulty = 'hard';
  else effectiveDifficulty = 'master';

  // Identify primary opponent (closest to goal, excluding finished/resigned)
  let opponentIndex = -1;
  let minOpponentDist = Infinity;
  const inactive = [...(gameState.finishedPlayers || []), ...(gameState.resignedPlayers || [])];

  for (let i = 0; i < gameState.players.length; i++) {
    if (i !== botPlayerIndex && !inactive.includes(i) && !gameState.players[i].isResigned && !gameState.players[i].isFrozen) {
      const d = getShortestPathToGoal(gameState.players[i], gameState.walls, boardSize);
      if (d < minOpponentDist) {
        minOpponentDist = d;
        opponentIndex = i;
      }
    }
  }

  const primaryOpponent = gameState.players[opponentIndex] || gameState.players[(botPlayerIndex + 1) % gameState.players.length];
  const myCurrentDist = getShortestPathToGoal(botPlayer, gameState.walls, boardSize);
  const oppCurrentDist = primaryOpponent ? getShortestPathToGoal(primaryOpponent, gameState.walls, boardSize) : Infinity;

  // ──────────────────────────────────────────
  // 1. EASY / BEGINNER (Rating < 800, e.g. Martin):
  // ──────────────────────────────────────────
  if (effectiveDifficulty === 'easy') {
    // 15% chance to place a casual wall
    if (botPlayer.wallsLeft > 0 && Math.random() < 0.15) {
      const candidateWalls = getCandidateWalls(primaryOpponent, botPlayerIndex, gameState, 8);
      if (candidateWalls.length > 0) {
        const picked = candidateWalls[Math.floor(Math.random() * candidateWalls.length)];
        // Verify legal
        if (isLegalWallPlacement(picked.r, picked.c, picked.orientation, botPlayerIndex, gameState).valid) {
          return { type: 'wall', ...picked };
        }
      }
    }

    // 25% chance of casual random move, otherwise shortest path
    if (Math.random() < 0.25) {
      const randomMove = legalPawnMoves[Math.floor(Math.random() * legalPawnMoves.length)];
      return { type: 'pawn', to: { r: randomMove.r, c: randomMove.c } };
    }

    let bestMove = legalPawnMoves[0];
    let bestDist = Infinity;
    for (const move of legalPawnMoves) {
      const simPlayer = { ...botPlayer, r: move.r, c: move.c };
      const d = getShortestPathToGoal(simPlayer, gameState.walls, boardSize);
      if (d < bestDist) {
        bestDist = d;
        bestMove = move;
      }
    }
    return { type: 'pawn', to: { r: bestMove.r, c: bestMove.c } };
  }

  // ──────────────────────────────────────────
  // 2. MEDIUM / INTERMEDIATE (Rating 800 - 1500, e.g. Nelson):
  // ──────────────────────────────────────────
  if (effectiveDifficulty === 'medium') {
    // Nelson loves to drop walls early when opponent approaches
    if (botPlayer.wallsLeft > 0 && (oppCurrentDist <= myCurrentDist || Math.random() < 0.5)) {
      const candidateWalls = getCandidateWalls(primaryOpponent, botPlayerIndex, gameState, 14);
      let bestWall = null;
      let maxDistIncrease = 0;

      for (const w of candidateWalls) {
        const simWalls = [...gameState.walls, { id: 'sim', ...w, player: botPlayerIndex }];
        const newOppDist = getShortestPathToGoal(primaryOpponent, simWalls, boardSize);
        const newMyDist = getShortestPathToGoal(botPlayer, simWalls, boardSize);

        if (newMyDist <= myCurrentDist) {
          const increase = newOppDist - oppCurrentDist;
          if (increase > maxDistIncrease) {
            maxDistIncrease = increase;
            bestWall = w;
          }
        }
      }

      if (bestWall && maxDistIncrease >= 1) {
        if (isLegalWallPlacement(bestWall.r, bestWall.c, bestWall.orientation, botPlayerIndex, gameState).valid) {
          return { type: 'wall', ...bestWall };
        }
      }
    }

    // Move pawn along shortest path
    let bestMove = legalPawnMoves[0];
    let bestDist = Infinity;
    for (const move of legalPawnMoves) {
      const simPlayer = { ...botPlayer, r: move.r, c: move.c };
      const d = getShortestPathToGoal(simPlayer, gameState.walls, boardSize);
      if (d < bestDist) {
        bestDist = d;
        bestMove = move;
      }
    }
    return { type: 'pawn', to: { r: bestMove.r, c: bestMove.c } };
  }

  // ──────────────────────────────────────────
  // 3. HARD / ADVANCED (Rating 1500 - 2200, e.g. Elena):
  // ──────────────────────────────────────────
  if (effectiveDifficulty === 'hard') {
    // Only place walls if opponent is ahead or close to winning, and the wall grants substantial detour
    if (botPlayer.wallsLeft > 0 && oppCurrentDist <= myCurrentDist + 1) {
      const candidateWalls = getCandidateWalls(primaryOpponent, botPlayerIndex, gameState, 18);
      let bestWall = null;
      let maxDelta = 0;

      for (const w of candidateWalls) {
        const simWalls = [...gameState.walls, { id: 'sim', ...w, player: botPlayerIndex }];
        const newOppDist = getShortestPathToGoal(primaryOpponent, simWalls, boardSize);
        const newMyDist = getShortestPathToGoal(botPlayer, simWalls, boardSize);

        const oppDetour = newOppDist - oppCurrentDist;
        const myDetour = newMyDist - myCurrentDist;

        if (oppDetour >= 2 && myDetour <= 0) {
          const delta = oppDetour - myDetour;
          if (delta > maxDelta) {
            maxDelta = delta;
            bestWall = w;
          }
        }
      }

      if (bestWall) {
        if (isLegalWallPlacement(bestWall.r, bestWall.c, bestWall.orientation, botPlayerIndex, gameState).valid) {
          return { type: 'wall', ...bestWall };
        }
      }
    }

    // Best pawn move (prioritizes jumps when possible)
    let bestMove = legalPawnMoves[0];
    let bestDist = Infinity;
    for (const move of legalPawnMoves) {
      const simPlayer = { ...botPlayer, r: move.r, c: move.c };
      let d = getShortestPathToGoal(simPlayer, gameState.walls, boardSize);
      if (move.isJump) d -= 0.5; // Slight bias toward jumping opponent
      if (d < bestDist) {
        bestDist = d;
        bestMove = move;
      }
    }
    return { type: 'pawn', to: { r: bestMove.r, c: bestMove.c } };
  }

  // ──────────────────────────────────────────
  // 4. MAGNUS BOT (Rating 2300 - Master / Engine):
  // ──────────────────────────────────────────
  let bestScore = -Infinity;
  let chosenAction = null;

  // 1. Evaluate Pawn Moves
  for (const move of legalPawnMoves) {
    const simPlayer = { ...botPlayer, r: move.r, c: move.c };
    const myNewDist = getShortestPathToGoal(simPlayer, gameState.walls, boardSize);

    // Immediate win is infinite score
    if (myNewDist === 0) {
      return { type: 'pawn', to: { r: move.r, c: move.c } };
    }

    let score = (oppCurrentDist - myNewDist) * 16;
    if (move.isJump) score += 6; // Jumping opponent gains tempo

    if (score > bestScore) {
      bestScore = score;
      chosenAction = { type: 'pawn', to: { r: move.r, c: move.c } };
    }
  }

  // 2. Evaluate Candidate Wall Placements
  if (botPlayer.wallsLeft > 0) {
    const candidates = getCandidateWalls(primaryOpponent, botPlayerIndex, gameState, 24);

    for (const w of candidates) {
      const simWalls = [...gameState.walls, { id: 'sim', ...w, player: botPlayerIndex }];
      const myNewDist = getShortestPathToGoal(botPlayer, simWalls, boardSize);
      const oppNewDist = getShortestPathToGoal(primaryOpponent, simWalls, boardSize);

      const oppDelay = oppNewDist - oppCurrentDist;
      const mySelfHarm = myNewDist - myCurrentDist;

      // Penalize self harm and wasting walls
      const score = (oppDelay * 20) - (mySelfHarm * 30) + (botPlayer.wallsLeft * 2);

      if (oppDelay >= 2 && mySelfHarm <= 0 && score > bestScore) {
        if (isLegalWallPlacement(w.r, w.c, w.orientation, botPlayerIndex, gameState).valid) {
          bestScore = score;
          chosenAction = { type: 'wall', ...w };
        }
      }
    }
  }

  return chosenAction || { type: 'pawn', to: { r: legalPawnMoves[0].r, c: legalPawnMoves[0].c } };
}
