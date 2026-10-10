/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircuitParams, WaveformPoint } from './types';
import { hasThyristor, solveWaveforms, STEP_DEG, toggleDevice } from './engine/simulationMath';
import { CircuitSchematic } from './components/CircuitSchematic';
import { WaveformOscilloscope } from './components/WaveformOscilloscope';
import { ControlPanel } from './components/ControlPanel';
import { PlaybackBar } from './components/PlaybackBar';
import { MetricsStrip } from './components/MetricsStrip';
import { LabSuite } from './components/LabSuite';
import { WaveformAnalysisModal } from './components/WaveformAnalysisModal';
import { TheoryModal } from './components/TheoryModal';
import { PresetsModal } from './components/PresetsModal';
import { BookOpen, Calculator, FlaskConical, Maximize2, Minimize2, Moon, RotateCcw, Sparkles, Sun, Zap } from 'lucide-react';

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
  l: 100,
  e: 0
};

const DEFAULT_SPEED = 0.5;
const DEG_PER_SEC_AT_1X = 180; // 1x = one supply cycle every 2 seconds
const MAX_FRAME_SEC = 0.1;     // a hidden tab must not make the cursor jump

const navBtn =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors';

export default function App() {
  const [params, setParams] = useState<CircuitParams>(DEFAULT_PARAMS);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [isTwoCycles, setIsTwoCycles] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rectifierlab-theme') !== 'light';
    } catch {
      return true;
    }
  });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const cycleSpan = isTwoCycles ? 720 : 360;

  const simulation = useMemo(() => solveWaveforms(params, isTwoCycles ? 2 : 1), [params, isTwoCycles]);

  const currentPoint: WaveformPoint = useMemo(() => {
    const norm = ((currentAngle % cycleSpan) + cycleSpan) % cycleSpan;
    const index = Math.min(simulation.points.length - 1, Math.floor(norm / STEP_DEG));
    return simulation.points[index];
  }, [currentAngle, cycleSpan, simulation.points]);

  // ---- theme -------------------------------------------------------------
  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    try {
      localStorage.setItem('rectifierlab-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      /* storage unavailable (private mode) – theme just won't persist */
    }
  }, [isDarkMode]);

  // ---- full screen stays in sync when the user presses Esc ----------------
  useEffect(() => {
    const sync = () => setIsFullScreen(document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  // ---- animation loop -------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last: number | null = null;
    const degPerSec = DEG_PER_SEC_AT_1X * speed;

    const frame = (t: number) => {
      if (last !== null) {
        const dt = Math.min((t - last) / 1000, MAX_FRAME_SEC);
        setCurrentAngle(a => (a + degPerSec * dt) % cycleSpan);
      }
      last = t;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, speed, cycleSpan]);

  // ---- playback handlers ------------------------------------------------------
  const handleScrub = useCallback((angle: number) => {
    setIsPlaying(false);
    setCurrentAngle(angle);
  }, []);

  const handleStep = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setCurrentAngle(a => (((a + delta) % cycleSpan) + cycleSpan) % cycleSpan);
    },
    [cycleSpan]
  );

  const handleTogglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const handleResetAngle = useCallback(() => setCurrentAngle(0), []);
  const handleToggleCycles = useCallback(() => {
    setIsTwoCycles(v => !v);
    setCurrentAngle(a => a % 360);
  }, []);

  // Keyboard: Space = play/pause, ←/→ = step 1°
  const stepRef = useRef(handleStep);
  stepRef.current = handleStep;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, button, [role="button"], [role="dialog"]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'ArrowRight') stepRef.current(1);
      else if (e.code === 'ArrowLeft') stepRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- parameter handlers -----------------------------------------------------
  const handleToggleDevice = useCallback((n: number) => setParams(p => toggleDevice(p, n)), []);
  const handleToggleFwd = useCallback(() => setParams(p => ({ ...p, hasFwd: !p.hasFwd })), []);
  const handleApplyPreset = useCallback((p: CircuitParams) => setParams({ ...p, deviceOverrides: p.deviceOverrides ?? {} }), []);
  const closeAnalysis = useCallback(() => setIsAnalysisOpen(false), []);
  const closeTheory = useCallback(() => setIsTheoryOpen(false), []);
  const closePresets = useCallback(() => setIsPresetsOpen(false), []);

  const handleResetAll = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setCurrentAngle(0);
    setIsPlaying(true);
    setSpeed(DEFAULT_SPEED);
    setIsTwoCycles(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <header className="px-5 py-2.5 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md lg:sticky top-0 z-30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              Rectifier<span className="text-cyan-400">Lab</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Power Electronics Virtual Laboratory</p>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold uppercase tracking-wide">
          <button onClick={() => setIsPresetsOpen(true)} className={navBtn}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lab Presets</span>
          </button>
          <button onClick={() => setIsAnalysisOpen(true)} className={navBtn}>
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Derivations</span>
          </button>
          <button onClick={() => setIsTheoryOpen(true)} className={navBtn}>
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Theory</span>
          </button>
          <button onClick={() => document.getElementById('lab')?.scrollIntoView({ behavior: 'smooth' })} className={navBtn}>
            <FlaskConical className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Lab Manual & Viva</span>
          </button>
          <span className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />
          <button onClick={() => setIsDarkMode(d => !d)} className={navBtn} aria-pressed={!isDarkMode} title="Toggle theme">
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          <button onClick={handleToggleFullScreen} className={navBtn} title="Toggle full screen">
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullScreen ? 'Exit' : 'Full Screen'}</span>
          </button>
          <button onClick={handleResetAll} className={navBtn} title="Reset everything" aria-label="Reset everything">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </nav>
      </header>

      <main className="flex-1 p-4 lg:p-5 w-full max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        {/* Visuals: schematic above the oscilloscope, each at full width */}
        <div className="flex flex-col gap-4 min-w-0 xl:col-start-2 xl:row-start-1">
          <CircuitSchematic
            params={params}
            currentPoint={currentPoint}
            isPlaying={isPlaying}
            onToggleDevice={handleToggleDevice}
            onToggleFwd={handleToggleFwd}
          />
          <WaveformOscilloscope
            params={params}
            points={simulation.points}
            metrics={simulation.metrics}
            harmonics={simulation.harmonics}
            gateEvents={simulation.gateEvents}
            currentAngle={currentAngle}
            currentPoint={currentPoint}
            onScrub={handleScrub}
            isTwoCycles={isTwoCycles}
            onToggleTwoCycles={handleToggleCycles}
          />
        </div>

        {/* Control deck: playback + circuit parameters (sticky side rail on wide screens) */}
        <aside className="flex flex-col gap-4 xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
          <PlaybackBar
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStep={handleStep}
            onReset={handleResetAngle}
            speed={speed}
            onSpeedChange={setSpeed}
            angle={currentAngle}
            span={cycleSpan}
            freq={params.freq}
            alpha={hasThyristor(params) ? params.firingAngle : null}
            onScrub={handleScrub}
          />
          <ControlPanel params={params} onChangeParams={setParams} />
        </aside>

        <div className="flex flex-col gap-4 min-w-0 xl:col-start-2 xl:row-start-2">
          <MetricsStrip params={params} metrics={simulation.metrics} />
          <LabSuite params={params} metrics={simulation.metrics} onLoadPreset={handleApplyPreset} />
          <p className="text-center text-[11px] text-slate-500 pb-2">
            Ideal devices, instantaneous commutation, steady-state solution. Shortcuts: Space = run/pause, ← → = step 1°.
          </p>
        </div>
      </main>

      <WaveformAnalysisModal isOpen={isAnalysisOpen} onClose={closeAnalysis} params={params} metrics={simulation.metrics} />
      <TheoryModal isOpen={isTheoryOpen} onClose={closeTheory} />
      <PresetsModal isOpen={isPresetsOpen} onClose={closePresets} onApplyPreset={handleApplyPreset} />
    </div>
  );
}
