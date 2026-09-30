import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createInitialGameState,
  applyMove,
  isLegalWallPlacement,
  getLegalPawnMoves,
  handlePlayerResign,
  MODES,
} from '../logic/gameEngine.js';
import { HUMAN_PERSONAS_POOL } from '../logic/personas.js';
import { mergeLeaderboardWithPersonas } from '../logic/personaLeaderboard.js';
import dotenv from 'dotenv';
import { supabaseAdmin } from './supabaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../dist');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

// CORS Configuration
const allowedOriginEnv = process.env.ALLOWED_ORIGIN;
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigin = allowedOriginEnv
  ? (allowedOriginEnv.includes(',') ? allowedOriginEnv.split(',').map((s) => s.trim()) : allowedOriginEnv)
  : (isProd ? false : '*');

app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json());

// Serve static frontend build
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin || true,
    methods: ['GET', 'POST'],
  },
});

// Authenticate all incoming Socket.io connections using Supabase Auth JWT
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      log('SOCKET_AUTH_REJECTED', { socketId: socket.id, reason: 'Authentication token required' });
      return next(new Error('Authentication token required'));
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      log('SOCKET_AUTH_REJECTED', { socketId: socket.id, reason: error?.message || 'Invalid authentication token' });
      return next(new Error('Invalid authentication token'));
    }

    socket.userId = user.id;
    socket.userEmail = user.email;
    log('SOCKET_AUTH_SUCCESS', { socketId: socket.id, userId: user.id });
    next();
  } catch (err) {
    log('SOCKET_AUTH_ERROR', { socketId: socket.id, error: err.message });
    return next(new Error('Authentication error'));
  }
});

const PORT = process.env.PORT || 3001;

// Active rooms map: roomCode -> RoomData
const rooms = new Map();

// Rate limiter: Map<socketId, { count: number, resetTime: number }>
const rateLimitMap = new Map();

function isRateLimited(socketId, maxAttempts = 5, windowMs = 10000) {
  const now = Date.now();
  const entry = rateLimitMap.get(socketId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(socketId, { count: 1, resetTime: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxAttempts;
}

// Structured Logger
function log(event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// Input Sanitization
function sanitizePlayerName(name) {
  if (typeof name !== 'string') return 'Player';
  const stripped = name.replace(/[<>{}[\]\\\/]/g, '').trim();
  const truncated = stripped.slice(0, 20);
  return truncated.length > 0 ? truncated : 'Player';
}

function sanitizeRoomCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').trim().slice(0, 10);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Authoritative Server-side Match Result & Rating Recording to Supabase
async function recordServerMatchResult(room, winnerIndex, winReason) {
  if (!room || room.hasRecordedResult) return;
  room.hasRecordedResult = true;

  // Only record real human-vs-human ranked matches with 2 players
  if (!room.isRanked || !Array.isArray(room.players) || room.players.length !== 2) {
    return;
  }

  const p0 = room.players[0];
  const p1 = room.players[1];

  if (!p0?.userId || !p1?.userId || p0.userId === p1.userId) {
    log('MATCH_RECORD_SKIPPED', { roomCode: room.code, reason: 'Invalid or identical player user IDs' });
    return;
  }

  try {
    // Fetch both player profiles from Supabase
    const { data: dbPlayers, error: fetchErr } = await supabaseAdmin
      .from('players')
      .select('*')
      .in('id', [p0.userId, p1.userId]);

    if (fetchErr || !dbPlayers || dbPlayers.length < 2) {
      log('MATCH_RECORD_ERROR', { roomCode: room.code, error: fetchErr?.message || 'Players not found in DB' });
      return;
    }

    const p0Db = dbPlayers.find((p) => p.id === p0.userId);
    const p1Db = dbPlayers.find((p) => p.id === p1.userId);

    if (!p0Db || !p1Db) {
      log('MATCH_RECORD_ERROR', { roomCode: room.code, error: 'Could not resolve both player rows' });
      return;
    }

    const r0 = p0Db.rating || 400;
    const r1 = p1Db.rating || 400;

    const isP0Winner = winnerIndex === 0;
    const isP1Winner = winnerIndex === 1;
    const isDraw = winnerIndex === null || winnerIndex === undefined;

    const score0 = isP0Winner ? 1 : isP1Winner ? 0 : 0.5;
    const score1 = 1 - score0;

    // Standard competitive Elo formula (K-factor = 32)
    const expected0 = 1 / (1 + Math.pow(10, (r1 - r0) / 400));
    const expected1 = 1 / (1 + Math.pow(10, (r0 - r1) / 400));

    const change0 = Math.round(32 * (score0 - expected0));
    const change1 = Math.round(32 * (score1 - expected1));

    const newR0 = Math.max(100, r0 + change0);
    const newR1 = Math.max(100, r1 + change1);

    const p0Update = {
      rating: newR0,
      peak_rating: Math.max(p0Db.peak_rating || newR0, newR0),
      wins: (p0Db.wins || 0) + (isP0Winner ? 1 : 0),
      losses: (p0Db.losses || 0) + (isP1Winner ? 1 : 0),
      draws: (p0Db.draws || 0) + (isDraw ? 1 : 0),
      games_played: (p0Db.games_played || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const p1Update = {
      rating: newR1,
      peak_rating: Math.max(p1Db.peak_rating || newR1, newR1),
      wins: (p1Db.wins || 0) + (isP1Winner ? 1 : 0),
      losses: (p1Db.losses || 0) + (isP0Winner ? 1 : 0),
      draws: (p1Db.draws || 0) + (isDraw ? 1 : 0),
      games_played: (p1Db.games_played || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const [res0, res1] = await Promise.all([
      supabaseAdmin.from('players').update(p0Update).eq('id', p0.userId),
      supabaseAdmin.from('players').update(p1Update).eq('id', p1.userId),
    ]);

    if (res0.error || res1.error) {
      log('MATCH_UPDATE_DB_ERROR', { error0: res0.error?.message, error1: res1.error?.message });
    } else {
      log('MATCH_RESULT_RECORDED_SUPABASE', {
        roomCode: room.code,
        winnerIndex,
        p0: { userId: p0.userId, oldRating: r0, newRating: newR0, change: change0 },
        p1: { userId: p1.userId, oldRating: r1, newRating: newR1, change: change1 },
      });

      // Broadcast authoritative match outcome to room participants
      io.to(room.code).emit('game:match_recorded', {
        winnerIndex,
        winReason,
        results: {
          [p0.userId]: { rating: newR0, change: change0 },
          [p1.userId]: { rating: newR1, change: change1 },
        },
      });
    }
  } catch (err) {
    log('MATCH_RECORD_EXCEPTION', { error: err.message, stack: err.stack });
  }
}

// Server-side Clock Interval
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.gameState.status === 'playing' && room.gameState.timeControl.time > 0) {
      const activeIdx = room.gameState.turn;
      if (room.lastTurnTime) {
        const elapsed = Math.floor((now - room.lastTurnTime) / 1000);
        if (elapsed >= 1) {
          room.gameState.timers[activeIdx] = Math.max(0, room.gameState.timers[activeIdx] - elapsed);
          room.lastTurnTime = now;
          room.lastActivity = now;

          if (room.gameState.timers[activeIdx] <= 0) {
            // Player ran out of time!
            const updatedState = handlePlayerResign(
              room.gameState,
              activeIdx,
              `${room.gameState.players[activeIdx]?.name || 'Player'} ran out of time!`
            );
            room.gameState = updatedState;

            if (room.gameState.status === 'ended') {
              room.endedAt = now;
              log('GAME_ENDED', {
                roomCode: code,
                winner: room.gameState.winner,
                winReason: room.gameState.winReason,
                mode: room.mode,
              });
              recordServerMatchResult(room, room.gameState.winner, room.gameState.winReason);
            }

            io.to(code).emit('game:state_update', room.gameState);
          } else {
            // Throttle clock broadcasts every second
            io.to(code).emit('game:timers_update', {
              timers: room.gameState.timers,
              turn: activeIdx,
            });
          }
        }
      } else {
        room.lastTurnTime = now;
      }
    }
  }
}, 1000);

// Room Cleanup Sweep (Runs every 60 seconds)
const SWEEP_INTERVAL_MS = 60_000;
const DISCONNECT_GRACE_MS = 2 * 60_000; // 2 minutes to allow reconnects
const ENDED_GAME_RETENTION_MS = 5 * 60_000; // 5 minutes retention after game over
const MAX_IDLE_ROOM_MS = 15 * 60_000; // 15 minutes max idle time

setInterval(() => {
  const now = Date.now();
  const activeSockets = io.sockets.sockets;

  for (const [code, room] of rooms.entries()) {
    // 1. Check if all joined players are disconnected
    const anyPlayerConnected = room.players.some((p) => activeSockets.has(p.socketId));
    if (!anyPlayerConnected) {
      if (!room.allDisconnectedAt) {
        room.allDisconnectedAt = now;
      } else if (now - room.allDisconnectedAt > DISCONNECT_GRACE_MS) {
        rooms.delete(code);
        log('ROOM_CLEANUP', { reason: 'all_players_disconnected_timeout', roomCode: code });
        continue;
      }
    } else {
      room.allDisconnectedAt = null;
    }

    // 2. Check if game has ended and exceeded retention grace period
    if (room.gameState.status === 'ended') {
      const endedTime = room.endedAt || room.lastActivity || room.createdAt;
      if (now - endedTime > ENDED_GAME_RETENTION_MS) {
        rooms.delete(code);
        log('ROOM_CLEANUP', { reason: 'ended_game_retention_timeout', roomCode: code });
        continue;
      }
    }

    // 3. Stale idle room cleanup
    if (now - (room.lastActivity || room.createdAt) > MAX_IDLE_ROOM_MS) {
      rooms.delete(code);
      log('ROOM_CLEANUP', { reason: 'max_idle_timeout', roomCode: code });
    }
  }
}, SWEEP_INTERVAL_MS);

// Matchmaking Queue for Play Online Quick Play
// Queue entry: { socketId, mode, timeControlKey, boardSize, player, timeoutId, queuedAt }
const matchmakingQueue = [];

// HUMAN_PERSONAS_POOL imported from ../logic/personas.js (300 personas)

function getTitleForRating(rating) {
  const r = typeof rating === 'number' ? rating : parseInt(rating, 10) || 400;
  if (r >= 2600) return 'CHAMPION';
  if (r >= 2300) return 'GM';
  if (r >= 2000) return 'IM';
  if (r >= 1700) return 'FM';
  if (r >= 1500) return 'NM';
  if (r >= 1300) return 'CM';
  if (r >= 1000) return 'TACTICIAN';
  if (r >= 700) return 'APPRENTICE';
  return 'NOVICE';
}

function removeFromMatchmakingQueue(socketId) {
  const idx = matchmakingQueue.findIndex((entry) => entry.socketId === socketId);
  if (idx !== -1) {
    const [removed] = matchmakingQueue.splice(idx, 1);
    if (removed.timeoutId) clearTimeout(removed.timeoutId);
    log('MATCHMAKING_LEFT', { socketId, mode: removed.mode });
    return removed;
  }
  return null;
}

io.on('connection', (socket) => {
  // Create Room
  socket.on('room:create', (payload = {}, callback) => {
    try {
      if (isRateLimited(socket.id, 5, 10000)) {
        log('RATE_LIMITED', { socketId: socket.id, action: 'room:create' });
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Too many requests. Please wait a moment.' });
        }
        return;
      }

      const { mode = MODES.CLASSIC, timeControlKey = 'RAPID_5', playerName = 'Player 1', boardSize = 9 } = payload;
      const cleanPlayerName = sanitizePlayerName(playerName);

      let code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }

      const gameState = createInitialGameState(mode, timeControlKey, boardSize);
      gameState.players[0].name = cleanPlayerName;

      const now = Date.now();
      const room = {
        code,
        hostId: socket.id,
        mode,
        timeControlKey,
        boardSize,
        gameState,
        createdAt: now,
        lastActivity: now,
        lastTurnTime: now,
        endedAt: null,
        allDisconnectedAt: null,
        isRanked: false,
        players: [{ socketId: socket.id, userId: socket.userId, playerIndex: 0, name: cleanPlayerName }],
        spectators: [],
        rematchRequests: new Set(),
      };

      rooms.set(code, room);
      socket.join(code);

      log('ROOM_CREATED', {
        roomCode: code,
        hostId: socket.id,
        userId: socket.userId,
        mode,
        timeControlKey,
        playerName: cleanPlayerName,
      });

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: code,
          playerIndex: 0,
          gameState,
        });
      }
    } catch (err) {
      log('ERROR', { event: 'room:create', socketId: socket.id, error: err.message, stack: err.stack });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to create room' });
      }
    }
  });

  // Join Room
  socket.on('room:join', (payload = {}, callback) => {
    try {
      if (isRateLimited(socket.id, 5, 10000)) {
        log('RATE_LIMITED', { socketId: socket.id, action: 'room:join' });
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Too many requests. Please wait a moment.' });
        }
        return;
      }

      const { roomCode, playerName = 'Guest' } = payload;
      const code = sanitizeRoomCode(roomCode);
      const cleanPlayerName = sanitizePlayerName(playerName);

      const room = rooms.get(code);
      if (!room) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Room not found' });
        }
        return;
      }

      const maxPlayers = room.mode === MODES.QUAD ? 4 : 2;
      let assignedIndex = -1;

      // Check if player is reconnecting
      const existing = room.players.find((p) => p.socketId === socket.id);
      if (existing) {
        assignedIndex = existing.playerIndex;
      } else if (room.players.length < maxPlayers) {
        assignedIndex = room.players.length;
        room.players.push({ socketId: socket.id, userId: socket.userId, playerIndex: assignedIndex, name: cleanPlayerName });
        room.gameState.players[assignedIndex].name = cleanPlayerName;

        // If 2 distinct authenticated human players in standard 2P mode, mark room as ranked
        if (
          room.players.length === 2 &&
          room.players[0].userId &&
          room.players[1].userId &&
          room.players[0].userId !== room.players[1].userId &&
          room.mode !== MODES.QUAD
        ) {
          room.isRanked = true;
        }
      } else {
        room.spectators.push({ socketId: socket.id, userId: socket.userId, name: cleanPlayerName });
      }

      room.lastActivity = Date.now();
      room.allDisconnectedAt = null;
      socket.join(code);

      log('ROOM_JOINED', {
        roomCode: code,
        socketId: socket.id,
        playerName: cleanPlayerName,
        playerIndex: assignedIndex,
        isSpectator: assignedIndex === -1,
      });

      // If all required players joined and game was not started, reset clock reference
      if (room.players.length === maxPlayers && room.gameState.status === 'playing') {
        room.lastTurnTime = Date.now();
      }

      io.to(code).emit('game:state_update', room.gameState);

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: code,
          playerIndex: assignedIndex,
          gameState: room.gameState,
          isSpectator: assignedIndex === -1,
        });
      }
    } catch (err) {
      log('ERROR', { event: 'room:join', socketId: socket.id, error: err.message, stack: err.stack });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to join room' });
      }
    }
  });

  // Authoritative Move Execution
  socket.on('game:move', (payload = {}, callback) => {
    try {
      const { roomCode, action, playerIndex } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);

      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }

      // Verify turn authorization
      if (room.gameState.turn !== playerIndex) {
        if (typeof callback === 'function') callback({ success: false, error: 'Not your turn' });
        return;
      }

      // Check socket authenticity
      const playerRecord = room.players.find((p) => p.playerIndex === playerIndex);
      if (!playerRecord || playerRecord.socketId !== socket.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized move for this player slot' });
        return;
      }

      // Execute move via authoritative game engine
      const result = applyMove(room.gameState, action);
      if (!result.success) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        return;
      }

      room.gameState = result.state;
      const now = Date.now();
      room.lastTurnTime = now;
      room.lastActivity = now;

      if (room.gameState.status === 'ended') {
        room.endedAt = now;
        log('GAME_ENDED', {
          roomCode: code,
          winner: room.gameState.winner,
          winReason: room.gameState.winReason,
          mode: room.mode,
        });
        recordServerMatchResult(room, room.gameState.winner, room.gameState.winReason);
      }

      // Broadcast updated state to all participants in room
      io.to(code).emit('game:state_update', room.gameState);

      if (typeof callback === 'function') {
        callback({ success: true, gameState: room.gameState });
      }
    } catch (err) {
      log('ERROR', { event: 'game:move', socketId: socket.id, error: err.message, stack: err.stack });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Error executing move' });
      }
    }
  });

  // Resign
  socket.on('game:resign', (payload = {}) => {
    try {
      const { roomCode, playerIndex } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);
      if (!room || room.gameState.status !== 'playing') return;

      const now = Date.now();
      const updatedState = handlePlayerResign(room.gameState, playerIndex);
      room.gameState = updatedState;
      if (room.gameState.status === 'ended') {
        room.endedAt = now;
        log('GAME_ENDED', {
          roomCode: code,
          winner: room.gameState.winner,
          winReason: room.gameState.winReason,
          mode: room.mode,
        });
        recordServerMatchResult(room, room.gameState.winner, room.gameState.winReason);
      }
      room.lastActivity = now;

      io.to(code).emit('game:state_update', room.gameState);
    } catch (err) {
      log('ERROR', { event: 'game:resign', socketId: socket.id, error: err.message });
    }
  });

  // Draw Offer
  socket.on('game:draw_offer', (payload = {}) => {
    try {
      const { roomCode, playerIndex } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);
      if (!room || room.gameState.status !== 'playing') return;

      socket.to(code).emit('game:draw_offered', {
        fromPlayerIndex: playerIndex,
        playerName: room.gameState.players[playerIndex]?.name || 'Opponent',
      });
    } catch (err) {
      log('ERROR', { event: 'game:draw_offer', socketId: socket.id, error: err.message });
    }
  });

  // Draw Accept
  socket.on('game:draw_accept', (payload = {}) => {
    try {
      const { roomCode } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);
      if (!room || room.gameState.status !== 'playing') return;

      room.gameState.status = 'ended';
      room.gameState.winner = null;
      room.gameState.winReason = 'Game drawn by mutual agreement.';
      room.endedAt = Date.now();
      recordServerMatchResult(room, null, room.gameState.winReason);

      io.to(code).emit('game:state_update', room.gameState);
      io.to(code).emit('game:draw_accepted');
    } catch (err) {
      log('ERROR', { event: 'game:draw_accept', socketId: socket.id, error: err.message });
    }
  });

  // Draw Decline
  socket.on('game:draw_decline', (payload = {}) => {
    try {
      const { roomCode } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);
      if (!room) return;

      socket.to(code).emit('game:draw_declined');
    } catch (err) {
      log('ERROR', { event: 'game:draw_decline', socketId: socket.id, error: err.message });
    }
  });

  // Rematch
  socket.on('game:rematch', (payload = {}) => {
    try {
      const { roomCode } = payload;
      const code = sanitizeRoomCode(roomCode);
      const room = rooms.get(code);
      if (!room) return;

      room.rematchRequests.add(socket.id);
      const requiredRequests = room.players.length;

      room.lastActivity = Date.now();

      if (room.rematchRequests.size >= requiredRequests) {
        // Start rematch with fresh game state
        room.rematchRequests.clear();
        room.gameState = createInitialGameState(room.mode, room.timeControlKey, room.boardSize || 9);
        // Retain player names
        room.players.forEach((p) => {
          if (room.gameState.players[p.playerIndex]) {
            room.gameState.players[p.playerIndex].name = p.name;
          }
        });
        room.lastTurnTime = Date.now();
        room.endedAt = null;
        io.to(code).emit('game:state_update', room.gameState);
        io.to(code).emit('game:rematch_started');
      } else {
        io.to(code).emit('game:rematch_requested', { requestedBy: socket.id });
      }
    } catch (err) {
      log('ERROR', { event: 'game:rematch', socketId: socket.id, error: err.message });
    }
  });

  // Reaction Broadcast
  socket.on('game:reaction', (payload = {}) => {
    try {
      const { roomCode, reaction } = payload;
      const code = sanitizeRoomCode(roomCode);
      if (!code || !rooms.has(code)) return;
      io.to(code).emit('game:reaction', { reaction });
    } catch (err) {
      log('ERROR', { event: 'game:reaction', socketId: socket.id, error: err.message });
    }
  });

  // Matchmaking: Find Opponent
  socket.on('matchmaking:find', (payload = {}, callback) => {
    try {
      if (isRateLimited(socket.id, 10, 5000)) {
        log('RATE_LIMITED', { socketId: socket.id, action: 'matchmaking:find' });
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Too many requests. Please wait a moment.' });
        }
        return;
      }

      removeFromMatchmakingQueue(socket.id);

      const mode = payload.mode || MODES.CLASSIC;
      const timeControlKey = payload.timeControlKey || 'BLITZ_3';
      const boardSize = payload.boardSize || 9;
      const cleanPlayerName = sanitizePlayerName(payload.player?.name || 'Player');
      const playerRating = Number(payload.player?.rating) || 400;
      const playerAvatar = payload.player?.avatar || '👤';
      const playerTitle = payload.player?.title || getTitleForRating(playerRating);
      const playerCountry = payload.player?.country || '🌐';

      // For 2-player modes (Classic, Race): check if another real player is in queue with matching mode & boardSize
      const waitingIdx = matchmakingQueue.findIndex((entry) =>
        entry.socketId !== socket.id &&
        entry.mode === mode &&
        (entry.boardSize || 9) === (boardSize || 9)
      );

      if (waitingIdx !== -1 && mode !== MODES.QUAD) {
        // MATCH FOUND with real human player!
        const [waitingOpponent] = matchmakingQueue.splice(waitingIdx, 1);
        if (waitingOpponent.timeoutId) clearTimeout(waitingOpponent.timeoutId);

        let code = generateRoomCode();
        while (rooms.has(code)) {
          code = generateRoomCode();
        }

        const cleanP1Name = sanitizePlayerName(waitingOpponent.player?.name || 'Player 1');
        const p1Rating = waitingOpponent.player?.rating || 400;
        const p1Avatar = waitingOpponent.player?.avatar || '👤';
        const p1Title = waitingOpponent.player?.title || getTitleForRating(p1Rating);
        const p1Country = waitingOpponent.player?.country || '🌐';

        const gameState = createInitialGameState(mode, timeControlKey, boardSize);
        gameState.players[0].name = `${cleanP1Name} (${p1Rating})`;
        gameState.players[0].rating = p1Rating;
        gameState.players[0].avatar = p1Avatar;
        gameState.players[0].country = p1Country;
        gameState.players[0].title = p1Title;

        gameState.players[1].name = `${cleanPlayerName} (${playerRating})`;
        gameState.players[1].rating = playerRating;
        gameState.players[1].avatar = playerAvatar;
        gameState.players[1].country = playerCountry;
        gameState.players[1].title = playerTitle;

        const now = Date.now();
        const room = {
          code,
          hostId: waitingOpponent.socketId,
          mode,
          timeControlKey,
          boardSize,
          gameState,
          createdAt: now,
          lastActivity: now,
          lastTurnTime: now,
          endedAt: null,
          allDisconnectedAt: null,
          isRanked: true,
          players: [
            { socketId: waitingOpponent.socketId, userId: waitingOpponent.userId, playerIndex: 0, name: cleanP1Name },
            { socketId: socket.id, userId: socket.userId, playerIndex: 1, name: cleanPlayerName },
          ],
          spectators: [],
          rematchRequests: new Set(),
        };

        rooms.set(code, room);

        const sock1 = io.sockets.sockets.get(waitingOpponent.socketId);
        if (sock1) sock1.join(code);
        socket.join(code);

        log('MATCHMAKING_SUCCESS_REAL', {
          roomCode: code,
          mode,
          player1: waitingOpponent.socketId,
          player2: socket.id,
        });

        // Notify Player 1 (waiting opponent)
        if (sock1) {
          sock1.emit('matchmaking:matched', {
            isRealPlayer: true,
            roomCode: code,
            playerIndex: 0,
            gameState,
            opponent: {
              name: cleanPlayerName,
              rating: playerRating,
              avatar: playerAvatar,
              title: playerTitle,
              country: playerCountry,
            },
          });
        }

        // Notify Player 2 (current joining socket)
        socket.emit('matchmaking:matched', {
          isRealPlayer: true,
          roomCode: code,
          playerIndex: 1,
          gameState,
          opponent: {
            name: cleanP1Name,
            rating: p1Rating,
            avatar: p1Avatar,
            title: p1Title,
            country: p1Country,
          },
        });

        if (typeof callback === 'function') {
          callback({ success: true, matched: true, isRealPlayer: true, roomCode: code });
        }
        return;
      }

      // No compatible real opponent currently waiting -> Queue user and wait 4.8 seconds for a real opponent
      const timeoutId = setTimeout(() => {
        removeFromMatchmakingQueue(socket.id);

        // Fallback: match with AI engine, but portray completely as a real human player!
        const persona = HUMAN_PERSONAS_POOL[Math.floor(Math.random() * HUMAN_PERSONAS_POOL.length)];
        const ratingDelta = Math.floor(Math.random() * 70) - 35;
        const oppRating = Math.max(100, playerRating + ratingDelta);

        const opponent = {
          name: persona.name,
          avatar: persona.avatar,
          country: persona.country,
          rating: oppRating,
          title: getTitleForRating(oppRating),
        };

        log('MATCHMAKING_FALLBACK_AI', {
          socketId: socket.id,
          mode,
          opponentName: opponent.name,
          opponentRating: oppRating,
        });

        socket.emit('matchmaking:matched', {
          isRealPlayer: false,
          opponent,
          mode,
          timeControlKey,
          boardSize,
        });
      }, 4800);

      matchmakingQueue.push({
        socketId: socket.id,
        userId: socket.userId,
        mode,
        timeControlKey,
        boardSize,
        player: {
          name: cleanPlayerName,
          rating: playerRating,
          avatar: playerAvatar,
          title: playerTitle,
          country: playerCountry,
        },
        timeoutId,
        queuedAt: Date.now(),
      });

      log('MATCHMAKING_QUEUED', { socketId: socket.id, mode, queueLength: matchmakingQueue.length });

      if (typeof callback === 'function') {
        callback({ success: true, queued: true });
      }
    } catch (err) {
      log('ERROR', { event: 'matchmaking:find', socketId: socket.id, error: err.message, stack: err.stack });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Matchmaking error' });
      }
    }
  });

  // Matchmaking: Cancel
  socket.on('matchmaking:cancel', () => {
    removeFromMatchmakingQueue(socket.id);
  });

  // Disconnect
  socket.on('disconnect', () => {
    try {
      rateLimitMap.delete(socket.id);
      removeFromMatchmakingQueue(socket.id);

      for (const [code, room] of rooms.entries()) {
        const idx = room.players.findIndex((p) => p.socketId === socket.id);
        if (idx !== -1) {
          const disconnectedPlayerIndex = room.players[idx].playerIndex;
          io.to(code).emit('player:disconnected', { playerIndex: disconnectedPlayerIndex });

          // If game is in progress, treat player disconnect as an immediate forfeit (loss)
          if (room.gameState && room.gameState.status === 'playing') {
            const playerName = room.gameState.players[disconnectedPlayerIndex]?.name || 'Player';
            const updatedState = handlePlayerResign(
              room.gameState,
              disconnectedPlayerIndex,
              `${playerName} disconnected (forfeit).`
            );
            room.gameState = updatedState;
            room.endedAt = Date.now();
            recordServerMatchResult(room, room.gameState.winner, room.gameState.winReason);
            io.to(code).emit('game:state_update', room.gameState);
            log('PLAYER_FORFEIT_DISCONNECT', {
              roomCode: code,
              disconnectedPlayerIndex,
              winner: room.gameState.winner,
            });
          }
        }
      }
    } catch (err) {
      log('ERROR', { event: 'disconnect', socketId: socket.id, error: err.message });
    }
  });
});

// Expanded Health and Observability Endpoint
app.get('/api/health', (req, res) => {
  let activeGames = 0;
  for (const room of rooms.values()) {
    if (room.gameState && room.gameState.status === 'playing') {
      activeGames++;
    }
  }

  const connectedSockets = io.engine ? io.engine.clientsCount : io.sockets.sockets.size;

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connectedSockets,
    activeGames,
    totalRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// Real Top 100 Leaderboard REST endpoint (Merges real players with 300 AI Personas)
app.get('/api/leaderboard', async (req, res) => {
  try {
    let dbPlayers = [];
    if (supabaseAdmin) {
      const { data: players, error } = await supabaseAdmin
        .from('players')
        .select('id, display_name, avatar, country, rating, peak_rating, wins, losses, draws, games_played')
        .order('rating', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(players)) {
        dbPlayers = players;
      }
    }

    const merged = mergeLeaderboardWithPersonas(dbPlayers);
    res.json({ success: true, players: merged });
  } catch (err) {
    log('ERROR', { event: 'api:leaderboard', error: err.message });
    const fallback = mergeLeaderboardWithPersonas([]);
    res.json({ success: true, players: fallback });
  }
});

// Authoritative Match Result Recording Endpoint for Online Play (vs AI Personas or 1v1)
app.post('/api/match/record', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ success: false, error: 'Invalid auth token' });
    }

    const { matchType = 'online', opponentRating = 400, isWin, isLoss, isDraw } = req.body;

    // Fetch player profile from database
    const { data: playerRow, error: fetchErr } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) {
      log('MATCH_RECORD_FETCH_ERROR', { error: fetchErr.message });
    }

    const currentRating = playerRow?.rating || 400;
    const currentWins = playerRow?.wins || 0;
    const currentLosses = playerRow?.losses || 0;
    const currentDraws = playerRow?.draws || 0;
    const currentGames = playerRow?.games_played || 0;

    let ratingChange = 0;
    let newRating = currentRating;

    if (matchType === 'online') {
      const actualScore = isWin ? 1 : isLoss ? 0 : 0.5;
      const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
      ratingChange = Math.round(32 * (actualScore - expectedScore));
      newRating = Math.max(100, currentRating + ratingChange);
    }

    const updatedWins = currentWins + (isWin ? 1 : 0);
    const updatedLosses = currentLosses + (isLoss ? 1 : 0);
    const updatedDraws = currentDraws + (isDraw ? 1 : 0);
    const updatedGames = currentGames + 1;
    const updatedPeak = Math.max(playerRow?.peak_rating || newRating, newRating);

    if (playerRow) {
      const { error: updateErr } = await supabaseAdmin
        .from('players')
        .update({
          rating: newRating,
          peak_rating: updatedPeak,
          wins: updatedWins,
          losses: updatedLosses,
          draws: updatedDraws,
          games_played: updatedGames,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateErr) {
        log('MATCH_RECORD_UPDATE_ERROR', { error: updateErr.message });
      }
    }

    log('MATCH_RECORDED_SUCCESS', {
      userId: user.id,
      matchType,
      isWin,
      isLoss,
      ratingChange,
      newRating,
    });

    res.json({
      success: true,
      ratingChange,
      newRating,
      wins: updatedWins,
      losses: updatedLosses,
      draws: updatedDraws,
      gamesPlayed: updatedGames,
    });
  } catch (err) {
    log('ERROR', { event: 'api:match_record', error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// One-time legacy profile migration endpoint for fresh accounts
app.post('/api/profile/migrate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ success: false, error: 'Invalid auth token' });
    }

    const { data: playerRow, error: fetchErr } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchErr || !playerRow) {
      return res.status(404).json({ success: false, error: 'Player profile not found' });
    }

    // Only allow migration if row is at fresh defaults
    const isFresh =
      playerRow.rating === 400 &&
      (playerRow.games_played || 0) === 0 &&
      (playerRow.wins || 0) === 0 &&
      (playerRow.losses || 0) === 0;

    if (!isFresh) {
      return res.json({ success: true, message: 'Profile already established, migration skipped', profile: playerRow });
    }

    const { rating, wins, losses, draws, displayName, avatar, country } = req.body;

    const updatePayload = {
      rating: typeof rating === 'number' ? rating : 400,
      peak_rating: typeof rating === 'number' ? rating : 400,
      wins: typeof wins === 'number' ? wins : 0,
      losses: typeof losses === 'number' ? losses : 0,
      draws: typeof draws === 'number' ? draws : 0,
      games_played: (wins || 0) + (losses || 0) + (draws || 0),
      updated_at: new Date().toISOString(),
    };

    if (displayName && typeof displayName === 'string') {
      const cleanName = displayName.replace(/[<>{}[\]\\\/]/g, '').trim().slice(0, 20);
      if (cleanName.length >= 2) {
        updatePayload.display_name = cleanName;
      }
    }
    if (avatar) updatePayload.avatar = avatar;
    if (country) updatePayload.country = country;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('players')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    log('PROFILE_MIGRATED', { userId: user.id, rating: updated.rating, games: updated.games_played });
    res.json({ success: true, profile: updated });
  } catch (err) {
    log('ERROR', { event: 'api:profile_migrate', error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all route to serve index.html for client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

server.listen(PORT, () => {
  console.log(`Wallbreaker Server running on port ${PORT} (Single Service Production Ready)`);
});
