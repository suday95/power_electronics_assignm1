/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CircuitParams, WaveformPoint } from './types';
import { solveWaveforms } from './engine/simulationMath';
import { CircuitSchematic } from './components/CircuitSchematic';
import { WaveformOscilloscope } from './components/WaveformOscilloscope';
import { ControlPanel } from './components/ControlPanel';
import { WaveformAnalysisModal } from './components/WaveformAnalysisModal';
import { TheoryModal } from './components/TheoryModal';
import { PresetsModal } from './components/PresetsModal';
import {
  Zap,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Calculator,
  Sparkles,
  BookOpen,
  RotateCcw
} from 'lucide-react';

const DEFAULT_PARAMS: CircuitParams = {
  phase: '1phase',
  rectifierType: 'fullwave',
  deviceType: 'thyristor',
  loadType: 'RL',
  vRms: 230,
  freq: 50,
  firingAngle: 45,
  hasFwd: false,
  r: 20,
  l: 45,
  e: 0
};

export default function App() {
  const [params, setParams] = useState<CircuitParams>(DEFAULT_PARAMS);
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(0.2); // Smooth real-time default
  const [isTwoCycles, setIsTwoCycles] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Modals
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);

  // Solve simulation waveforms
  const simulation = useMemo(() => {
    return solveWaveforms(params, isTwoCycles ? 2 : 1);
  }, [params, isTwoCycles]);

  const cycleSpan = isTwoCycles ? 720 : 360;

  // Find current sample point
  const currentPoint: WaveformPoint = useMemo(() => {
    const normAngle = ((currentAngle % cycleSpan) + cycleSpan) % cycleSpan;
    const index = Math.floor((normAngle / cycleSpan) * simulation.points.length);
    return simulation.points[index] || simulation.points[0];
  }, [currentAngle, cycleSpan, simulation.points]);

  // Animation Loop with requestAnimationFrame
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (timestamp - lastTimeRef.current) / 1000;
        // 360 degrees per period = (360 * freq * speed * deltaSec)
        const deltaDeg = 360 * params.freq * speed * deltaSec;
        setCurrentAngle(prev => (prev + deltaDeg) % cycleSpan);
      }
      lastTimeRef.current = timestamp;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, params.freq, speed, cycleSpan]);

  // Stepping controls
  const handleStep = useCallback((deltaDeg: number) => {
    setIsPlaying(false);
    setCurrentAngle(prev => (prev + deltaDeg + cycleSpan) % cycleSpan);
  }, [cycleSpan]);

  const handleResetAngle = useCallback(() => {
    setCurrentAngle(0);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setCurrentAngle(0);
    setIsPlaying(true);
    setSpeed(0.2);
  }, []);

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#090d16]' : 'bg-slate-900'}`}>
      {/* Top Header Bar (matching reference image) */}
      <header className="px-5 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between flex-wrap gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500 shadow-md shadow-cyan-500/25 text-slate-950 font-black">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                RectifierLab
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                Power Electronics Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive Single-Phase & Three-Phase Diode/Thyristor Bridge Converter Simulation
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Light/Dark Mode */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Full Screen */}
          <button
            onClick={handleToggleFullScreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>Full Screen Studio</span>
          </button>

          {/* Waveform Analysis & Derivations */}
          <button
            onClick={() => setIsAnalysisOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold transition-all shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Waveform Analysis & Derivations</span>
          </button>

          {/* Presets */}
          <button
            onClick={() => setIsPresetsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Presets</span>
          </button>

          {/* Theory */}
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Theory</span>
          </button>

          {/* Reset All */}
          <button
            onClick={handleResetAll}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-colors"
            title="Reset All Parameters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 p-4 lg:p-5 flex flex-col gap-5 max-w-[1720px] w-full mx-auto">
        {/* Top Split View: Schematic (Left) & Oscilloscope (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {/* Circuit Schematic */}
          <CircuitSchematic
            params={params}
            currentPoint={currentPoint}
            onToggleDeviceType={() =>
              setParams(p => ({
                ...p,
                deviceType: p.deviceType === 'diode' ? 'thyristor' : 'diode'
              }))
            }
            onToggleFwd={() => setParams(p => ({ ...p, hasFwd: !p.hasFwd }))}
          />

          {/* Waveform Oscilloscope */}
          <WaveformOscilloscope
            points={simulation.points}
            metrics={simulation.metrics}
            harmonics={simulation.harmonics}
            currentAngle={currentAngle}
            onAngleChange={setCurrentAngle}
            isTwoCycles={isTwoCycles}
            onToggleTwoCycles={() => setIsTwoCycles(prev => !prev)}
          />
        </div>

        {/* Bottom Studio Controls */}
        <ControlPanel
          params={params}
          onChangeParams={setParams}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onStep={handleStep}
          onReset={handleResetAngle}
          speed={speed}
          onSpeedChange={setSpeed}
        />
      </main>

      {/* Analysis Modal */}
      <WaveformAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        params={params}
        metrics={simulation.metrics}
      />

      {/* Theory Guide Modal */}
      <TheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />

      {/* Lab Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onApplyPreset={setParams}
      />
    </div>
  );
}
