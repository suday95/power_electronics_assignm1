import React from 'react';
import { CircuitParams, DeviceType, LoadType, PhaseType, RectifierType } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  StepBack,
  StepForward,
  Zap,
  Gauge,
  Sliders,
  Cpu,
  Layers,
  ShieldCheck
} from 'lucide-react';

interface ControlPanelProps {
  params: CircuitParams;
  onChangeParams: (updater: (prev: CircuitParams) => CircuitParams) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: (deltaDeg: number) => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChangeParams,
  isPlaying,
  onTogglePlay,
  onStep,
  onReset,
  speed,
  onSpeedChange
}) => {
  const isThyristor = params.deviceType === 'thyristor';

  return (
    <div className="flex flex-col gap-4">
      {/* Real-time Playback & Speed Bar (matching reference top row) */}
      <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md flex-wrap gap-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400/40'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Pause Simulation' : 'Run Real-Time'}
          </button>

          <button
            onClick={() => onStep(-15)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors"
            title="Step Back 15°"
          >
            <StepBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => onStep(15)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors"
            title="Step Forward 15°"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700 rounded-lg border border-slate-700/50 transition-colors"
            title="Reset Angle to 0°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Speed:</span>
          </div>

          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={e => onSpeedChange(parseFloat(e.target.value))}
            className="w-28 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />

          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 min-w-[42px] text-center">
            {speed.toFixed(1)}x
          </span>

          <div className="flex items-center gap-1">
            {[0.1, 0.2, 0.5, 1.0, 2.0].map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  Math.abs(speed - s) < 0.05
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Parameter Columns: Converter Topology | Firing Angle & FWD | Load & Source */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PANEL 1: CONVERTER TOPOLOGY */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-200">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Converter Topology</h3>
            </div>

            {/* Phase Selector (1Φ vs 3Φ) */}
            <div className="mb-3">
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Supply Phase</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                <button
                  onClick={() => onChangeParams(p => ({ ...p, phase: '1phase' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.phase === '1phase'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Single-Phase (1Φ)
                </button>
                <button
                  onClick={() => onChangeParams(p => ({ ...p, phase: '3phase' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.phase === '3phase'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Three-Phase (3Φ)
                </button>
              </div>
            </div>

            {/* Rectifier Type (Full-Wave vs Half-Wave) */}
            <div className="mb-3">
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Rectification Type</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                <button
                  onClick={() => onChangeParams(p => ({ ...p, rectifierType: 'fullwave' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.rectifierType === 'fullwave'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full-Wave Bridge
                </button>
                <button
                  onClick={() => onChangeParams(p => ({ ...p, rectifierType: 'halfwave' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.rectifierType === 'halfwave'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Half-Wave
                </button>
              </div>
            </div>

            {/* Device Type (Diode vs Thyristor) */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Switching Device</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                <button
                  onClick={() => onChangeParams(p => ({ ...p, deviceType: 'diode' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.deviceType === 'diode'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Diode (Uncontrolled)
                </button>
                <button
                  onClick={() => onChangeParams(p => ({ ...p, deviceType: 'thyristor' }))}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    params.deviceType === 'thyristor'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Thyristor (SCR Controlled)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: FIRING ANGLE α & FREEWHEELING DIODE */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-200">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Firing Angle α & FWD</h3>
            </div>

            {/* Firing Angle Slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                  Firing Angle (α):
                  {!isThyristor && (
                    <span className="text-[10px] text-slate-500 italic">(Locked at 0° for Diodes)</span>
                  )}
                </label>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {isThyristor ? `${params.firingAngle}°` : '0°'}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="180"
                step="5"
                disabled={!isThyristor}
                value={isThyristor ? params.firingAngle : 0}
                onChange={e => onChangeParams(p => ({ ...p, firingAngle: parseInt(e.target.value) }))}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              />

              {/* Firing Angle Quick Presets */}
              <div className="flex items-center justify-between mt-2 gap-1">
                {[0, 30, 45, 60, 90, 120].map(deg => (
                  <button
                    key={deg}
                    disabled={!isThyristor}
                    onClick={() => onChangeParams(p => ({ ...p, firingAngle: deg }))}
                    className={`flex-1 py-0.5 text-[10px] font-mono rounded border transition-colors disabled:opacity-30 ${
                      isThyristor && params.firingAngle === deg
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Freewheeling Diode (FWD) Toggle */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Freewheeling Diode (D_FW)</div>
                  <div className="text-[10px] text-slate-400">Prevents negative voltage excursion on inductive load</div>
                </div>
              </div>
              <button
                onClick={() => onChangeParams(p => ({ ...p, hasFwd: !p.hasFwd }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  params.hasFwd ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    params.hasFwd ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 3: LOAD & SOURCE PARAMETERS */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-200">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Load & Source Parameters</h3>
            </div>

            {/* Load Type Selector */}
            <div className="mb-3">
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Load Configuration</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                {(['R', 'RL', 'RLE'] as LoadType[]).map(lt => (
                  <button
                    key={lt}
                    onClick={() => onChangeParams(p => ({ ...p, loadType: lt }))}
                    className={`py-1 text-xs font-bold rounded-md transition-all ${
                      params.loadType === lt
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lt} Load
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for R, L, E */}
            <div className="space-y-2.5">
              {/* Resistance R */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Resistance R:</span>
                  <span className="font-mono text-cyan-400 font-bold">{params.r} Ω</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={params.r}
                  onChange={e => onChangeParams(p => ({ ...p, r: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Inductance L (if RL or RLE) */}
              {params.loadType !== 'R' && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Inductance L:</span>
                    <span className="font-mono text-cyan-400 font-bold">{params.l} mH</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    step="5"
                    value={params.l}
                    onChange={e => onChangeParams(p => ({ ...p, l: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Back-EMF E (if RLE) */}
              {params.loadType === 'RLE' && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Back-EMF E:</span>
                    <span className="font-mono text-amber-400 font-bold">{params.e} V</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={params.e}
                    onChange={e => onChangeParams(p => ({ ...p, e: parseInt(e.target.value) }))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Supply Voltage RMS & Frequency */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400">V_rms:</span>
                  <select
                    value={params.vRms}
                    onChange={e => onChangeParams(p => ({ ...p, vRms: parseInt(e.target.value) }))}
                    className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="110" className="bg-slate-900">110 V</option>
                    <option value="230" className="bg-slate-900">230 V</option>
                    <option value="400" className="bg-slate-900">400 V</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400">Freq:</span>
                  <select
                    value={params.freq}
                    onChange={e => onChangeParams(p => ({ ...p, freq: parseInt(e.target.value) }))}
                    className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="50" className="bg-slate-900">50 Hz</option>
                    <option value="60" className="bg-slate-900">60 Hz</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
