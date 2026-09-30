import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  BarChart3,
  TrendingUp,
  Brain,
  Award,
  Shield,
  Clock,
  Swords,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Eye,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { getMatchHistory, getTitleTierForRating } from '../logic/profile';
import { getPlayerStyle } from '../logic/pieceThemes';

/**
 * Normalizes move notation string (e.g. P1: e1-e2 -> e2, Wd8h -> h:d8-e8, preserves existing markings).
 */
function cleanMoveNotation(str) {
  if (!str) return '';
  let s = String(str).replace(/^P[1-4]:\s*/i, '').trim();

  // Extract any existing annotation in parens, e.g. (Brilliant 💎)
  let annotation = '';
  const parenMatch = s.match(/\((.*?)\)/);
  if (parenMatch) {
    annotation = ` (${parenMatch[1]})`;
    s = s.replace(/\(.*?\)/g, '').trim();
  }

  // If it's a pawn move range like e1-e2, simplify to e2
  const pawnRange = s.match(/^([a-i][1-9])-([a-i][1-9])$/i);
  if (pawnRange) {
    s = pawnRange[2];
  }

  // If it's a wall notation like Wd8h, convert to standard format h:d8-e8
  const wallMatch = s.match(/^W([a-i])([1-9])([hv])$/i);
  if (wallMatch) {
    const col = wallMatch[1].toLowerCase();
    const row = wallMatch[2];
    const ori = wallMatch[3].toLowerCase();
    if (ori === 'h') {
      const nextCol = String.fromCharCode(col.charCodeAt(0) + 1);
      s = `h:${col}${row}-${nextCol}${row}`;
    } else {
      const nextRow = Math.min(9, parseInt(row, 10) + 1);
      s = `v:${col}${row}-${col}${nextRow}`;
    }
  }

  // If it's a short wall notation like h:d4 or v:b6, expand to full coordinate range
  const shortWall = s.match(/^([hv]):([a-i])([1-9])$/i);
  if (shortWall) {
    const ori = shortWall[1].toLowerCase();
    const col = shortWall[2].toLowerCase();
    const row = shortWall[3];
    if (ori === 'h') {
      const nextCol = String.fromCharCode(col.charCodeAt(0) + 1);
      s = `h:${col}${row}-${nextCol}${row}`;
    } else {
      const nextRow = Math.min(9, parseInt(row, 10) + 1);
      s = `v:${col}${row}-${col}${nextRow}`;
    }
  }

  return `${s}${annotation}`;
}

/**
 * Extracts and annotates normalized move list with tactical markings (Brilliant 💎, Best ⭐, Inaccuracy ⚠️).
 */
function getMatchMoves(match) {
  if (!match) return [];
  let rawList = [];

  if (match.history && match.history.length > 0) {
    rawList = match.history.map((h) => (typeof h === 'string' ? h : h.notation || `${h.type}`));
  } else if (match.sampleMoves && match.sampleMoves.length > 0) {
    rawList = [...match.sampleMoves];
  } else {
    rawList = [
      'e2', 'e8', 'e3', 'e7', 'h:d4-e4 (Brilliant 💎)', 'd7', 'e4 (Best ⭐)', 'c7',
      'v:b6-b7 (Best ⭐)', 'b7', 'e5', 'a7', 'e6', 'a6', 'v:c5-c6 (Inaccuracy ⚠️)', 'b6',
      'e7 (Best ⭐)', 'b5', 'e8 (Brilliant 💎)', 'b4', 'e9 (Win 🏆)'
    ];
  }

  const cleaned = rawList.map(cleanMoveNotation);

  // If moves already have markings (like sampleMoves), keep them
  const hasAnnotations = cleaned.some((m) => m.includes('💎') || m.includes('⭐') || m.includes('⚠️') || m.includes('🏆'));
  if (hasAnnotations) {
    return cleaned;
  }

  // Otherwise, deterministically annotate moves based on match tactical statistics
  const brilliantCount = match.brilliant ?? (match.accuracy > 85 ? 2 : 1);
  const bestCount = match.best ?? Math.max(3, Math.floor(cleaned.length * 0.38));
  const mistakeCount = match.mistakes ?? (match.accuracy > 85 ? 1 : 2);

  const annotated = [...cleaned];
  const used = new Set();

  // Find wall moves indices
  const wallIndices = [];
  cleaned.forEach((m, idx) => {
    if (m.startsWith('h:') || m.startsWith('v:') || m.startsWith('W')) {
      wallIndices.push(idx);
    }
  });

  // 1. Assign Brilliant moves (prioritize critical wall placements)
  let bAssigned = 0;
  for (const idx of wallIndices) {
    if (bAssigned < brilliantCount && idx >= 2 && !used.has(idx)) {
      annotated[idx] += ' (Brilliant 💎)';
      used.add(idx);
      bAssigned++;
    }
  }
  for (let i = 4; i < annotated.length && bAssigned < brilliantCount; i += 6) {
    if (!used.has(i)) {
      annotated[i] += ' (Brilliant 💎)';
      used.add(i);
      bAssigned++;
    }
  }

  // 2. Assign Inaccuracies
  let mAssigned = 0;
  for (let i = 3; i < annotated.length && mAssigned < mistakeCount; i += 7) {
    if (!used.has(i)) {
      annotated[i] += ' (Inaccuracy ⚠️)';
      used.add(i);
      mAssigned++;
    }
  }

  // 3. Assign Best moves
  let bestAssigned = 0;
  for (let i = 0; i < annotated.length && bestAssigned < bestCount; i++) {
    if (!used.has(i) && (i % 2 === 0 || i % 3 === 0)) {
      annotated[i] += ' (Best ⭐)';
      used.add(i);
      bestAssigned++;
    }
  }

  // 4. Mark winning move for victorious games
  if (match.result === 'win' && annotated.length > 0) {
    const lastIdx = annotated.length - 1;
    if (!annotated[lastIdx].includes('🏆') && !annotated[lastIdx].includes('💎')) {
      annotated[lastIdx] = annotated[lastIdx].replace(/\s*\(.*?\)/, '') + ' (Win 🏆)';
    }
  }

  return annotated;
}

/**
 * Parses match move history and reconstructs board state (pawns & walls) at a given step.
 */
function reconstructMatchStateAtStep(match, targetStep) {
  const moves = getMatchMoves(match);

  let p1 = { r: 8, c: 4, wallsLeft: 10 };
  let p2 = { r: 0, c: 4, wallsLeft: 10 };
  let walls = [];
  let lastMove = null;

  for (let s = 0; s <= targetStep && s < moves.length; s++) {
    const raw = moves[s];
    const player = s % 2; // 0 = Player 1 (User / South), 1 = Player 2 (Opponent / North)

    // Check if raw is object with pre-recorded action
    if (typeof raw === 'object' && raw.action) {
      if (raw.action.type === 'pawn') {
        const dest = raw.action.to;
        if (player === 0) p1 = { ...p1, r: dest.r, c: dest.c };
        else p2 = { ...p2, r: dest.r, c: dest.c };
        lastMove = { type: 'pawn', r: dest.r, c: dest.c, player, notation: raw.notation || `${dest.r},${dest.c}`, step: s };
      } else if (raw.action.type === 'wall') {
        const safeR = Math.max(0, Math.min(7, raw.action.r));
        const safeC = Math.max(0, Math.min(7, raw.action.c));
        walls.push({
          id: `w-${s}-${safeR}-${safeC}`,
          r: safeR,
          c: safeC,
          orientation: raw.action.orientation,
          player,
          step: s,
        });
        if (player === 0) p1.wallsLeft = Math.max(0, p1.wallsLeft - 1);
        else p2.wallsLeft = Math.max(0, p2.wallsLeft - 1);
        lastMove = { type: 'wall', r: safeR, c: safeC, orientation: raw.action.orientation, player, notation: raw.notation, step: s };
      }
      continue;
    }

    // String notation parsing
    const str = String(raw);
    const clean = str.replace(/\(.*?\)/g, '').trim();

    // Check for wall: e.g. "h:d4-e4", "v:b6-b7", "Wd4h", "h:d4", "v:b6"
    const wallMatch = clean.match(/([hv]):([a-i])([1-9])/i) || clean.match(/W([a-i])([1-9])([hv])/i) || clean.match(/([hv])([a-i])([1-9])/i);
    if (wallMatch) {
      let orientation, colChar, rowChar;
      if (wallMatch[1].toLowerCase() === 'h' || wallMatch[1].toLowerCase() === 'v') {
        orientation = wallMatch[1].toLowerCase();
        colChar = wallMatch[2].toLowerCase();
        rowChar = wallMatch[3];
      } else {
        colChar = wallMatch[1].toLowerCase();
        rowChar = wallMatch[2];
        orientation = wallMatch[3].toLowerCase();
      }
      const rawC = colChar.charCodeAt(0) - 97;
      const rawR = 9 - parseInt(rowChar, 10);
      const safeR = Math.max(0, Math.min(7, rawR));
      const safeC = Math.max(0, Math.min(7, rawC));
      walls.push({
        id: `w-${s}-${safeR}-${safeC}-${orientation}`,
        r: safeR,
        c: safeC,
        orientation,
        player,
        step: s,
      });
      if (player === 0) p1.wallsLeft = Math.max(0, p1.wallsLeft - 1);
      else p2.wallsLeft = Math.max(0, p2.wallsLeft - 1);
      lastMove = { type: 'wall', r: safeR, c: safeC, orientation, player, notation: str, step: s };
      continue;
    }

    // Check for pawn destination like "e1-e2"
    const dashMatch = clean.match(/-([a-i])([1-9])/i);
    if (dashMatch) {
      const c = dashMatch[1].toLowerCase().charCodeAt(0) - 97;
      const r = 9 - parseInt(dashMatch[2], 10);
      if (player === 0) p1 = { ...p1, r, c };
      else p2 = { ...p2, r, c };
      lastMove = { type: 'pawn', r, c, player, notation: str, step: s };
      continue;
    }

    // Check for simple pawn move: e.g. "e2", "e8", "P1: e2"
    const pawnMatch = clean.match(/([a-i])([1-9])/i);
    if (pawnMatch) {
      const c = pawnMatch[1].toLowerCase().charCodeAt(0) - 97;
      const r = 9 - parseInt(pawnMatch[2], 10);
      if (player === 0) p1 = { ...p1, r, c };
      else p2 = { ...p2, r, c };
      lastMove = { type: 'pawn', r, c, player, notation: str, step: s };
    }
  }

  return { p1, p2, walls, lastMove, moves };
}

export default function StatsAnalysisModal({
  isOpen,
  onClose,
  userProfile,
  pieceTheme = 'gem',
  boardTheme = 'classic',
}) {
  const [activeTab, setActiveTab] = useState('matches'); // 'stats' | 'matches'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showBoardView, setShowBoardView] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Auto Playback Effect
  useEffect(() => {
    if (!isPlaying || !selectedMatch) return;
    const moves = getMatchMoves(selectedMatch);
    const totalMoves = moves.length;

    const interval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev >= totalMoves - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying, selectedMatch]);

  // Scroll active move pill into view
  useEffect(() => {
    const el = document.getElementById(`move-pill-${analysisStep}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [analysisStep]);

  if (!isOpen) return null;

  const wins = userProfile?.wins || 0;
  const losses = userProfile?.losses || 0;
  const draws = userProfile?.draws || 0;
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const drawRate = totalGames > 0 ? Math.round((draws / totalGames) * 100) : 0;
  const lossRate = totalGames > 0 ? Math.max(0, 100 - winRate - drawRate) : 0;
  const rating = userProfile?.rating || 400;
  const avatar = userProfile?.avatar || '👤';
  const name = userProfile?.name || 'Player';
  const tier = getTitleTierForRating(rating);
  const title = tier.title;

  const matches = getMatchHistory(userProfile);

  const handleOpenAnalysis = (match) => {
    setSelectedMatch(match);
    setAnalysisStep(0);
    setIsPlaying(false);
  };

  const handleCloseAnalysis = () => {
    setSelectedMatch(null);
    setAnalysisStep(0);
    setIsPlaying(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center ${
        isMaximized ? 'p-1 sm:p-2' : 'p-3 sm:p-4'
      } animate-in fade-in select-none`}
    >
      <div
        className={`bg-[#21201d] border border-[#3c3934] ${
          isMaximized
            ? 'rounded-xl w-[98vw] h-[96vh] max-w-[1550px]'
            : 'rounded-2xl w-full max-w-2xl max-h-[90vh]'
        } shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in zoom-in-95`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3c3934] flex items-center justify-between bg-[#272522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                Player Stats & Match Analysis
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#3c3934] text-amber-400">
                  {rating} ELO
                </span>
              </h2>
              <p className="text-[11px] text-[#9e9c98]">Play Online ranked match history, win rates & tactical insights</p>
            </div>
          </div>

          {/* Action buttons (Maximize to left of Close cross) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 rounded-lg bg-[#1b1a17] hover:bg-[#3c3934] border border-[#3c3934] hover:border-[#504c45] text-[#9e9c98] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title={isMaximized ? 'Restore Window' : 'Maximize Window'}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1b1a17] hover:bg-[#3c3934] border border-[#3c3934] hover:border-[#504c45] text-[#9e9c98] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (Hidden when analyzing a single match) */}
        {!selectedMatch && (
          <div className="px-5 pt-3 bg-[#21201d] border-b border-[#3c3934] flex gap-2">
            <button
              onClick={() => setActiveTab('matches')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-[#9e9c98] hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-cyan-400" />
              <span>Previous Matches ({matches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-[#9e9c98] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Career Stats Overview</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* VIEW A: SINGLE MATCH DEEP ANALYSIS */}
          {selectedMatch ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Back button & Match Heading */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseAnalysis}
                  className="px-2.5 py-1 rounded-lg bg-[#272522] hover:bg-[#3c3934] border border-[#3c3934] text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#9e9c98]" />
                  <span>Back to Matches</span>
                </button>
                <span className="text-xs text-[#9e9c98] font-mono">{selectedMatch.date}</span>
              </div>

              {/* Match Headline Banner */}
              <div className="p-4 rounded-xl bg-[#272522] border border-[#3c3934] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${
                      selectedMatch.result === 'win'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                        : selectedMatch.result === 'draw'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                        : 'bg-red-950/80 border-red-500 text-red-400'
                    }`}
                  >
                    {selectedMatch.result === 'win' ? 'WIN' : selectedMatch.result === 'draw' ? 'DRAW' : 'LOSS'}
                  </div>
                  <div>
                    <div className="text-xs text-[#9e9c98]">VS OPPONENT</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{selectedMatch.opponentAvatar}</span>
                      <span>{selectedMatch.opponent}</span>
                      <span className="text-[10px] text-amber-400 font-mono">({selectedMatch.opponentRating})</span>
                    </div>
                    <div className="text-[11px] text-[#9e9c98] mt-0.5">
                      {selectedMatch.mode} • {selectedMatch.movesCount} moves • {selectedMatch.duration}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#9e9c98]">ELO CHANGE</div>
                  <div
                    className={`text-lg font-mono font-extrabold ${
                      selectedMatch.ratingChange > 0
                        ? 'text-emerald-400'
                        : selectedMatch.ratingChange === 0
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedMatch.ratingChange > 0 ? `+${selectedMatch.ratingChange}` : selectedMatch.ratingChange}
                  </div>
                  <div className="text-[10px] text-[#666461] font-mono">Rating: {selectedMatch.ratingAfter}</div>
                </div>
              </div>

              {/* Accuracy & Tactical Move Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934] text-center">
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {selectedMatch.accuracy}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#9e9c98] mt-0.5">Accuracy</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1a17] border border-cyan-800/40 text-center">
                  <div className="text-xl font-black text-cyan-400 font-mono flex items-center justify-center gap-1">
                    <span>💎</span> {selectedMatch.brilliant ?? 1}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-cyan-300 mt-0.5">Brilliant Moves</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1a17] border border-emerald-800/40 text-center">
                  <div className="text-xl font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <span>⭐</span> {selectedMatch.best ?? 14}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-emerald-300 mt-0.5">Best Moves</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1a17] border border-amber-800/40 text-center">
                  <div className="text-xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                    <span>⚠️</span> {selectedMatch.mistakes ?? 2}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-amber-300 mt-0.5">Inaccuracies</div>
                </div>
              </div>

              {/* AI Coach Tactical Breakdown */}
              <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-600/60 flex items-center justify-center flex-shrink-0 text-cyan-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Coach Review & Key Takeaway
                  </div>
                  <p className="text-xs text-white/90 mt-1 leading-relaxed italic">
                    "{selectedMatch.coachTip || 'Solid spatial barricade awareness. Prioritize diagonal pawn jumps when opponents place adjacent blockers.'}"
                  </p>
                </div>
              </div>

              {/* Move-by-Move Algebraic Game Walkthrough & Interactive Visual Board */}
              {(() => {
                const moves = getMatchMoves(selectedMatch);
                const totalMoves = moves.length;
                const boardState = reconstructMatchStateAtStep(selectedMatch, analysisStep);
                const currentMoveText = moves[analysisStep] || 'Starting Position';
                const p1Style = getPlayerStyle(0, pieceTheme);
                const p2Style = getPlayerStyle(1, pieceTheme);

                return (
                  <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-3">
                    {/* Header Row: Title, 'View on Board' toggle button, and Step indicator */}
                    <div className="flex items-center justify-between text-xs text-[#9e9c98] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="text-white/90">MATCH MOVE RECORD</span>
                        <button
                          type="button"
                          onClick={() => setShowBoardView(!showBoardView)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                            showBoardView
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                              : 'bg-[#272522] text-[#9e9c98] border-[#3c3934] hover:text-white hover:bg-[#34312c]'
                          }`}
                          title="Toggle interactive visual board"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{showBoardView ? 'Hide Board' : 'View on Board'}</span>
                          {showBoardView && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </button>
                      </div>

                      <span className="font-mono text-[10px] text-emerald-400 font-bold bg-[#272522] px-2 py-0.5 rounded border border-[#3c3934]">
                        STEP {analysisStep + 1} OF {totalMoves}
                      </span>
                    </div>

                    {/* Content Section: 2-column in maximized mode, stacked in normal mode */}
                    <div className={isMaximized && showBoardView ? "grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" : "space-y-3"}>
                      {/* Left / Top: Interactive Visual Board */}
                      {showBoardView && (
                        <div className={isMaximized ? "lg:col-span-7" : ""}>
                          <div className="p-3 sm:p-4 rounded-xl bg-[#21201d] border border-[#3c3934] space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-150">
                            {/* Top Opponent (P2 / North) Info Bar */}
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{selectedMatch.opponentAvatar || '🦁'}</span>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{selectedMatch.opponent || 'Opponent'}</span>
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      ({selectedMatch.opponentRating || 1100})
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-800/60 font-bold">
                                      P2 (North)
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#9e9c98] font-mono bg-[#1b1a17] px-2.5 py-1 rounded-lg border border-[#3c3934]">
                                <span>Walls Left:</span>
                                <span className="font-bold text-white">{boardState.p2.wallsLeft}</span>
                                <span className="text-amber-500">🧱</span>
                              </div>
                            </div>

                            {/* Visual 9x9 Quoridor Board with Coordinate Labels */}
                            <div className={`relative mx-auto w-full ${isMaximized ? 'max-w-[420px] sm:max-w-[460px] lg:max-w-[490px]' : 'max-w-[320px] sm:max-w-[360px]'} aspect-square theme-${boardTheme}`}>
                              {/* File Coordinates (Top: a..i) */}
                              <div className="absolute -top-4 sm:-top-5 left-0 right-0 flex justify-around text-[9px] sm:text-[10px] font-bold text-[#666461] pointer-events-none font-mono">
                                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((c) => (
                                  <span key={c} className="w-5 text-center">{c}</span>
                                ))}
                              </div>

                              {/* Rank Coordinates (Left: 9..1) */}
                              <div className="absolute top-0 bottom-0 -left-4 sm:-left-5 flex flex-col justify-around text-[9px] sm:text-[10px] font-bold text-[#666461] pointer-events-none font-mono">
                                {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                                  <span key={r} className="h-5 flex items-center justify-center">{r}</span>
                                ))}
                              </div>

                              {/* Rank Coordinates (Right: 9..1) */}
                              <div className="absolute top-0 bottom-0 -right-4 sm:-right-5 flex flex-col justify-around text-[9px] sm:text-[10px] font-bold text-[#666461] pointer-events-none font-mono">
                                {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                                  <span key={r} className="h-5 flex items-center justify-center">{r}</span>
                                ))}
                              </div>

                              {/* File Coordinates (Bottom: a..i) */}
                              <div className="absolute -bottom-4 sm:-bottom-5 left-0 right-0 flex justify-around text-[9px] sm:text-[10px] font-bold text-[#666461] pointer-events-none font-mono">
                                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((c) => (
                                  <span key={c} className="w-5 text-center">{c}</span>
                                ))}
                              </div>

                              {/* 17x17 Grid Container */}
                              <div
                                className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-[#3c3934] relative"
                                style={{
                                  display: 'grid',
                                  gridTemplateRows: 'repeat(8, 1fr clamp(6px, 1.4vw, 9px)) 1fr',
                                  gridTemplateColumns: 'repeat(8, 1fr clamp(6px, 1.4vw, 9px)) 1fr',
                                  backgroundColor: 'var(--board-bg, #455933)',
                                }}
                              >
                                {/* 81 Cells */}
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((r) =>
                                  [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
                                    const gridRow = r * 2 + 1;
                                    const gridCol = c * 2 + 1;
                                    const isDarkSquare = (r + c) % 2 === 1;

                                    const isP1Here = boardState.p1.r === r && boardState.p1.c === c;
                                    const isP2Here = boardState.p2.r === r && boardState.p2.c === c;
                                    const isLastMoveDest =
                                      boardState.lastMove?.type === 'pawn' &&
                                      boardState.lastMove.r === r &&
                                      boardState.lastMove.c === c;

                                    return (
                                      <div
                                        key={`cell-${r}-${c}`}
                                        style={{
                                          gridRow: `${gridRow} / span 1`,
                                          gridColumn: `${gridCol} / span 1`,
                                          backgroundColor: isDarkSquare
                                            ? 'var(--cell-dark, #769656)'
                                            : 'var(--cell-light, #eeeed2)',
                                        }}
                                        className="relative flex items-center justify-center pointer-events-none"
                                      >
                                        {/* Last Move Destination Highlight */}
                                        {isLastMoveDest && (
                                          <div className="absolute inset-0 bg-emerald-400/30 border-2 border-emerald-400 pointer-events-none animate-pulse" />
                                        )}

                                        {/* Goal Line Indicator Line */}
                                        {r === 0 && (
                                          <div className="absolute top-0 inset-x-0 h-0.5 bg-red-400/40 pointer-events-none" />
                                        )}
                                        {r === 8 && (
                                          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400/40 pointer-events-none" />
                                        )}

                                        {/* Player 1 (User / South) Pawn */}
                                        {isP1Here && (
                                          <div
                                            className="relative w-[78%] h-[78%] rounded-full flex items-center justify-center pawn-shadow z-10 transition-transform duration-200 scale-105"
                                            style={{
                                              background: p1Style.gradient,
                                              boxShadow: `0 0 12px ${p1Style.wallGlow}, 0 4px 8px rgba(0, 0, 0, 0.6)`,
                                              border: `2.5px solid ${p1Style.ringColor || '#ffffff'}`,
                                            }}
                                            title={`${name} (P1)`}
                                          >
                                            {p1Style.icon ? (
                                              <span className="text-white text-xs sm:text-sm select-none drop-shadow font-serif">
                                                {p1Style.icon}
                                              </span>
                                            ) : (
                                              <div className="w-[45%] h-[45%] rounded-full border-2 border-white/60 bg-white/20 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Player 2 (Opponent / North) Pawn */}
                                        {isP2Here && (
                                          <div
                                            className="relative w-[78%] h-[78%] rounded-full flex items-center justify-center pawn-shadow z-10 transition-transform duration-200 scale-105"
                                            style={{
                                              background: p2Style.gradient,
                                              boxShadow: `0 0 12px ${p2Style.wallGlow}, 0 4px 8px rgba(0, 0, 0, 0.6)`,
                                              border: `2.5px solid ${p2Style.ringColor || '#ffffff'}`,
                                            }}
                                            title={`${selectedMatch.opponent || 'Opponent'} (P2)`}
                                          >
                                            {p2Style.icon ? (
                                              <span className="text-white text-xs sm:text-sm select-none drop-shadow font-serif">
                                                {p2Style.icon}
                                              </span>
                                            ) : (
                                              <div className="w-[45%] h-[45%] rounded-full border-2 border-white/60 bg-white/20 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}

                                {/* Placed Barricade Walls */}
                                {boardState.walls.map((w) => {
                                  const wallStyle = getPlayerStyle(w.player, pieceTheme);
                                  const isNewlyPlaced = w.step === analysisStep;

                                  if (w.orientation === 'h') {
                                    const startRow = w.r * 2 + 2;
                                    const startCol = w.c * 2 + 1;
                                    return (
                                      <div
                                        key={w.id}
                                        style={{
                                          gridRow: `${startRow} / span 1`,
                                          gridColumn: `${startCol} / span 3`,
                                          backgroundColor: wallStyle.color,
                                          backgroundImage: wallStyle.wallGradientH,
                                          borderColor: isNewlyPlaced ? '#ffffff' : wallStyle.wallBorder,
                                          boxShadow: isNewlyPlaced
                                            ? `0 0 12px ${wallStyle.wallGlow}, 0 0 6px #ffffff`
                                            : `0 2px 5px rgba(0, 0, 0, 0.6), 0 0 8px ${wallStyle.wallGlow}`,
                                        }}
                                        className={`z-20 rounded-sm wall-3d-h border pointer-events-none transition-all ${
                                          isNewlyPlaced ? 'ring-2 ring-white/90 animate-pulse' : ''
                                        }`}
                                      />
                                    );
                                  } else {
                                    const startRow = w.r * 2 + 1;
                                    const startCol = w.c * 2 + 2;
                                    return (
                                      <div
                                        key={w.id}
                                        style={{
                                          gridRow: `${startRow} / span 3`,
                                          gridColumn: `${startCol} / span 1`,
                                          backgroundColor: wallStyle.color,
                                          backgroundImage: wallStyle.wallGradientV,
                                          borderColor: isNewlyPlaced ? '#ffffff' : wallStyle.wallBorder,
                                          boxShadow: isNewlyPlaced
                                            ? `0 0 12px ${wallStyle.wallGlow}, 0 0 6px #ffffff`
                                            : `2px 2px 5px rgba(0, 0, 0, 0.6), 0 0 8px ${wallStyle.wallGlow}`,
                                        }}
                                        className={`z-20 rounded-sm wall-3d-v border pointer-events-none transition-all ${
                                          isNewlyPlaced ? 'ring-2 ring-white/90 animate-pulse' : ''
                                        }`}
                                      />
                                    );
                                  }
                                })}
                              </div>
                            </div>

                            {/* Bottom User (P1 / South) Info Bar */}
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{avatar}</span>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{name} (You)</span>
                                    <span className="text-[10px] text-amber-400 font-mono">({rating})</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                                      P1 (South)
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#9e9c98] font-mono bg-[#1b1a17] px-2.5 py-1 rounded-lg border border-[#3c3934]">
                                <span>Walls Left:</span>
                                <span className="font-bold text-white">{boardState.p1.wallsLeft}</span>
                                <span className="text-amber-500">🧱</span>
                              </div>
                            </div>

                            {/* Move Narrative Banner */}
                            <div className="p-2.5 rounded-lg bg-[#1b1a17] border border-[#3c3934] flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-emerald-400 font-bold font-mono">Move {analysisStep + 1}:</span>
                                <span className="font-mono font-bold text-white truncate">{currentMoveText}</span>
                              </div>
                              <div className="text-[11px] text-[#9e9c98] flex-shrink-0">
                                {analysisStep % 2 === 0 ? (
                                  <span className="text-emerald-400 font-semibold">{name}'s Turn</span>
                                ) : (
                                  <span className="text-cyan-400 font-semibold">{selectedMatch.opponent || 'Opponent'}'s Turn</span>
                                )}
                              </div>
                            </div>

                            {/* Playback Controls & Slider Scrubber */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-[#9e9c98]">1</span>
                                <input
                                  type="range"
                                  min="0"
                                  max={totalMoves - 1}
                                  value={analysisStep}
                                  onChange={(e) => {
                                    setAnalysisStep(parseInt(e.target.value, 10));
                                    setIsPlaying(false);
                                  }}
                                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#272522] rounded-lg"
                                />
                                <span className="text-[10px] font-mono text-[#9e9c98]">{totalMoves}</span>
                              </div>

                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setAnalysisStep(0);
                                    setIsPlaying(false);
                                  }}
                                  disabled={analysisStep === 0}
                                  title="First Move"
                                  className="p-1.5 rounded-lg bg-[#272522] hover:bg-[#34312c] disabled:opacity-30 text-white transition-all cursor-pointer"
                                >
                                  <SkipBack className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisStep((prev) => Math.max(0, prev - 1));
                                    setIsPlaying(false);
                                  }}
                                  disabled={analysisStep === 0}
                                  title="Previous Move"
                                  className="px-3 py-1.5 rounded-lg bg-[#272522] hover:bg-[#34312c] disabled:opacity-30 text-xs font-bold text-white transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  ◀ Prev
                                </button>
                                <button
                                  onClick={() => setIsPlaying(!isPlaying)}
                                  title={isPlaying ? 'Pause Auto Play' : 'Auto Play Match Moves'}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer ${
                                    isPlaying
                                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                                      : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                  }`}
                                >
                                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisStep((prev) => Math.min(totalMoves - 1, prev + 1));
                                    setIsPlaying(false);
                                  }}
                                  disabled={analysisStep >= totalMoves - 1}
                                  title="Next Move"
                                  className="px-3 py-1.5 rounded-lg bg-[#272522] hover:bg-[#34312c] disabled:opacity-30 text-xs font-bold text-white transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Next ▶
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisStep(totalMoves - 1);
                                    setIsPlaying(false);
                                  }}
                                  disabled={analysisStep >= totalMoves - 1}
                                  title="Last Move"
                                  className="p-1.5 rounded-lg bg-[#272522] hover:bg-[#34312c] disabled:opacity-30 text-white transition-all cursor-pointer"
                                >
                                  <SkipForward className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Right / Bottom: Move Pills Grid and Step Controls */}
                      <div className={isMaximized && showBoardView ? "lg:col-span-5 space-y-3" : "space-y-3"}>
                        {/* Move Pills Grid with Brilliant 💎, Best ⭐, Inaccuracy ⚠️ markings */}
                        <div
                          className={`flex flex-wrap gap-1.5 ${
                            isMaximized && showBoardView
                              ? 'h-[460px] max-h-[500px]'
                              : isMaximized
                              ? 'max-h-[65vh]'
                              : 'max-h-36'
                          } overflow-y-auto p-1.5 bg-[#21201d] rounded-lg border border-[#3c3934] scroll-smooth`}
                        >
                          {moves.map((mv, idx) => {
                            const isBrilliant = mv.includes('💎');
                            const isBest = mv.includes('⭐');
                            const isMistake = mv.includes('⚠️');
                            const isWin = mv.includes('🏆');
                            const isSelected = analysisStep === idx;

                            return (
                              <button
                                key={idx}
                                id={`move-pill-${idx}`}
                                onClick={() => {
                                  setAnalysisStep(idx);
                                  setIsPlaying(false);
                                }}
                                className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-[#00df81] text-black font-extrabold shadow-md scale-105 z-10 ring-2 ring-emerald-400'
                                    : isBrilliant
                                    ? 'bg-cyan-950/70 border border-cyan-500/70 text-cyan-300 hover:bg-cyan-900/70 shadow-sm'
                                    : isBest
                                    ? 'bg-emerald-950/50 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
                                    : isMistake
                                    ? 'bg-amber-950/50 border border-amber-600/50 text-amber-300 hover:bg-amber-900/60'
                                    : isWin
                                    ? 'bg-purple-950/60 border border-purple-500/60 text-purple-300 hover:bg-purple-900/60'
                                    : 'bg-[#272522] text-[#9e9c98] hover:text-white hover:bg-[#34312c]'
                                }`}
                              >
                                <span>{idx + 1}.</span>
                                <span>{mv}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Step Navigation Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            disabled={analysisStep === 0}
                            onClick={() => {
                              setAnalysisStep((prev) => Math.max(0, prev - 1));
                              setIsPlaying(false);
                            }}
                            className="px-3 py-1 rounded-md bg-[#272522] hover:bg-[#34312c] disabled:opacity-40 text-xs font-bold text-white transition-colors cursor-pointer"
                          >
                            ◀ Prev Move
                          </button>
                          <button
                            disabled={analysisStep >= totalMoves - 1}
                            onClick={() => {
                              setAnalysisStep((prev) => Math.min(totalMoves - 1, prev + 1));
                              setIsPlaying(false);
                            }}
                            className="px-3 py-1 rounded-md bg-[#272522] hover:bg-[#34312c] disabled:opacity-40 text-xs font-bold text-white transition-colors cursor-pointer"
                          >
                            Next Move ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : activeTab === 'matches' ? (
            /* VIEW B: PREVIOUS MATCHES LIST */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs text-[#9e9c98]">
                <span>Showing your recent strategy matches</span>
                <span className="font-mono text-emerald-400 font-bold">{matches.length} games recorded</span>
              </div>

              {matches.length === 0 ? (
                <div className="p-8 text-center bg-[#272522] rounded-2xl border border-[#3c3934] space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#1b1a17] border border-[#3c3934] mx-auto flex items-center justify-center text-3xl shadow-inner">
                    🧱
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No Match Records Yet</h3>
                    <p className="text-xs text-[#9e9c98] max-w-sm mx-auto leading-relaxed">
                      Play your first match in Play Online to begin recording your personal moves, tactical evaluations, and competitive Elo rating history!
                    </p>
                  </div>
                </div>
              ) : (
                matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] hover:border-[#504c45] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center border ${
                          m.result === 'win'
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/60'
                            : m.result === 'draw'
                            ? 'bg-amber-950/80 text-amber-400 border-amber-600/60'
                            : 'bg-red-950/80 text-red-400 border-red-600/60'
                        }`}
                      >
                        {m.result === 'win' ? 'WIN' : m.result === 'draw' ? 'DRAW' : 'LOSS'}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <span>{m.opponentAvatar}</span>
                          <span>{m.opponent}</span>
                          <span className="text-[10px] text-amber-400 font-mono font-normal">
                            ({m.opponentRating})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9e9c98] mt-0.5 flex items-center gap-2">
                          <span>{m.mode}</span>
                          <span>•</span>
                          <span>{m.movesCount} moves</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono font-semibold">{m.accuracy}% Acc</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#3c3934]">
                      <div className="text-right sm:text-right">
                        <div
                          className={`text-xs font-mono font-bold ${
                            m.ratingChange > 0
                              ? 'text-emerald-400'
                              : m.ratingChange === 0
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {m.ratingChange > 0 ? `+${m.ratingChange}` : m.ratingChange}
                        </div>
                        <div className="text-[10px] text-[#666461]">{m.date}</div>
                      </div>

                      <button
                        onClick={() => handleOpenAnalysis(m)}
                        title="Analyze this match"
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
                      >
                        <Brain className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Analyze</span>
                        <ChevronRight className="w-3 h-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* VIEW C: CAREER STATS OVERVIEW */
            <div className="space-y-4">
              {/* Profile Card Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#2b2926] to-[#21201d] border border-[#3c3934] flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center font-bold text-3xl shadow-lg border-2 border-white/20">
                    {avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white">{name}</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${tier.bgBadge}`}>
                        <span>{tier.icon}</span>
                        <span>{tier.title}</span>
                      </span>
                    </div>
                    <div className="text-xs text-[#9e9c98] mt-0.5">
                      Wallbreaker Tactical Competitor • {tier.name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#9e9c98] uppercase tracking-wide">Current Rating</div>
                  <div className="text-2xl font-black text-amber-400 font-mono">{rating}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{tier.name} Division</div>
                </div>
              </div>

              {/* Stats Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] text-center">
                  <div className="text-2xl font-extrabold text-white font-mono">{totalGames}</div>
                  <div className="text-[10px] font-bold text-[#9e9c98] uppercase mt-0.5">Games Played</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] text-center">
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">{wins}</div>
                  <div className="text-[10px] font-bold text-[#9e9c98] uppercase mt-0.5">Wins</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] text-center">
                  <div className="text-2xl font-extrabold text-red-400 font-mono">{losses}</div>
                  <div className="text-[10px] font-bold text-[#9e9c98] uppercase mt-0.5">Losses</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] text-center">
                  <div className="text-2xl font-extrabold text-amber-400 font-mono">{draws}</div>
                  <div className="text-[10px] font-bold text-[#9e9c98] uppercase mt-0.5">Draws</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] text-center col-span-2 sm:col-span-1">
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono">{winRate}%</div>
                  <div className="text-[10px] font-bold text-[#9e9c98] uppercase mt-0.5">Win Rate</div>
                </div>
              </div>

              {/* Match Outcomes Distribution Bar Gauge */}
              <div className="p-3.5 rounded-xl bg-[#272522] border border-[#3c3934] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Match Outcomes Distribution</span>
                  <span className="font-mono text-emerald-400">{winRate}% Win Rate</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#1b1a17] overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${winRate}%` }}
                    title={`Wins: ${wins} (${winRate}%)`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${drawRate}%` }}
                    title={`Draws: ${draws} (${drawRate}%)`}
                  />
                  <div
                    className="bg-red-500 h-full transition-all duration-500"
                    style={{ width: `${lossRate}%` }}
                    title={`Losses: ${losses} (${lossRate}%)`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#9e9c98] font-mono">
                  <span className="text-emerald-400">{wins} Won ({winRate}%)</span>
                  <span className="text-amber-400">{draws} Drawn ({drawRate}%)</span>
                  <span className="text-red-400">{losses} Lost ({lossRate}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
