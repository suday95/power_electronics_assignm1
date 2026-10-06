import React from 'react';
import { CircuitParams, WaveformPoint } from '../types';
import { Maximize2, Zap, Radio, Cpu, RefreshCw } from 'lucide-react';

interface CircuitSchematicProps {
  params: CircuitParams;
  currentPoint: WaveformPoint;
  onToggleDeviceType?: () => void;
  onToggleFwd?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  params,
  currentPoint,
  onToggleDeviceType,
  onToggleFwd,
  isFullScreen,
  onToggleFullScreen
}) => {
  const { phase, rectifierType, deviceType, loadType, hasFwd, r, l, e } = params;
  const isThyristor = deviceType === 'thyristor';
  const activeDevs = currentPoint.activeDevices;
  const isFwdActive = activeDevs.includes('D_FW');

  // Format instantaneous values
  const vsText = `${currentPoint.vs >= 0 ? '+' : ''}${currentPoint.vs.toFixed(1)} V`;
  const voText = `${currentPoint.vo >= 0 ? '+' : ''}${currentPoint.vo.toFixed(1)} V`;
  const ioText = `${currentPoint.io >= 0 ? '+' : ''}${currentPoint.io.toFixed(2)} A`;

  // Determine topology badge text
  const topologyBadge = `${phase === '1phase' ? '1-PHASE' : '3-PHASE'} ${
    rectifierType === 'fullwave' ? 'FULL-BRIDGE' : 'HALF-WAVE'
  }`;

  // Helper to render Diode or Thyristor switch symbol
  const renderSwitch = (
    id: string,
    x: number,
    y: number,
    label: string,
    subLabel: string,
    pointingUp: boolean = true
  ) => {
    const isActive = activeDevs.includes(id);
    const pfx = isThyristor ? 'T' : 'D';
    const devId = `${pfx}${id.replace(/^[TD]/, '')}`;

    return (
      <g
        key={id}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer group select-none"
        onClick={onToggleDeviceType}
      >
        {/* Glow halo when active */}
        {isActive && (
          <circle
            cx="0"
            cy="0"
            r="32"
            fill="rgba(16, 185, 129, 0.2)"
            filter="blur(6px)"
            className="animate-pulse"
          />
        )}

        {/* Outer border box */}
        <rect
          x="-28"
          y="-30"
          width="56"
          height="60"
          rx="6"
          fill={isActive ? 'rgba(6, 78, 59, 0.45)' : 'rgba(30, 41, 59, 0.4)'}
          stroke={isActive ? '#10B981' : '#334155'}
          strokeWidth={isActive ? '2' : '1'}
          className="transition-all duration-200 group-hover:stroke-cyan-400"
        />

        {/* State Tag ON / OFF */}
        <text
          x="0"
          y="23"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill={isActive ? '#34D399' : '#64748B'}
          letterSpacing="0.5"
        >
          {isActive ? 'ON' : 'OFF'}
        </text>

        {/* Device Label */}
        <text
          x="0"
          y="-18"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill={isActive ? '#A7F3D0' : '#94A3B8'}
        >
          {devId}
        </text>

        {/* Diode / Thyristor Triangle & Cathode Bar */}
        <g transform={pointingUp ? '' : 'rotate(180)'}>
          {/* Anode to Cathode Triangle */}
          <polygon
            points="0,-10 -12,8 12,8"
            fill={isActive ? '#10B981' : '#475569'}
            stroke={isActive ? '#34D399' : '#64748B'}
            strokeWidth="1.5"
          />
          {/* Cathode horizontal bar */}
          <line
            x1="-13"
            y1="-10"
            x2="13"
            y2="-10"
            stroke={isActive ? '#34D399' : '#94A3B8'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Gate pin for Thyristor */}
          {isThyristor && (
            <path
              d="M -12,8 L -18,14 L -23,14"
              fill="none"
              stroke={isActive ? '#F59E0B' : '#64748B'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Small Gate "G" text */}
        {isThyristor && (
          <text
            x="-21"
            y="2"
            textAnchor="end"
            fontSize="8"
            fill={isActive ? '#FCD34D' : '#64748B'}
            fontWeight="bold"
          >
            G
          </text>
        )}

        {/* Sub-label e.g. Phase A (Top) */}
        <text
          x="0"
          y="-34"
          textAnchor="middle"
          fontSize="8"
          fill="#64748B"
          className="pointer-events-none"
        >
          {subLabel}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">Circuit Schematic Diagram</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
                {topologyBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Click any device to switch Diode <span className="text-cyan-400 font-semibold">(D)</span> ↔ Thyristor <span className="text-amber-400 font-semibold">(T)</span>.
            </p>
          </div>
        </div>

        {/* Active Loop Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">Active Current Loop</span>
              <span className="text-xs font-semibold text-emerald-200">{currentPoint.loopDescription}</span>
            </div>
          </div>

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

      {/* SVG Canvas Container */}
      <div className="flex-1 w-full min-h-[380px] p-2 relative bg-radial from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
        {/* Animated Background Grid Pattern */}
        <svg
          viewBox="0 0 760 420"
          className="w-full h-full max-h-[460px] object-contain drop-shadow-xl"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.75" fill="#1e293b" />
            </pattern>
            {/* Glow filters */}
            <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="activePathGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="760" height="420" fill="url(#circuitGrid)" />

          {/* ========================================================
              SINGLE-PHASE FULL-WAVE BRIDGE SCHEMATIC
             ======================================================== */}
          {phase === '1phase' && rectifierType === 'fullwave' && (
            <g>
              {/* Positive Top Rail: (140, 140) -> (360, 140) -> (580, 140) */}
              <line x1="180" y1="140" x2="580" y2="140" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              {/* Negative Bottom Rail: (180, 280) -> (580, 280) */}
              <line x1="180" y1="280" x2="580" y2="280" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

              {/* Bridge Left Branch (Phase A): (180, 140) to (180, 280) */}
              <line x1="180" y1="140" x2="180" y2="280" stroke="#334155" strokeWidth="2.5" />
              {/* Bridge Right Branch (Neutral): (260, 140) to (260, 280) */}
              <line x1="260" y1="140" x2="260" y2="280" stroke="#334155" strokeWidth="2.5" />

              {/* Source AC Connections */}
              {/* Line from AC Source Top to (180, 210) midpoint */}
              <path d="M 90,200 L 115,200 L 115,185 L 180,185" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
              {/* Line from AC Source Bottom to (260, 235) midpoint */}
              <path d="M 90,220 L 115,220 L 115,235 L 260,235" fill="none" stroke="#64748b" strokeWidth="2.5" />

              {/* Active current path glows when conducting */}
              {activeDevs.includes('T1') || activeDevs.includes('D1') ? (
                <g filter="url(#activePathGlow)">
                  <path
                    d="M 90,200 L 115,200 L 115,185 L 180,185 L 180,140 L 580,140 L 580,210 L 580,280 L 260,280 L 260,235 L 115,235 L 115,220 L 90,220"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    className="animate-[dash_1.5s_linear_infinite]"
                  />
                </g>
              ) : null}

              {activeDevs.includes('T3') || activeDevs.includes('D3') ? (
                <g filter="url(#activePathGlow)">
                  <path
                    d="M 90,220 L 115,220 L 115,235 L 260,235 L 260,140 L 580,140 L 580,210 L 580,280 L 180,280 L 180,185 L 115,185 L 115,200 L 90,200"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    className="animate-[dash_1.5s_linear_infinite]"
                  />
                </g>
              ) : null}

              {/* Freewheeling Diode Branch */}
              <line
                x1="400"
                y1="140"
                x2="400"
                y2="280"
                stroke={isFwdActive ? '#10b981' : hasFwd ? '#475569' : '#1e293b'}
                strokeWidth={isFwdActive ? '3' : '1.5'}
                strokeDasharray={hasFwd ? undefined : '4 4'}
              />
              <g
                transform="translate(400, 210)"
                onClick={onToggleFwd}
                className="cursor-pointer group"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="22"
                  fill={isFwdActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(30, 41, 59, 0.4)'}
                  stroke={isFwdActive ? '#10b981' : hasFwd ? '#64748b' : '#334155'}
                  strokeWidth="1.5"
                />
                <polygon
                  points="0,-8 -9,7 9,7"
                  fill={isFwdActive ? '#10b981' : hasFwd ? '#475569' : '#334155'}
                  stroke={isFwdActive ? '#34d399' : hasFwd ? '#64748b' : '#334155'}
                  strokeWidth="1.5"
                />
                <line
                  x1="-10"
                  y1="-8"
                  x2="10"
                  y2="-8"
                  stroke={isFwdActive ? '#34d399' : hasFwd ? '#94a3b8' : '#475569'}
                  strokeWidth="2"
                />
                <text x="0" y="-14" textAnchor="middle" fontSize="9" fill={hasFwd ? '#94a3b8' : '#475569'} fontWeight="bold">
                  D_FW
                </text>
                <text x="0" y="19" textAnchor="middle" fontSize="7" fill={isFwdActive ? '#34d399' : hasFwd ? '#64748b' : '#334155'}>
                  {isFwdActive ? 'FWD ON' : hasFwd ? 'FWD' : 'OFF'}
                </text>
              </g>

              {/* Switches */}
              {/* T1 (Top Left, Phase A) */}
              {renderSwitch('T1', 180, 140, isThyristor ? 'T1' : 'D1', 'Ph A (Top)', true)}
              {/* T4 (Bottom Left, Phase A) */}
              {renderSwitch('T4', 180, 280, isThyristor ? 'T4' : 'D4', 'Ph A (Bot)', true)}
              {/* T3 (Top Right, Neutral) */}
              {renderSwitch('T3', 260, 140, isThyristor ? 'T3' : 'D3', 'Neut (Top)', true)}
              {/* T2 (Bottom Right, Neutral) */}
              {renderSwitch('T2', 260, 280, isThyristor ? 'T2' : 'D2', 'Neut (Bot)', true)}

              {/* Wire Node Junctions */}
              <circle cx="180" cy="185" r="3.5" fill="#0ea5e9" />
              <circle cx="260" cy="235" r="3.5" fill="#64748b" />
              <circle cx="400" cy="140" r="3" fill="#64748b" />
              <circle cx="400" cy="280" r="3" fill="#64748b" />
              <circle cx="580" cy="140" r="3.5" fill="#10b981" />
              <circle cx="580" cy="280" r="3.5" fill="#10b981" />

              {/* Terminal Labels */}
              <text x="600" y="144" fontSize="11" fontWeight="bold" fill="#34d399">
                + Vo ({voText})
              </text>
              <text x="600" y="284" fontSize="11" fontWeight="bold" fill="#64748b">
                - Vo (GND)
              </text>

              {/* Phase Wire labels */}
              <text x="135" y="178" fontSize="9" fill="#38bdf8" fontWeight="bold">
                Phase A
              </text>
              <text x="135" y="248" fontSize="9" fill="#94a3b8" fontWeight="bold">
                Neutral (N)
              </text>
            </g>
          )}

          {/* ========================================================
              SINGLE-PHASE HALF-WAVE SCHEMATIC
             ======================================================== */}
          {phase === '1phase' && rectifierType === 'halfwave' && (
            <g>
              {/* Top rail: AC Source -> Diode/Thyristor T1 -> Load */}
              <line x1="90" y1="160" x2="220" y2="160" stroke="#0ea5e9" strokeWidth="2.5" />
              <line x1="220" y1="160" x2="580" y2="160" stroke="#334155" strokeWidth="3" />
              {/* Bottom return rail */}
              <line x1="90" y1="280" x2="580" y2="280" stroke="#64748b" strokeWidth="2.5" />

              {/* Active path glow */}
              {(activeDevs.includes('T1') || activeDevs.includes('D1')) && (
                <g filter="url(#activePathGlow)">
                  <path
                    d="M 90,160 L 580,160 L 580,280 L 90,280"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    className="animate-[dash_1.5s_linear_infinite]"
                  />
                </g>
              )}

              {/* Freewheeling diode */}
              <line
                x1="400"
                y1="160"
                x2="400"
                y2="280"
                stroke={isFwdActive ? '#10b981' : hasFwd ? '#475569' : '#1e293b'}
                strokeWidth={isFwdActive ? '3' : '1.5'}
                strokeDasharray={hasFwd ? undefined : '4 4'}
              />
              <g
                transform="translate(400, 220)"
                onClick={onToggleFwd}
                className="cursor-pointer group"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  fill={isFwdActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(30, 41, 59, 0.4)'}
                  stroke={isFwdActive ? '#10b981' : hasFwd ? '#64748b' : '#334155'}
                  strokeWidth="1.5"
                />
                <polygon
                  points="0,-8 -8,7 8,7"
                  fill={isFwdActive ? '#10b981' : hasFwd ? '#475569' : '#334155'}
                  stroke={isFwdActive ? '#34d399' : hasFwd ? '#64748b' : '#334155'}
                  strokeWidth="1.5"
                />
                <line
                  x1="-9"
                  y1="-8"
                  x2="9"
                  y2="-8"
                  stroke={isFwdActive ? '#34d399' : hasFwd ? '#94a3b8' : '#475569'}
                  strokeWidth="2"
                />
                <text x="0" y="-12" textAnchor="middle" fontSize="8" fill={hasFwd ? '#94a3b8' : '#475569'} fontWeight="bold">
                  D_FW
                </text>
              </g>

              {/* Single Switch T1 */}
              {renderSwitch('T1', 250, 160, isThyristor ? 'T1' : 'D1', 'Series Switch', false)}

              <text x="600" y="164" fontSize="11" fontWeight="bold" fill="#34d399">
                + Vo ({voText})
              </text>
              <text x="600" y="284" fontSize="11" fontWeight="bold" fill="#64748b">
                - Vo (GND)
              </text>
            </g>
          )}

          {/* ========================================================
              THREE-PHASE FULL-WAVE BRIDGE (6-PULSE) SCHEMATIC
             ======================================================== */}
          {phase === '3phase' && rectifierType === 'fullwave' && (
            <g>
              {/* Top Positive DC Bus */}
              <line x1="180" y1="120" x2="580" y2="120" stroke="#334155" strokeWidth="3" />
              {/* Bottom Negative DC Bus */}
              <line x1="180" y1="300" x2="580" y2="300" stroke="#334155" strokeWidth="3" />

              {/* 3 Legs: Leg A (200), Leg B (280), Leg C (360) */}
              <line x1="200" y1="120" x2="200" y2="300" stroke="#334155" strokeWidth="2.5" />
              <line x1="280" y1="120" x2="280" y2="300" stroke="#334155" strokeWidth="2.5" />
              <line x1="360" y1="120" x2="360" y2="300" stroke="#334155" strokeWidth="2.5" />

              {/* 3-Phase AC Infeed lines */}
              {/* Phase A */}
              <path d="M 80,180 L 140,180 L 140,210 L 200,210" fill="none" stroke="#ef4444" strokeWidth="2.5" />
              {/* Phase B */}
              <path d="M 80,210 L 280,210" fill="none" stroke="#eab308" strokeWidth="2.5" />
              {/* Phase C */}
              <path d="M 80,240 L 140,240 L 140,210 L 360,210" fill="none" stroke="#3b82f6" strokeWidth="2.5" />

              {/* Top Switches: T1 (Ph A), T3 (Ph B), T5 (Ph C) */}
              {renderSwitch('T1', 200, 120, isThyristor ? 'T1' : 'D1', 'Ph A (Top)', true)}
              {renderSwitch('T3', 280, 120, isThyristor ? 'T3' : 'D3', 'Ph B (Top)', true)}
              {renderSwitch('T5', 360, 120, isThyristor ? 'T5' : 'D5', 'Ph C (Top)', true)}

              {/* Bottom Switches: T4 (Ph A), T6 (Ph B), T2 (Ph C) */}
              {renderSwitch('T4', 200, 300, isThyristor ? 'T4' : 'D4', 'Ph A (Bot)', true)}
              {renderSwitch('T6', 280, 300, isThyristor ? 'T6' : 'D6', 'Ph B (Bot)', true)}
              {renderSwitch('T2', 360, 300, isThyristor ? 'T2' : 'D2', 'Ph C (Bot)', true)}

              {/* Active conduction loop glow */}
              {activeDevs.length >= 2 && (
                <g filter="url(#activePathGlow)">
                  <path
                    d="M 200,120 L 580,120 L 580,300 L 200,300"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    className="animate-[dash_1.5s_linear_infinite]"
                  />
                </g>
              )}

              {/* Phase labels */}
              <text x="90" y="174" fontSize="9" fill="#ef4444" fontWeight="bold">Phase A (R)</text>
              <text x="90" y="204" fontSize="9" fill="#eab308" fontWeight="bold">Phase B (Y)</text>
              <text x="90" y="234" fontSize="9" fill="#3b82f6" fontWeight="bold">Phase C (B)</text>

              <text x="600" y="124" fontSize="11" fontWeight="bold" fill="#34d399">+ Vo ({voText})</text>
              <text x="600" y="304" fontSize="11" fontWeight="bold" fill="#64748b">- Vo (GND)</text>
            </g>
          )}

          {/* ========================================================
              THREE-PHASE HALF-WAVE (3-PULSE) SCHEMATIC
             ======================================================== */}
          {phase === '3phase' && rectifierType === 'halfwave' && (
            <g>
              {/* Positive Top Bus */}
              <line x1="220" y1="140" x2="580" y2="140" stroke="#334155" strokeWidth="3" />
              {/* Neutral Return Bus */}
              <line x1="60" y1="300" x2="580" y2="300" stroke="#64748b" strokeWidth="2.5" />

              {/* Phase inputs */}
              <path d="M 80,160 L 220,160 L 220,140" fill="none" stroke="#ef4444" strokeWidth="2.5" />
              <path d="M 80,200 L 300,200 L 300,140" fill="none" stroke="#eab308" strokeWidth="2.5" />
              <path d="M 80,240 L 380,240 L 380,140" fill="none" stroke="#3b82f6" strokeWidth="2.5" />

              {/* Switches */}
              {renderSwitch('T1', 220, 140, isThyristor ? 'T1' : 'D1', 'Phase A', true)}
              {renderSwitch('T2', 300, 140, isThyristor ? 'T2' : 'D2', 'Phase B', true)}
              {renderSwitch('T3', 380, 140, isThyristor ? 'T3' : 'D3', 'Phase C', true)}

              <text x="90" y="154" fontSize="9" fill="#ef4444" fontWeight="bold">Phase A</text>
              <text x="90" y="194" fontSize="9" fill="#eab308" fontWeight="bold">Phase B</text>
              <text x="90" y="234" fontSize="9" fill="#3b82f6" fontWeight="bold">Phase C</text>
              <text x="90" y="294" fontSize="9" fill="#94a3b8" fontWeight="bold">Neutral Star (N)</text>

              <text x="600" y="144" fontSize="11" fontWeight="bold" fill="#34d399">+ Vo ({voText})</text>
              <text x="600" y="304" fontSize="11" fontWeight="bold" fill="#64748b">- Vo (Star N)</text>
            </g>
          )}

          {/* ========================================================
              AC SOURCE SYMBOL (Left Side)
             ======================================================== */}
          {phase === '1phase' ? (
            <g transform="translate(60, 210)">
              {/* Outer AC Source Circle */}
              <circle
                cx="0"
                cy="0"
                r="24"
                fill="#0f172a"
                stroke="#0ea5e9"
                strokeWidth="2"
                className="drop-shadow-md"
              />
              {/* Sinewave path symbol */}
              <path
                d="M -14,0 Q -7,-14 0,0 Q 7,14 14,0"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* AC Source label & instantaneous voltage */}
              <text x="0" y="38" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f8fafc">
                AC Source
              </text>
              <text x="0" y="50" textAnchor="middle" fontSize="9" fill="#38bdf8" fontFamily="monospace">
                vs = {vsText}
              </text>
            </g>
          ) : (
            <g transform="translate(45, 210)">
              <circle cx="0" cy="0" r="24" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
              <text x="0" y="-4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#a5b4fc">
                3Φ
              </text>
              <text x="0" y="8" textAnchor="middle" fontSize="8" fill="#818cf8">
                Supply
              </text>
              <text x="0" y="38" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                va = {vsText}
              </text>
            </g>
          )}

          {/* ========================================================
              LOAD BOX (Right Side)
             ======================================================== */}
          <g transform={`translate(580, ${phase === '3phase' && rectifierType === 'fullwave' ? 210 : 210})`}>
            {/* Load Outer Enclosure */}
            <rect
              x="-24"
              y="-55"
              width="48"
              height="110"
              rx="10"
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#0284c7"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Load Type Badge Header */}
            <rect x="-20" y="-50" width="40" height="15" rx="3" fill="#0369a1" />
            <text x="0" y="-39" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e0f2fe">
              {loadType} Load
            </text>

            {/* Resistor zigzag symbol */}
            <path
              d="M -12,-25 L -6,-21 L 6,-29 L -6,-33 L 6,-37 L 0,-40"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <text x="0" y="-12" textAnchor="middle" fontSize="8" fill="#fde68a" fontWeight="semibold">
              R = {r} Ω
            </text>

            {/* Inductor coils symbol (if RL or RLE) */}
            {loadType !== 'R' && (
              <g transform="translate(0, 8)">
                <path
                  d="M -14,0 A 5,5 0 0,1 -4,0 A 5,5 0 0,1 6,0 A 5,5 0 0,1 14,0"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="14" textAnchor="middle" fontSize="8" fill="#bae6fd" fontWeight="semibold">
                  L = {l} mH
                </text>
              </g>
            )}

            {/* DC Source Back-EMF E (if RLE) */}
            {loadType === 'RLE' && (
              <g transform="translate(0, 32)">
                <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="-6" y1="4" x2="6" y2="4" stroke="#94a3b8" strokeWidth="2" />
                <text x="0" y="16" textAnchor="middle" fontSize="8" fill="#fca5a5" fontWeight="semibold">
                  E = {e} V
                </text>
              </g>
            )}

            {/* Live Current Badge */}
            <rect
              x="-35"
              y="62"
              width="70"
              height="20"
              rx="5"
              fill="#064e3b"
              stroke="#059669"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="75"
              textAnchor="middle"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              fill="#34d399"
            >
              i = {ioText} ▶
            </text>
          </g>
        </svg>
      </div>

      {/* Footer Hint Bar */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>
            {isThyristor ? 'Thyristor Gate Triggered mode' : 'Natural Diode Commutation mode'}
            {hasFwd && ' • Freewheeling Diode (FWD) Active'}
          </span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Live Angle: <span className="text-cyan-400 font-bold">{currentPoint.deg.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
};
