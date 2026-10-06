import React, { useRef, useState, useMemo } from 'react';
import { WaveformPoint, PerformanceMetrics, HarmonicItem } from '../types';
import {
  Layers,
  Activity,
  BarChart3,
  Maximize2,
  Sliders,
  Grid,
  TrendingUp,
  Compass
} from 'lucide-react';

interface WaveformOscilloscopeProps {
  points: WaveformPoint[];
  metrics: PerformanceMetrics;
  harmonics: HarmonicItem[];
  currentAngle: number; // in degrees, e.g. 0 to 360
  onAngleChange: (angle: number) => void;
  isTwoCycles: boolean;
  onToggleTwoCycles: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

type TabType = 'superimposed' | 'channels' | 'harmonics';

export const WaveformOscilloscope: React.FC<WaveformOscilloscopeProps> = ({
  points,
  metrics,
  harmonics,
  currentAngle,
  onAngleChange,
  isTwoCycles,
  onToggleTwoCycles,
  isFullScreen,
  onToggleFullScreen
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('superimposed');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showVavg, setShowVavg] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Maximum scales for plot
  const maxV = useMemo(() => {
    let max = Math.max(metrics.vm * 1.25, 50);
    points.forEach(p => {
      if (Math.abs(p.vo) > max) max = Math.abs(p.vo) * 1.15;
    });
    return Math.ceil(max / 50) * 50;
  }, [points, metrics.vm]);

  const maxI = useMemo(() => {
    let max = 1;
    points.forEach(p => {
      if (Math.abs(p.io) > max) max = Math.abs(p.io);
      if (Math.abs(p.is) > max) max = Math.abs(p.is);
    });
    return Math.max(5, Math.ceil(max * 1.3));
  }, [points]);

  const cycleSpan = isTwoCycles ? 720 : 360;

  // Filter points for 1 or 2 cycles
  const displayPoints = useMemo(() => {
    return points.filter(p => p.deg <= cycleSpan);
  }, [points, cycleSpan]);

  // Handle direct click/drag on waveform to scrub angle
  const handleSvgInteraction = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const paddingLeft = 45;
    const paddingRight = 20;
    const plotWidth = rect.width - paddingLeft - paddingRight;

    if (plotWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clickX - paddingLeft) / plotWidth));
    const newAngle = ratio * cycleSpan;
    onAngleChange(newAngle);
  };

  // Build SVG path for a key in displayPoints
  const buildPath = (key: 'vs' | 'vo' | 'is' | 'io', height: number, yCenter: number, scaleVal: number) => {
    const paddingLeft = 45;
    const paddingRight = 20;
    const width = 680 - paddingLeft - paddingRight;

    return displayPoints
      .map((p, idx) => {
        const x = paddingLeft + (p.deg / cycleSpan) * width;
        const val = (p as any)[key] as number;
        const y = yCenter - (val / scaleVal) * (height / 2);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Cursor X position
  const cursorX = useMemo(() => {
    const paddingLeft = 45;
    const width = 680 - paddingLeft - 20;
    return paddingLeft + ((currentAngle % cycleSpan) / cycleSpan) * width;
  }, [currentAngle, cycleSpan]);

  // Unique conduction segments
  const conductionSegments = useMemo(() => {
    const segs: { start: number; end: number; text: string; isOff: boolean }[] = [];
    if (displayPoints.length === 0) return segs;

    let curDev = displayPoints[0].activeDevices.join(' ') || 'OFF';
    let curStart = 0;

    for (let i = 1; i < displayPoints.length; i++) {
      const dev = displayPoints[i].activeDevices.join(' ') || 'OFF';
      if (dev !== curDev) {
        segs.push({
          start: curStart,
          end: displayPoints[i].deg,
          text: curDev,
          isOff: curDev === 'OFF'
        });
        curDev = dev;
        curStart = displayPoints[i].deg;
      }
    }
    segs.push({
      start: curStart,
      end: cycleSpan,
      text: curDev,
      isOff: curDev === 'OFF'
    });

    return segs;
  }, [displayPoints, cycleSpan]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md"
    >
      {/* Top Header & Tab Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex-wrap gap-2">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('superimposed')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'superimposed'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Superimposed
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'channels'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Oscilloscope Channels
          </button>
          <button
            onClick={() => setActiveTab('harmonics')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'harmonics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Harmonics (FFT)
          </button>
        </div>

        {/* View Options */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* 1 Cycle / 2 Cycles */}
          <button
            onClick={onToggleTwoCycles}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-mono transition-colors"
          >
            {isTwoCycles ? '2 Cycles (720°)' : '1 Cycle (360°)'}
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded border font-mono transition-colors ${
              showGrid
                ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/40'
            }`}
          >
            # Grid
          </button>

          {/* V_avg Line Toggle */}
          <button
            onClick={() => setShowVavg(!showVavg)}
            className={`px-2 py-1 rounded border font-mono transition-colors ${
              showVavg
                ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/40'
            }`}
          >
            V_avg
          </button>

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Graph Content */}
      <div className="flex-1 min-h-[380px] p-2 relative flex flex-col justify-center">
        {/* =========================================================
            TAB 1: SUPERIMPOSED MODE (VOLTAGE & CURRENT SPLIT)
           ========================================================= */}
        {activeTab === 'superimposed' && (
          <div className="flex-1 flex flex-col justify-between">
            <svg
              viewBox="0 0 680 340"
              className="w-full h-full cursor-crosshair select-none"
              preserveAspectRatio="none"
              onClick={handleSvgInteraction}
            >
              {/* Background */}
              <rect width="680" height="340" fill="#090d16" />

              {/* Grid Lines */}
              {showGrid && (
                <g stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3">
                  {/* Vertical degree divisions */}
                  {[0, 45, 90, 135, 180, 225, 270, 315, 360, 450, 540, 630, 720]
                    .filter(d => d <= cycleSpan)
                    .map(d => {
                      const x = 45 + (d / cycleSpan) * (680 - 65);
                      return <line key={d} x1={x} y1="20" x2={x} y2="300" />;
                    })}
                  {/* Voltage horizontal divisions */}
                  <line x1="45" y1="40" x2="660" y2="40" />
                  <line x1="45" y1="80" x2="660" y2="80" />
                  <line x1="45" y1="120" x2="660" y2="120" />
                  {/* Current horizontal divisions */}
                  <line x1="45" y1="210" x2="660" y2="210" />
                  <line x1="45" y1="270" x2="660" y2="270" />
                </g>
              )}

              {/* Baseline 0V for Voltage (y = 80) */}
              <line x1="45" y1="80" x2="660" y2="80" stroke="#334155" strokeWidth="1.5" />
              {/* Baseline 0A for Current (y = 240) */}
              <line x1="45" y1="240" x2="660" y2="240" stroke="#334155" strokeWidth="1.5" />

              {/* Section Titles & Units */}
              <text x="50" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold">
                Voltage Waveforms (v_s & v_o Superimposed)
              </text>
              <text x="655" y="22" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                [V]
              </text>

              <text x="50" y="172" fill="#94a3b8" fontSize="10" fontWeight="bold">
                Current Waveforms (i_o & i_s)
              </text>
              <text x="655" y="172" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                [A]
              </text>

              {/* Voltage Axis Labels */}
              <text x="40" y="44" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                +{maxV}V
              </text>
              <text x="40" y="83" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                0V
              </text>
              <text x="40" y="124" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                -{maxV}V
              </text>

              {/* Current Axis Labels */}
              <text x="40" y="214" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                +{maxI}A
              </text>
              <text x="40" y="243" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                0A
              </text>
              <text x="40" y="274" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                -{maxI}A
              </text>

              {/* Degree labels along middle separator */}
              {[0, 90, 180, 270, 360, 450, 540, 630, 720]
                .filter(d => d <= cycleSpan)
                .map(d => {
                  const x = 45 + (d / cycleSpan) * (680 - 65);
                  return (
                    <text
                      key={d}
                      x={x}
                      y="155"
                      fill="#64748b"
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {d}°
                    </text>
                  );
                })}

              {/* Average Voltage line V_avg (purple dashed) */}
              {showVavg && (
                <g>
                  <line
                    x1="45"
                    y1={80 - (metrics.vAvg / maxV) * 55}
                    x2="660"
                    y2={80 - (metrics.vAvg / maxV) * 55}
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="655"
                    y={75 - (metrics.vAvg / maxV) * 55}
                    fill="#c084fc"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    V_avg = {metrics.vAvg.toFixed(1)}V
                  </text>
                </g>
              )}

              {/* Voltage Traces */}
              {/* vs: Cyan dashed line */}
              <path
                d={buildPath('vs', 110, 80, maxV)}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.85"
              />

              {/* vo: Bright Emerald Green solid line */}
              <path
                d={buildPath('vo', 110, 80, maxV)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />

              {/* Gate Pulses overlay (amber mini pulses) */}
              {displayPoints.map((p, idx) => {
                if (!p.gatePulses) return null;
                const x = 45 + (p.deg / cycleSpan) * (680 - 65);
                return (
                  <rect
                    key={idx}
                    x={x - 8}
                    y="252"
                    width="16"
                    height="7"
                    rx="1.5"
                    fill="#f59e0b"
                    opacity="0.9"
                  />
                );
              })}

              {/* Current Traces */}
              {/* is: Lavender/Violet */}
              <path
                d={buildPath('is', 60, 240, maxI)}
                fill="none"
                stroke="#818cf8"
                strokeWidth="1.75"
                opacity="0.85"
              />

              {/* io: Amber/Orange */}
              <path
                d={buildPath('io', 60, 240, maxI)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              />

              {/* Live Cursor Vertical Tracking Line */}
              <line
                x1={cursorX}
                y1="20"
                x2={cursorX}
                y2="300"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle cx={cursorX} cy="20" r="3.5" fill="#38bdf8" />
              <circle cx={cursorX} cy="300" r="3.5" fill="#38bdf8" />

              {/* Conduction Timeline Bar along bottom */}
              <g transform="translate(45, 305)">
                <text x="-5" y="11" fill="#64748b" fontSize="7" fontWeight="bold" textAnchor="end">
                  ACTIVE
                  <tspan x="-5" dy="8">
                    PAIR
                  </tspan>
                </text>
                {conductionSegments.map((seg, idx) => {
                  const x1 = (seg.start / cycleSpan) * (680 - 65);
                  const x2 = (seg.end / cycleSpan) * (680 - 65);
                  const w = Math.max(0, x2 - x1);
                  return (
                    <g key={idx} transform={`translate(${x1}, 0)`}>
                      <rect
                        width={w}
                        height="16"
                        fill={seg.isOff ? '#1e293b' : '#064e3b'}
                        stroke="#0f172a"
                        strokeWidth="1"
                      />
                      {w > 25 && (
                        <text
                          x={w / 2}
                          y="11"
                          fill={seg.isOff ? '#64748b' : '#34d399'}
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {seg.text}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* =========================================================
            TAB 2: INDIVIDUAL CHANNELS OSCILLOSCOPE
           ========================================================= */}
        {activeTab === 'channels' && (
          <div className="flex-1 flex flex-col justify-around gap-1 p-2 bg-slate-950/70 rounded-lg">
            {/* CH1: vs */}
            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded border border-cyan-900/40">
              <span className="w-16 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded text-center">
                CH1: v_s
              </span>
              <div className="flex-1 h-14 relative">
                <svg viewBox="0 0 600 50" className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="600" y2="25" stroke="#1e293b" strokeWidth="1" />
                  <path
                    d={displayPoints
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.deg / cycleSpan) * 600},${25 - (p.vs / maxV) * 22}`)
                      .join(' ')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y1="0"
                    x2={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y2="50"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
              <span className="w-20 text-[11px] font-mono text-cyan-300 text-right">
                {(displayPoints[Math.floor(((currentAngle % cycleSpan) / cycleSpan) * displayPoints.length)]?.vs || 0).toFixed(1)} V
              </span>
            </div>

            {/* CH2: vo */}
            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded border border-emerald-900/40">
              <span className="w-16 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded text-center">
                CH2: v_o
              </span>
              <div className="flex-1 h-14 relative">
                <svg viewBox="0 0 600 50" className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="40" x2="600" y2="40" stroke="#1e293b" strokeWidth="1" />
                  <path
                    d={displayPoints
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.deg / cycleSpan) * 600},${40 - (p.vo / maxV) * 35}`)
                      .join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <line
                    x1={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y1="0"
                    x2={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y2="50"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
              <span className="w-20 text-[11px] font-mono text-emerald-300 text-right">
                {(displayPoints[Math.floor(((currentAngle % cycleSpan) / cycleSpan) * displayPoints.length)]?.vo || 0).toFixed(1)} V
              </span>
            </div>

            {/* CH3: is */}
            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded border border-indigo-900/40">
              <span className="w-16 text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded text-center">
                CH3: i_s
              </span>
              <div className="flex-1 h-14 relative">
                <svg viewBox="0 0 600 50" className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="600" y2="25" stroke="#1e293b" strokeWidth="1" />
                  <path
                    d={displayPoints
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.deg / cycleSpan) * 600},${25 - (p.is / maxI) * 22}`)
                      .join(' ')}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y1="0"
                    x2={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y2="50"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
              <span className="w-20 text-[11px] font-mono text-indigo-300 text-right">
                {(displayPoints[Math.floor(((currentAngle % cycleSpan) / cycleSpan) * displayPoints.length)]?.is || 0).toFixed(2)} A
              </span>
            </div>

            {/* CH4: io */}
            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded border border-amber-900/40">
              <span className="w-16 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded text-center">
                CH4: i_o
              </span>
              <div className="flex-1 h-14 relative">
                <svg viewBox="0 0 600 50" className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="40" x2="600" y2="40" stroke="#1e293b" strokeWidth="1" />
                  <path
                    d={displayPoints
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.deg / cycleSpan) * 600},${40 - (p.io / maxI) * 35}`)
                      .join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <line
                    x1={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y1="0"
                    x2={((currentAngle % cycleSpan) / cycleSpan) * 600}
                    y2="50"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
              <span className="w-20 text-[11px] font-mono text-amber-300 text-right">
                {(displayPoints[Math.floor(((currentAngle % cycleSpan) / cycleSpan) * displayPoints.length)]?.io || 0).toFixed(2)} A
              </span>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: HARMONICS FFT SPECTRUM
           ========================================================= */}
        {activeTab === 'harmonics' && (
          <div className="flex-1 flex flex-col p-3 bg-slate-950/80 rounded-lg overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Fourier Harmonic Spectrum Analysis</h4>
                <p className="text-[11px] text-slate-400">
                  Dominant ripple frequency: <span className="text-cyan-400 font-mono font-bold">{metrics.rippleFreq} Hz</span> ({metrics.pulseNumber}-Pulse)
                </p>
              </div>
              <div className="flex gap-3 text-xs font-mono">
                <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                  THD(i_s): <span className="text-amber-400 font-bold">{metrics.thdCurrent.toFixed(1)}%</span>
                </div>
                <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                  Ripple Factor: <span className="text-purple-400 font-bold">{metrics.rippleFactor.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Harmonics Bar Chart */}
            <div className="flex-1 min-h-[200px] flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
              {harmonics.map(h => (
                <div key={h.harmonic} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] font-mono px-2 py-1 rounded border border-slate-700 shadow-xl pointer-events-none whitespace-nowrap z-20">
                    <div>{h.order}</div>
                    <div className="text-emerald-400">Vo: {h.voltageMag.toFixed(1)}V ({h.voltagePercent.toFixed(1)}%)</div>
                    <div className="text-amber-400">Is: {h.currentMag.toFixed(2)}A</div>
                  </div>

                  {/* Bars side by side */}
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    {/* Voltage bar */}
                    <div
                      style={{ height: `${Math.max(4, h.voltagePercent)}%` }}
                      className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all duration-300"
                    />
                    {/* Current bar */}
                    <div
                      style={{ height: `${Math.max(4, h.currentPercent)}%` }}
                      className="w-1/2 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t transition-all duration-300"
                    />
                  </div>

                  <span className="text-[9px] font-mono text-slate-400">
                    {h.harmonic === 0 ? 'DC' : `${h.harmonic}f`}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-slate-300">Voltage Harmonics (% of DC/Peak)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500"></span>
                <span className="text-slate-300">Supply Current Harmonics (% of Fundamental)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Angle Scrubber Slider */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold whitespace-nowrap">
          <Compass className="w-4 h-4 animate-spin [animation-duration:8s]" />
          <span>Angle ωt:</span>
        </div>

        <input
          type="range"
          min="0"
          max={cycleSpan}
          step="0.5"
          value={currentAngle % (cycleSpan + 0.001)}
          onChange={e => onAngleChange(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 min-w-[55px] text-right">
          {(currentAngle % cycleSpan).toFixed(1)}°
        </div>
      </div>
    </div>
  );
};
