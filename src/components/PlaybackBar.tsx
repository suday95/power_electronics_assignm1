import React from 'react';
import { Gauge, Pause, Play, RotateCcw, StepBack, StepForward, Compass } from 'lucide-react';

interface PlaybackBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: (deltaDeg: number) => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  angle: number;
  span: number;
  freq: number;
  alpha: number | null;
  onScrub: (angle: number) => void;
}

const SPEEDS = [0.05, 0.1, 0.25, 0.5, 1, 2];

const iconBtn =
  'px-2.5 py-2 text-xs font-mono text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors active:scale-95';

export const PlaybackBar: React.FC<PlaybackBarProps> = React.memo(
  ({ isPlaying, onTogglePlay, onStep, onReset, speed, onSpeedChange, angle, span, freq, alpha, onScrub }) => {
    const a = angle % span;
    const rad = (a * Math.PI) / 180;
    const ms = (a / 360) * (1000 / freq);

    return (
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause simulation' : 'Run simulation'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Run'}
            </button>
            <button onClick={() => onStep(-15)} className={iconBtn} title="Step back 15°"><StepBack className="w-4 h-4" /></button>
            <button onClick={() => onStep(-1)} className={iconBtn} title="Step back 1°">−1°</button>
            <button onClick={() => onStep(1)} className={iconBtn} title="Step forward 1°">+1°</button>
            <button onClick={() => onStep(15)} className={iconBtn} title="Step forward 15°"><StepForward className="w-4 h-4" /></button>
            <button onClick={onReset} className={iconBtn} title="Reset angle to 0°" aria-label="Reset angle"><RotateCcw className="w-4 h-4" /></button>
            {alpha !== null && (
              <span className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">α = {alpha}°</span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="2"
              step="0.05"
              value={speed}
              onChange={e => onSpeedChange(parseFloat(e.target.value))}
              aria-label="Animation speed"
              className="w-28 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 min-w-[48px] text-center">
              {speed.toFixed(2)}x
            </span>
            <div className="flex items-center gap-1">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                    Math.abs(speed - s) < 0.001
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold whitespace-nowrap">
            <Compass className="w-4 h-4" />
            <span>Electrical angle ωt</span>
          </div>
          <input
            type="range"
            min="0"
            max={span}
            step="0.25"
            value={a}
            onChange={e => onScrub(parseFloat(e.target.value))}
            aria-label="Electrical angle"
            className="flex-1 min-w-[140px] accent-cyan-400 cursor-pointer"
          />
          <div className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-1 rounded border border-cyan-500/30 whitespace-nowrap">
            {a.toFixed(1)}° <span className="text-slate-500 font-normal">/ {rad.toFixed(2)} rad / {ms.toFixed(2)} ms</span>
          </div>
        </div>
      </div>
    );
  }
);
PlaybackBar.displayName = 'PlaybackBar';
