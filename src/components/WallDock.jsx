import React from 'react';
import { Shield, RotateCw, Check, GripHorizontal, GripVertical } from 'lucide-react';
import { soundManager } from '../utils/audio';

export default function WallDock({
  wallsLeft,
  activeOrientation,
  onSelectOrientation,
  isMyTurn,
  disabled = false,
  onDragStartWall,
}) {
  const handleSelect = (orientation) => {
    soundManager.playTick();
    onSelectOrientation(orientation);
  };

  const handleDragStart = (e, orientation) => {
    if (!isMyTurn || wallsLeft <= 0 || disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', orientation);
    e.dataTransfer.effectAllowed = 'copyMove';
    if (onDragStartWall) {
      onDragStartWall(orientation);
    }
  };

  const toggleOrientation = () => {
    handleSelect(activeOrientation === 'h' ? 'v' : 'h');
  };

  return (
    <div className="p-3 bg-[#21201d] rounded-2xl border border-[#3c3934] shadow-xl select-none space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
            Wall Placement Dock
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Rotate Shortcut Button */}
          <button
            type="button"
            onClick={toggleOrientation}
            title="Rotate Wall Orientation (Key: R)"
            className="p-1 rounded-md bg-[#2b2926] hover:bg-[#3c3934] text-[#9e9c98] hover:text-white border border-[#3c3934] flex items-center gap-1 text-[10px] font-mono transition-colors"
          >
            <RotateCw className="w-3 h-3 text-amber-400" />
            <span>R</span>
          </button>

          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-[#9e9c98]">Walls:</span>
            <span className="font-extrabold text-amber-400 bg-[#2b2926] px-2 py-0.5 rounded border border-[#3c3934]">
              {wallsLeft}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#9e9c98]">
        Select wall type to place by tapping board grooves, or drag directly onto the grid:
      </p>

      {/* Two Draggable Wall Options: Horizontal & Vertical */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Horizontal Wall Option */}
        <div
          draggable={isMyTurn && wallsLeft > 0 && !disabled}
          onDragStart={(e) => handleDragStart(e, 'h')}
          onClick={() => handleSelect('h')}
          className={`group p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all flex flex-col items-center justify-center gap-2 relative ${
            activeOrientation === 'h'
              ? 'bg-[#2b2926] border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/15'
              : 'bg-[#272522] border-[#3c3934] hover:border-[#504c45] hover:bg-[#2b2926]'
          } ${wallsLeft <= 0 || !isMyTurn ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {/* Active check badge */}
          {activeOrientation === 'h' && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-black flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider">
              <Check className="w-3 h-3" /> ACTIVE
            </span>
          )}

          {/* Visual 3D Horizontal Wall Preview */}
          <div className="w-full h-8 flex items-center justify-center">
            <div
              className="w-24 h-3.5 rounded-[3px] wall-3d-h border border-amber-700 shadow-md transition-transform group-hover:scale-105"
              style={{
                backgroundImage: 'linear-gradient(180deg, #fbbf24 0%, #d97706 50%, #92400e 100%)',
              }}
            />
          </div>

          <div className="text-center">
            <span className="text-xs font-extrabold text-white block">Horizontal Wall [ ── ]</span>
            <span className="text-[10px] text-[#9e9c98] font-mono">Spans 2 Cells Across</span>
          </div>

          <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
            DRAG OR TAP
          </span>
        </div>

        {/* 2. Vertical Wall Option */}
        <div
          draggable={isMyTurn && wallsLeft > 0 && !disabled}
          onDragStart={(e) => handleDragStart(e, 'v')}
          onClick={() => handleSelect('v')}
          className={`group p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all flex flex-col items-center justify-center gap-2 relative ${
            activeOrientation === 'v'
              ? 'bg-[#2b2926] border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/15'
              : 'bg-[#272522] border-[#3c3934] hover:border-[#504c45] hover:bg-[#2b2926]'
          } ${wallsLeft <= 0 || !isMyTurn ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {/* Active check badge */}
          {activeOrientation === 'v' && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-cyan-400 text-black flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider">
              <Check className="w-3 h-3" /> ACTIVE
            </span>
          )}

          {/* Visual 3D Vertical Wall Preview */}
          <div className="w-full h-8 flex items-center justify-center">
            <div
              className="w-3.5 h-8 rounded-[3px] wall-3d-v border border-cyan-700 shadow-md transition-transform group-hover:scale-105"
              style={{
                backgroundImage: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
              }}
            />
          </div>

          <div className="text-center">
            <span className="text-xs font-extrabold text-white block">Vertical Wall [ │ ]</span>
            <span className="text-[10px] text-[#9e9c98] font-mono">Spans 2 Cells Down</span>
          </div>

          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            DRAG OR TAP
          </span>
        </div>
      </div>
    </div>
  );
}
