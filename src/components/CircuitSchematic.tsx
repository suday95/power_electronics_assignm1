import React, { useMemo, useRef } from 'react';
import { CircuitParams, WaveformPoint } from '../types';
import { controlMode, deviceTypeOf } from '../engine/simulationMath';
import { useElementFullscreen } from '../hooks';
import { Cpu, Lightbulb, Maximize2, Minimize2, Zap } from 'lucide-react';

interface CircuitSchematicProps {
  params: CircuitParams;
  currentPoint: WaveformPoint;
  isPlaying: boolean;
  onToggleDevice: (n: number) => void;
  onToggleFwd: () => void;
}

type Pt = [number, number];

const TOP = 110;
const BOT = 350;
const LX = 650; // load branch x
const FX = 550; // freewheeling diode branch x

interface DeviceSpec {
  n: number;
  x: number;
  y: number;
  node: 0 | 1 | 2;
  group: 'top' | 'bot';
  horizontal?: boolean;
  sub: string;
}

interface Topology {
  devices: DeviceSpec[];
  feeds: Record<string, Pt[]>; // source terminal -> circuit node polylines (last point = node)
  feedClass: Record<string, string>;
  legs: { x: number; y0: number; y1: number }[];
  railX0: number;
  bottomRailX0: number;
  hasBottom: boolean;
}

const FEED_KEYS = ['A', 'B', 'C'];

function buildTopology(phase: CircuitParams['phase'], rectifierType: CircuitParams['rectifierType']): Topology {
  const topY = TOP + 50;
  const botY = BOT - 50;

  if (phase === '1phase' && rectifierType === 'halfwave') {
    return {
      devices: [{ n: 1, x: 230, y: TOP, node: 0, group: 'top', horizontal: true, sub: 'Series switch' }],
      feeds: { A: [[50, 206], [50, TOP]], N: [[50, 254], [50, BOT]] },
      feedClass: { A: 'stroke-sky-500', N: 'stroke-slate-500' },
      legs: [],
      railX0: 50,
      bottomRailX0: 50,
      hasBottom: false
    };
  }
  if (phase === '1phase') {
    return {
      devices: [
        { n: 1, x: 250, y: topY, node: 0, group: 'top', sub: 'Line (top)' },
        { n: 3, x: 380, y: topY, node: 1, group: 'top', sub: 'Neutral (top)' },
        { n: 4, x: 250, y: botY, node: 0, group: 'bot', sub: 'Line (bottom)' },
        { n: 2, x: 380, y: botY, node: 1, group: 'bot', sub: 'Neutral (bottom)' }
      ],
      feeds: {
        A: [[50, 206], [50, 200], [250, 200]],
        N: [[50, 254], [50, 260], [380, 260]]
      },
      feedClass: { A: 'stroke-sky-500', N: 'stroke-slate-500' },
      legs: [{ x: 250, y0: TOP, y1: BOT }, { x: 380, y0: TOP, y1: BOT }],
      railX0: 250,
      bottomRailX0: 250,
      hasBottom: true
    };
  }
  const feeds: Record<string, Pt[]> = {
    A: [[80, 195], [220, 195]],
    B: [[80, 230], [320, 230]],
    C: [[80, 265], [420, 265]]
  };
  const feedClass = { A: 'stroke-red-500', B: 'stroke-yellow-500', C: 'stroke-blue-500', N: 'stroke-slate-500' };
  if (rectifierType === 'halfwave') {
    return {
      devices: [
        { n: 1, x: 220, y: topY, node: 0, group: 'top', sub: 'Phase A' },
        { n: 2, x: 320, y: topY, node: 1, group: 'top', sub: 'Phase B' },
        { n: 3, x: 420, y: topY, node: 2, group: 'top', sub: 'Phase C' }
      ],
      feeds: { ...feeds, N: [[53, 290], [53, BOT]] },
      feedClass,
      legs: [{ x: 220, y0: TOP, y1: 195 }, { x: 320, y0: TOP, y1: 230 }, { x: 420, y0: TOP, y1: 265 }],
      railX0: 220,
      bottomRailX0: 53,
      hasBottom: false
    };
  }
  return {
    devices: [
      { n: 1, x: 220, y: topY, node: 0, group: 'top', sub: 'Phase A (top)' },
      { n: 3, x: 320, y: topY, node: 1, group: 'top', sub: 'Phase B (top)' },
      { n: 5, x: 420, y: topY, node: 2, group: 'top', sub: 'Phase C (top)' },
      { n: 4, x: 220, y: botY, node: 0, group: 'bot', sub: 'Phase A (bottom)' },
      { n: 6, x: 320, y: botY, node: 1, group: 'bot', sub: 'Phase B (bottom)' },
      { n: 2, x: 420, y: botY, node: 2, group: 'bot', sub: 'Phase C (bottom)' }
    ],
    feeds,
    feedClass,
    legs: [{ x: 220, y0: TOP, y1: BOT }, { x: 320, y0: TOP, y1: BOT }, { x: 420, y0: TOP, y1: BOT }],
    railX0: 220,
    bottomRailX0: 220,
    hasBottom: true
  };
}

const feedKey = (phase: CircuitParams['phase'], node: number) =>
  phase === '3phase' ? FEED_KEYS[node] : node === 0 ? 'A' : 'N';

/** Conventional-current path for the conducting devices. */
function conductionPath(
  topo: Topology,
  phase: CircuitParams['phase'],
  topN: number | null,
  botN: number | null,
  fwd: boolean
): Pt[] {
  if (fwd) return [[FX, BOT], [FX, TOP], [LX, TOP], [LX, BOT], [FX, BOT]];
  const td = topo.devices.find(d => d.n === topN);
  if (!td) return [];
  const bd = botN !== null ? topo.devices.find(d => d.n === botN) : undefined;
  const fT = topo.feeds[feedKey(phase, td.node)];
  const nodeT = fT[fT.length - 1];

  if (bd && bd.node === td.node) {
    // Freewheeling inside the bridge (same leg): the source is bypassed.
    return [nodeT, [td.x, TOP], [LX, TOP], [LX, BOT], [bd.x, BOT], nodeT];
  }
  const pts: Pt[] = [...fT, [td.x, TOP], [LX, TOP], [LX, BOT]];
  if (bd) {
    const fB = topo.feeds[feedKey(phase, bd.node)];
    pts.push([bd.x, BOT], ...[...fB].reverse());
  } else {
    pts.push(...[...topo.feeds.N].reverse());
  }
  return pts;
}

const toPoints = (pts: Pt[]) => pts.map(p => p.join(',')).join(' ');

interface SwitchProps {
  spec: DeviceSpec;
  isThyristor: boolean;
  active: boolean;
  gating: boolean;
  onToggle: (n: number) => void;
}

const Switch: React.FC<SwitchProps> = ({ spec, isThyristor, active, gating, onToggle }) => {
  const id = `${isThyristor ? 'T' : 'D'}${spec.n}`;
  const lead = active ? 'stroke-emerald-400' : 'stroke-slate-500';
  const label = `${id} (${spec.sub}) – click to switch to ${isThyristor ? 'diode' : 'thyristor'}`;
  return (
    <g
      transform={`translate(${spec.x}, ${spec.y})`}
      className="cursor-pointer outline-none group"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onToggle(spec.n)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(spec.n);
        }
      }}
    >
      <title>{label}</title>
      <rect x="-30" y="-30" width="60" height="60" rx="8" className="fill-transparent group-hover:fill-cyan-500/10 group-focus-visible:fill-cyan-500/10 transition-colors" />
      {active && <circle r="27" className="fill-emerald-500/20" />}
      <g transform={spec.horizontal ? 'rotate(90)' : undefined}>
        <line y1="-24" y2="-10" strokeWidth="2.5" className={lead} />
        <line y1="10" y2="24" strokeWidth="2.5" className={lead} />
        <polygon
          points="0,-10 -11,10 11,10"
          strokeWidth="1.5"
          className={active ? 'fill-emerald-500 stroke-emerald-300' : 'fill-slate-700 stroke-slate-500'}
        />
        <line x1="-13" y1="-10" x2="13" y2="-10" strokeWidth="2.5" strokeLinecap="round" className={active ? 'stroke-emerald-300' : 'stroke-slate-400'} />
        {isThyristor && (
          <>
            <path
              d="M -5,3 L -14,12 L -22,12"
              fill="none"
              strokeWidth={gating ? 2.5 : 1.5}
              strokeLinecap="round"
              className={gating ? 'stroke-amber-400' : active ? 'stroke-amber-500' : 'stroke-slate-500'}
            />
            <text x="-24" y="15" textAnchor="end" fontSize="8" fontWeight="bold" className={gating ? 'fill-amber-400' : 'fill-slate-500'}>
              G
            </text>
          </>
        )}
      </g>
      {spec.horizontal ? (
        <>
          <text y="-30" textAnchor="middle" fontSize="11" fontWeight="bold" className={active ? 'fill-emerald-300' : 'fill-slate-300'}>{id}</text>
          <text y="42" textAnchor="middle" fontSize="9" fontWeight="bold" className={active ? 'fill-emerald-400' : 'fill-slate-500'}>{active ? 'ON' : 'OFF'}</text>
        </>
      ) : (
        <>
          <text x="20" y="-2" fontSize="11" fontWeight="bold" className={active ? 'fill-emerald-300' : 'fill-slate-300'}>{id}</text>
          <text x="20" y="11" fontSize="9" fontWeight="bold" className={active ? 'fill-emerald-400' : 'fill-slate-500'}>{active ? 'ON' : 'OFF'}</text>
        </>
      )}
    </g>
  );
};

const signed = (x: number, digits: number, unit: string) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)} ${unit}`;

export const CircuitSchematic: React.FC<CircuitSchematicProps> = React.memo(
  ({ params, currentPoint, isPlaying, onToggleDevice, onToggleFwd }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, toggleFullscreen] = useElementFullscreen(rootRef);

    const { phase, rectifierType, loadType, hasFwd, r, l, e } = params;
    const topo = useMemo(() => buildTopology(phase, rectifierType), [phase, rectifierType]);
    const mode = controlMode(params);
    const activeIds = currentPoint.activeDevices;
    const activeKey = activeIds.join(',');
    const isFwdActive = activeIds.includes('D_FW');
    const gating = currentPoint.gateDevices;

    // Active conduction path
    const flowPoints = useMemo(() => {
      const nums = activeIds.filter(a => a !== 'D_FW').map(a => parseInt(a.slice(1), 10));
      const groupOf = (n: number) => topo.devices.find(d => d.n === n)?.group;
      const topN = nums.find(n => groupOf(n) === 'top') ?? null;
      const botN = nums.find(n => groupOf(n) === 'bot') ?? null;
      if (isFwdActive) return toPoints(conductionPath(topo, phase, null, null, true));
      if (topN === null) return '';
      return toPoints(conductionPath(topo, phase, topN, topo.hasBottom ? botN : null, false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey, topo, phase]);

    const topologyBadge = `${phase === '1phase' ? '1-PHASE' : '3-PHASE'} ${rectifierType === 'fullwave' ? 'FULL-BRIDGE' : 'HALF-WAVE'}${
      mode === 'semi' ? ' (SEMI-CONVERTER)' : mode === 'mixed' ? ' (MIXED)' : mode === 'diode' ? ' · DIODE' : ' · THYRISTOR'
    }`;

    // Load branch layout (R, L, optional E stacked between the rails)
    const loadItems: { type: 'R' | 'L' | 'E'; h: number }[] = [{ type: 'R', h: 52 }];
    if (loadType !== 'R') loadItems.push({ type: 'L', h: 40 });
    if (loadType === 'RLE') loadItems.push({ type: 'E', h: 26 });
    const sumH = loadItems.reduce((s, it) => s + it.h, 0);
    const gap = (BOT - TOP - sumH) / (loadItems.length + 1);
    let cursor = TOP + gap;
    const placed = loadItems.map(it => {
      const y = cursor;
      cursor += it.h + gap;
      return { ...it, y };
    });

    const mid = (TOP + BOT) / 2;

    return (
      <div
        ref={rootRef}
        className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${isFullscreen ? 'h-screen bg-slate-950' : 'h-full'} ${isPlaying ? '' : 'flow-paused'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">Circuit Schematic Diagram</h2>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
                {topologyBadge}
              </span>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-800/60 bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-300 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`${isPlaying ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold shrink-0">Active conduction</span>
            <span className="text-xs font-semibold text-emerald-200 truncate" title={currentPoint.loopDescription}>
              {currentPoint.loopDescription}
            </span>
          </div>
        </div>

        <div className="flex-1 lg:min-h-[360px] p-2 flex flex-col items-center justify-center bg-radial from-slate-900 to-slate-950 overflow-x-auto">
          <div className="w-full flex items-center gap-2 px-2 text-[11px] text-slate-400 flex-wrap">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Click a switch to toggle <b className="text-cyan-400">Diode (D)</b> ↔ <b className="text-amber-400">Thyristor (T)</b>.</span>
            <span className="inline-flex items-center gap-1 ml-auto"><i className="w-3 h-0.5 bg-emerald-400 inline-block" />Live current</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 h-0.5 bg-slate-500 inline-block" />Blocking</span>
          </div>

          <svg viewBox="0 0 760 420" className="w-full min-w-[600px] h-auto max-h-[480px] select-none" role="img" aria-label={`Schematic of a ${topologyBadge} rectifier`}>
            <defs>
              <pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.75" className="fill-slate-800" />
              </pattern>
            </defs>
            <rect width="760" height="420" fill="url(#circuitGrid)" />

            {/* Static wiring */}
            <g fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-slate-600">
              <polyline points={`${topo.railX0},${TOP} ${LX},${TOP}`} />
              <polyline points={`${topo.bottomRailX0},${BOT} ${LX},${BOT}`} />
              {topo.legs.map(leg => (
                <line key={leg.x} x1={leg.x} y1={leg.y0} x2={leg.x} y2={leg.y1} strokeWidth="2.5" />
              ))}
              {Object.entries(topo.feeds).map(([k, pts]) => (
                <polyline key={k} points={toPoints(pts)} strokeWidth="2.5" className={topo.feedClass[k]} />
              ))}
            </g>

            {/* Freewheeling diode branch */}
            <g
              className="cursor-pointer outline-none group"
              role="button"
              tabIndex={0}
              aria-label={`Freewheeling diode – click to ${hasFwd ? 'remove' : 'add'}`}
              onClick={onToggleFwd}
              onKeyDown={ev => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onToggleFwd();
                }
              }}
            >
              <title>{hasFwd ? 'Freewheeling diode fitted – click to remove' : 'Click to add a freewheeling diode across the load'}</title>
              <rect x={FX - 30} y={TOP + 30} width="60" height={BOT - TOP - 60} className="fill-transparent group-hover:fill-cyan-500/10 group-focus-visible:fill-cyan-500/10" />
              <line
                x1={FX} y1={TOP} x2={FX} y2={BOT}
                strokeWidth={hasFwd ? 2.5 : 1.5}
                strokeDasharray={hasFwd ? undefined : '5 5'}
                className={isFwdActive ? 'stroke-emerald-400' : hasFwd ? 'stroke-slate-500' : 'stroke-slate-700'}
              />
              <g transform={`translate(${FX}, ${mid})`} opacity={hasFwd ? 1 : 0.55}>
                <rect x="-16" y="-20" width="32" height="40" className="fill-slate-900" />
                <polygon points="0,-10 -11,10 11,10" strokeWidth="1.5" className={isFwdActive ? 'fill-emerald-500 stroke-emerald-300' : 'fill-slate-700 stroke-slate-500'} />
                <line x1="-13" y1="-10" x2="13" y2="-10" strokeWidth="2.5" strokeLinecap="round" className={isFwdActive ? 'stroke-emerald-300' : 'stroke-slate-400'} />
                <text x="20" y="-2" fontSize="11" fontWeight="bold" className={isFwdActive ? 'fill-emerald-300' : 'fill-slate-400'}>D_FW</text>
                <text x="20" y="11" fontSize="9" fontWeight="bold" className={isFwdActive ? 'fill-emerald-400' : 'fill-slate-500'}>
                  {isFwdActive ? 'ON' : hasFwd ? 'OFF' : 'not fitted'}
                </text>
              </g>
            </g>
            <circle cx={FX} cy={TOP} r="3.5" className="fill-slate-500" />
            <circle cx={FX} cy={BOT} r="3.5" className="fill-slate-500" />

            {/* Live current flow */}
            {flowPoints && (
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={flowPoints} strokeWidth="9" className="stroke-emerald-500/20" />
                <polyline points={flowPoints} strokeWidth="3.5" strokeDasharray="8 6" className="flow-path stroke-emerald-400" />
              </g>
            )}

            {/* Switches */}
            {topo.devices.map(d => {
              const isT = deviceTypeOf(params, d.n) === 'thyristor';
              const id = `${isT ? 'T' : 'D'}${d.n}`;
              return (
                <Switch
                  key={d.n}
                  spec={d}
                  isThyristor={isT}
                  active={activeIds.includes(id)}
                  gating={gating.includes(id)}
                  onToggle={onToggleDevice}
                />
              );
            })}

            {/* Node dots */}
            {Object.values(topo.feeds).map((pts, k) => (
              <circle key={k} cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" className="fill-slate-300" />
            ))}
            <circle cx={LX} cy={TOP} r="3.5" className="fill-emerald-500" />
            <circle cx={LX} cy={BOT} r="3.5" className="fill-emerald-500" />

            {/* Source */}
            {phase === '1phase' ? (
              <g transform="translate(50, 230)">
                <circle r="24" strokeWidth="2" className="fill-slate-900 stroke-sky-500" />
                <path d="M -14,0 Q -7,-14 0,0 Q 7,14 14,0" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-sky-400" />
                <text y="42" textAnchor="middle" fontSize="10" fontWeight="bold" className="fill-slate-200">AC Source</text>
                <text y="55" textAnchor="middle" fontSize="9" fontFamily="monospace" className="fill-sky-400">vs = {signed(currentPoint.vs, 1, 'V')}</text>
              </g>
            ) : (
              <g>
                <rect x="26" y="170" width="54" height="120" rx="10" strokeWidth="2" className="fill-slate-900 stroke-indigo-500" />
                <text x="53" y="226" textAnchor="middle" fontSize="12" fontWeight="bold" className="fill-indigo-300">3Φ</text>
                <text x="53" y="240" textAnchor="middle" fontSize="8" className="fill-indigo-400">{params.vRms} V L-L</text>
                {[['A', 195, 'fill-red-500'], ['B', 230, 'fill-yellow-500'], ['C', 265, 'fill-blue-500']].map(([k, y, c]) => (
                  <text key={k as string} x="70" y={(y as number) + 3} textAnchor="end" fontSize="9" fontWeight="bold" className={c as string}>{k}</text>
                ))}
                {rectifierType === 'halfwave' && <text x="53" y="284" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400">N</text>}
                <text x="53" y="318" textAnchor="middle" fontSize="8.5" fontFamily="monospace" className="fill-red-400">va {signed(currentPoint.vs, 0, 'V')}</text>
                <text x="53" y="330" textAnchor="middle" fontSize="8.5" fontFamily="monospace" className="fill-yellow-500">vb {signed(currentPoint.vsB ?? 0, 0, 'V')}</text>
                <text x="53" y="342" textAnchor="middle" fontSize="8.5" fontFamily="monospace" className="fill-blue-400">vc {signed(currentPoint.vsC ?? 0, 0, 'V')}</text>
              </g>
            )}

            {/* Load branch */}
            <g transform={`translate(${LX}, 0)`}>
              <line x1="0" y1={TOP} x2="0" y2={BOT} strokeWidth="2.5" className="stroke-slate-600" />
              {placed.map(it => (
                <g key={it.type} transform={`translate(0, ${it.y})`}>
                  <rect x="-14" y="-2" width="28" height={it.h + 4} className="fill-slate-900" />
                  {it.type === 'R' && (
                    <>
                      <path d={`M 0,0 L 0,5 L -9,10 L 9,18 L -9,26 L 9,34 L -9,42 L 0,47 L 0,${it.h}`} fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-amber-400" />
                      <text x="18" y={it.h / 2 + 3} fontSize="10" fontWeight="600" className="fill-amber-300">R = {r} Ω</text>
                    </>
                  )}
                  {it.type === 'L' && (
                    <>
                      <path d="M 0,0 L 0,4 A 6,6 0 0 1 0,16 A 6,6 0 0 1 0,28 A 6,6 0 0 1 0,40" fill="none" strokeWidth="2" className="stroke-sky-400" />
                      <text x="18" y={it.h / 2 + 3} fontSize="10" fontWeight="600" className="fill-sky-300">L = {l} mH</text>
                    </>
                  )}
                  {it.type === 'E' && (
                    <>
                      <line x1="0" y1="0" x2="0" y2="9" strokeWidth="2" className="stroke-red-400" />
                      <line x1="-12" y1="9" x2="12" y2="9" strokeWidth="3" className="stroke-red-400" />
                      <line x1="-6" y1="16" x2="6" y2="16" strokeWidth="2.5" className="stroke-slate-400" />
                      <line x1="0" y1="16" x2="0" y2={it.h} strokeWidth="2" className="stroke-slate-400" />
                      <text x="18" y="16" fontSize="10" fontWeight="600" className="fill-red-300">E = {e} V</text>
                    </>
                  )}
                </g>
              ))}
              <rect x="-36" y={BOT + 14} width="86" height="20" rx="5" strokeWidth="1.5" className="fill-emerald-950 stroke-emerald-600" />
              <text x="7" y={BOT + 28} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" className="fill-emerald-400">
                i = {currentPoint.io.toFixed(2)} A ▼
              </text>
            </g>
            <text x={LX - 8} y={TOP - 12} textAnchor="end" fontSize="11" fontWeight="bold" className="fill-emerald-400">
              + Vo ({signed(currentPoint.vo, 1, 'V')})
            </text>
            <text x={LX - 8} y={BOT - 8} textAnchor="end" fontSize="11" fontWeight="bold" className="fill-slate-400">
              − Vo
            </text>
          </svg>
        </div>

        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {mode === 'diode' && 'Natural diode commutation'}
              {mode === 'full' && 'Thyristor gate-triggered (fully controlled)'}
              {mode === 'semi' && 'Half-controlled bridge (semi-converter)'}
              {mode === 'mixed' && 'Mixed diode / thyristor bridge'}
              {' • '}
              <span className={isFwdActive ? 'text-emerald-400 font-semibold' : ''}>
                FWD: {isFwdActive ? 'conducting' : hasFwd ? 'fitted (idle)' : 'not fitted'}
              </span>
            </span>
          </div>
          <div className="font-mono text-[10px]">
            ωt = <span className="text-cyan-400 font-bold">{(currentPoint.deg % 360).toFixed(1)}°</span>
          </div>
        </div>
      </div>
    );
  }
);
CircuitSchematic.displayName = 'CircuitSchematic';
