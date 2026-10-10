import React, { useMemo, useRef, useState } from 'react';
import { CircuitParams, GateEvent, HarmonicItem, PerformanceMetrics, WaveformPoint } from '../types';
import { useElementFullscreen } from '../hooks';
import { Activity, BarChart3, Layers, Maximize2, Minimize2 } from 'lucide-react';

interface WaveformOscilloscopeProps {
  params: CircuitParams;
  points: WaveformPoint[];
  metrics: PerformanceMetrics;
  harmonics: HarmonicItem[];
  gateEvents: GateEvent[];
  currentAngle: number;
  currentPoint: WaveformPoint;
  onScrub: (angle: number) => void;
  isTwoCycles: boolean;
  onToggleTwoCycles: () => void;
}

type TabType = 'superimposed' | 'channels' | 'harmonics';
type TraceKey = 'vs' | 'vsB' | 'vsC' | 'vo' | 'is' | 'io';

// ---- plot geometry (viewBox units) -------------------------------------
const VBW = 720;
const VBH = 392;
const PL = 54;
const PR = 16;
const PW = VBW - PL - PR;
const V_C = 100; // voltage zero line
const V_H = 68;  // voltage half-height
const I_C = 270; // current zero line
const I_H = 52;
const GATE_Y = 334;
const TL_Y = 360;

const COLORS = {
  vs: '#38bdf8',
  vA: '#f87171',
  vB: '#facc15',
  vC: '#60a5fa',
  vo: '#10b981',
  io: '#f59e0b',
  is: '#818cf8',
  avg: '#a855f7'
};

const niceMax = (x: number) => {
  if (x <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
};

const fmtTick = (x: number) => (Math.abs(x) >= 100 || Number.isInteger(x) ? x.toFixed(0) : x.toFixed(1));
const signed = (x: number, d: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d)}`;

/** Pointer-driven scrubbing over an SVG: maps the pointer to a 0..span angle. */
function useScrub(span: number, padL: number, plotW: number, vbw: number, onScrub: (a: number) => void) {
  const dragging = useRef(false);
  const toAngle = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xv = ((e.clientX - rect.left) / rect.width) * vbw;
    const ratio = Math.min(1, Math.max(0, (xv - padL) / plotW));
    return Math.min(ratio * span, span - 0.01);
  };
  return {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      onScrub(toAngle(e));
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragging.current) onScrub(toAngle(e));
    },
    onPointerUp: () => {
      dragging.current = false;
    },
    onPointerCancel: () => {
      dragging.current = false;
    }
  };
}

interface Segment {
  start: number;
  end: number;
  text: string;
  kind: 'off' | 'fw' | 'on';
}

function buildSegments(points: WaveformPoint[], span: number): Segment[] {
  const segs: Segment[] = [];
  const kindOf = (p: WaveformPoint): Segment['kind'] =>
    p.activeDevices.length === 0 ? 'off' : p.activeDevices.includes('D_FW') || p.loopDescription.startsWith('Freewheeling') ? 'fw' : 'on';
  const textOf = (p: WaveformPoint) => (p.activeDevices.length ? p.activeDevices.join(' ') : 'OFF');
  let cur = { text: textOf(points[0]), kind: kindOf(points[0]), start: 0 };
  for (let i = 1; i < points.length; i++) {
    const t = textOf(points[i]);
    const k = kindOf(points[i]);
    if (t !== cur.text || k !== cur.kind) {
      segs.push({ start: cur.start, end: points[i].deg, text: cur.text, kind: cur.kind });
      cur = { text: t, kind: k, start: points[i].deg };
    }
  }
  segs.push({ start: cur.start, end: span, text: cur.text, kind: cur.kind });
  return segs;
}

// ---- static layer: grid, axes, traces, timeline (memoised) -------------
interface PlotLayerProps {
  points: WaveformPoint[];
  span: number;
  maxV: number;
  maxI: number;
  showGrid: boolean;
  showVavg: boolean;
  vAvg: number;
  gateEvents: GateEvent[];
  is3: boolean;
}

const PlotLayer = React.memo(({ points, span, maxV, maxI, showGrid, showVavg, vAvg, gateEvents, is3 }: PlotLayerProps) => {
  const x = (deg: number) => PL + (deg / span) * PW;
  const yV = (v: number) => V_C - (v / maxV) * V_H;
  const yI = (i: number) => I_C - (i / maxI) * I_H;

  const paths = useMemo(() => {
    const build = (key: TraceKey, yf: (v: number) => number) => {
      let d = '';
      for (let i = 0; i < points.length; i += 2) {
        const p = points[i];
        d += `${i === 0 ? 'M' : 'L'}${x(p.deg).toFixed(1)},${yf((p[key] as number) ?? 0).toFixed(1)}`;
      }
      const first = points[0];
      return d + `L${x(span).toFixed(1)},${yf((first[key] as number) ?? 0).toFixed(1)}`;
    };
    return {
      vs: build('vs', yV),
      vsB: is3 ? build('vsB', yV) : '',
      vsC: is3 ? build('vsC', yV) : '',
      vo: build('vo', yV),
      is: build('is', yI),
      io: build('io', yI)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, span, maxV, maxI, is3]);

  const segments = useMemo(() => buildSegments(points, span), [points, span]);
  const degTicks = span === 720 ? [0, 90, 180, 270, 360, 450, 540, 630, 720] : [0, 45, 90, 135, 180, 225, 270, 315, 360];
  const cycles = span / 360;
  const gateW = Math.max(2.5, (6 / span) * PW);

  return (
    <g>
      <rect width={VBW} height={VBH} className="fill-slate-950" />

      {showGrid && (
        <g strokeWidth="0.6" strokeDasharray="3 3" className="stroke-slate-800">
          {degTicks.map(d => (
            <line key={d} x1={x(d)} y1="28" x2={x(d)} y2="320" />
          ))}
          {[-1, -0.5, 0.5, 1].map(f => (
            <line key={`v${f}`} x1={PL} y1={yV(f * maxV)} x2={PL + PW} y2={yV(f * maxV)} />
          ))}
          {[-1, -0.5, 0.5, 1].map(f => (
            <line key={`i${f}`} x1={PL} y1={yI(f * maxI)} x2={PL + PW} y2={yI(f * maxI)} />
          ))}
        </g>
      )}

      {/* zero lines */}
      <line x1={PL} y1={V_C} x2={PL + PW} y2={V_C} strokeWidth="1.2" className="stroke-slate-600" />
      <line x1={PL} y1={I_C} x2={PL + PW} y2={I_C} strokeWidth="1.2" className="stroke-slate-600" />
      <line x1={PL} y1="28" x2={PL} y2="320" strokeWidth="1" className="stroke-slate-600" />

      {/* titles */}
      <text x={PL + 4} y="20" fontSize="10" fontWeight="bold" className="fill-slate-300">
        {is3 ? 'Voltages: phase voltages & v_o' : 'Voltages: v_s & v_o superimposed'}
      </text>
      <text x={PL + 4} y="206" fontSize="10" fontWeight="bold" className="fill-slate-300">Currents: i_o (load) & i_s (supply line)</text>

      {/* legends */}
      <g fontSize="9" fontFamily="monospace">
        {(is3
          ? [['v_a', COLORS.vA], ['v_b', COLORS.vB], ['v_c', COLORS.vC], ['v_o', COLORS.vo]]
          : [['v_s', COLORS.vs], ['v_o', COLORS.vo]]
        ).map(([label, c], k, arr) => (
          <g key={label} transform={`translate(${PL + PW - (arr.length - k) * 48}, 12)`}>
            <line x2="14" y1="-3" y2="-3" stroke={c} strokeWidth="2.5" />
            <text x="18" className="fill-slate-400">{label}</text>
          </g>
        ))}
        {[['i_o', COLORS.io], ['i_s', COLORS.is]].map(([label, c], k) => (
          <g key={label} transform={`translate(${PL + PW - (2 - k) * 48}, 198)`}>
            <line x2="14" y1="-3" y2="-3" stroke={c} strokeWidth="2.5" />
            <text x="18" className="fill-slate-400">{label}</text>
          </g>
        ))}
      </g>

      {/* y labels */}
      <g fontSize="8" textAnchor="end" fontFamily="monospace" className="fill-slate-500">
        {[1, 0.5, 0, -0.5, -1].map(f => (
          <text key={`vl${f}`} x={PL - 5} y={yV(f * maxV) + 3}>{f === 0 ? '0 V' : `${fmtTick(f * maxV)}`}</text>
        ))}
        {[1, 0.5, 0, -0.5, -1].map(f => (
          <text key={`il${f}`} x={PL - 5} y={yI(f * maxI) + 3}>{f === 0 ? '0 A' : `${fmtTick(f * maxI)}`}</text>
        ))}
        {degTicks.map(d => (
          <text key={`dl${d}`} x={x(d)} y="180" textAnchor="middle">{d}°</text>
        ))}
      </g>

      {/* average output voltage */}
      {showVavg && (
        <g>
          <line x1={PL} y1={yV(vAvg)} x2={PL + PW} y2={yV(vAvg)} stroke={COLORS.avg} strokeWidth="1.4" strokeDasharray="5 4" />
          <text x={PL + PW - 4} y={yV(vAvg) - 4} textAnchor="end" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="#c084fc">
            V_dc = {vAvg.toFixed(1)} V
          </text>
        </g>
      )}

      {/* voltage traces */}
      <g fill="none" strokeLinejoin="round">
        {is3 ? (
          <>
            <path d={paths.vs} stroke={COLORS.vA} strokeWidth="1.2" strokeDasharray="4 2" opacity="0.8" />
            <path d={paths.vsB} stroke={COLORS.vB} strokeWidth="1.2" strokeDasharray="4 2" opacity="0.8" />
            <path d={paths.vsC} stroke={COLORS.vC} strokeWidth="1.2" strokeDasharray="4 2" opacity="0.8" />
          </>
        ) : (
          <path d={paths.vs} stroke={COLORS.vs} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.9" />
        )}
        <path d={paths.vo} stroke={COLORS.vo} strokeWidth="2.4" />
        <path d={paths.is} stroke={COLORS.is} strokeWidth="1.8" opacity="0.9" />
        <path d={paths.io} stroke={COLORS.io} strokeWidth="2.4" />
      </g>

      {/* gate pulse train */}
      {gateEvents.length > 0 && (
        <g>
          <text x={PL - 5} y={GATE_Y + 10} textAnchor="end" fontSize="7.5" fontWeight="bold" className="fill-slate-500">GATE</text>
          <line x1={PL} y1={GATE_Y + 12} x2={PL + PW} y2={GATE_Y + 12} strokeWidth="0.8" className="stroke-slate-700" />
          {Array.from({ length: cycles }).flatMap((_, c) =>
            gateEvents.map(g => {
              const gx = x(g.deg + c * 360);
              return (
                <g key={`${c}-${g.deg}`}>
                  <rect x={gx} y={GATE_Y + 2} width={gateW} height="10" fill="#f59e0b" opacity="0.95" />
                  <text x={gx + gateW / 2} y={GATE_Y - 1} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#f59e0b">
                    {g.devices.join(',')}
                  </text>
                </g>
              );
            })
          )}
        </g>
      )}

      {/* conduction timeline */}
      <g transform={`translate(${PL}, ${TL_Y})`}>
        <text x="-5" y="9" textAnchor="end" fontSize="7.5" fontWeight="bold" className="fill-slate-500">ACTIVE</text>
        {segments.map((s, k) => {
          const x1 = (s.start / span) * PW;
          const w = Math.max(0, ((s.end - s.start) / span) * PW);
          const label = s.kind === 'off' ? 'OFF' : s.kind === 'fw' && s.text === 'D_FW' ? 'FWD' : s.text;
          return (
            <g key={k} transform={`translate(${x1}, 0)`}>
              <rect
                width={w}
                height="18"
                strokeWidth="1"
                className={
                  s.kind === 'off'
                    ? 'fill-slate-800 stroke-slate-950'
                    : s.kind === 'fw'
                      ? 'fill-sky-900 stroke-slate-950'
                      : 'fill-emerald-900 stroke-slate-950'
                }
              />
              {w > 22 && (
                <text
                  x={w / 2}
                  y="12"
                  textAnchor="middle"
                  fontSize={w > 40 ? 8.5 : 7}
                  fontWeight="bold"
                  className={s.kind === 'off' ? 'fill-slate-500' : s.kind === 'fw' ? 'fill-sky-300' : 'fill-emerald-300'}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
});
PlotLayer.displayName = 'PlotLayer';

// ---- single scope channel ----------------------------------------------
interface ChannelProps {
  label: string;
  colorClass: string;
  stroke: string[];
  keys: TraceKey[];
  points: WaveformPoint[];
  span: number;
  scale: number;
  unit: string;
  readout: string;
  currentAngle: number;
  onScrub: (a: number) => void;
}

const CH_W = 600;
const CH_H = 72;

const Channel: React.FC<ChannelProps> = ({ label, colorClass, stroke, keys, points, span, scale, unit, readout, currentAngle, onScrub }) => {
  const d = useMemo(
    () =>
      keys.map(key => {
        let s = '';
        for (let i = 0; i < points.length; i += 2) {
          const p = points[i];
          s += `${i === 0 ? 'M' : 'L'}${((p.deg / span) * CH_W).toFixed(1)},${(CH_H / 2 - (((p[key] as number) ?? 0) / scale) * (CH_H / 2 - 6)).toFixed(1)}`;
        }
        return s;
      }),
    [points, span, scale, keys]
  );
  const scrub = useScrub(span, 0, CH_W, CH_W, onScrub);
  const cx = ((currentAngle % span) / span) * CH_W;
  return (
    <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
      <span className={`w-16 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-center ${colorClass}`}>{label}</span>
      <svg viewBox={`0 0 ${CH_W} ${CH_H}`} className="flex-1 h-16 min-w-0 cursor-crosshair touch-pan-y" preserveAspectRatio="none" {...scrub}>
        <line x1="0" y1={CH_H / 2} x2={CH_W} y2={CH_H / 2} strokeWidth="1" className="stroke-slate-700" />
        <text x="4" y="10" fontSize="9" fontFamily="monospace" className="fill-slate-500">±{fmtTick(scale)} {unit}</text>
        {d.map((path, k) => (
          <path key={k} d={path} fill="none" stroke={stroke[k]} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={cx} y1="0" x2={cx} y2={CH_H} stroke="#8b5cf6" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="w-24 shrink-0 text-[11px] font-mono text-right text-slate-200">{readout}</span>
    </div>
  );
};

// ---- main component -------------------------------------------------------
export const WaveformOscilloscope: React.FC<WaveformOscilloscopeProps> = ({
  params,
  points,
  metrics,
  harmonics,
  gateEvents,
  currentAngle,
  currentPoint,
  onScrub,
  isTwoCycles,
  onToggleTwoCycles
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('superimposed');
  const [showGrid, setShowGrid] = useState(true);
  const [showVavg, setShowVavg] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, toggleFullscreen] = useElementFullscreen(rootRef);

  const span = isTwoCycles ? 720 : 360;
  const is3 = params.phase === '3phase';

  const maxV = useMemo(() => {
    let m = metrics.vm * (is3 ? Math.sqrt(3) : 1);
    for (let i = 0; i < points.length; i += 4) m = Math.max(m, Math.abs(points[i].vo), Math.abs(points[i].vs));
    return niceMax(m * 1.1);
  }, [points, metrics.vm, is3]);

  const maxI = useMemo(() => {
    let m = 0.5;
    for (let i = 0; i < points.length; i += 4) m = Math.max(m, Math.abs(points[i].io), Math.abs(points[i].is));
    return niceMax(m * 1.15);
  }, [points]);

  const ang = currentAngle % span;
  const cursorX = PL + (ang / span) * PW;
  const scrub = useScrub(span, PL, PW, VBW, onScrub);

  const yV = (v: number) => V_C - (v / maxV) * V_H;
  const yI = (i: number) => I_C - (i / maxI) * I_H;
  const boxW = 176;
  const boxX = cursorX + 10 + boxW > PL + PW ? cursorX - 10 - boxW : cursorX + 10;
  const probe = [
    `ωt = ${ang.toFixed(1)}°`,
    is3
      ? `va ${signed(currentPoint.vs, 1)}  vb ${signed(currentPoint.vsB ?? 0, 0)}  vc ${signed(currentPoint.vsC ?? 0, 0)}`
      : `vs = ${signed(currentPoint.vs, 1)} V`,
    `vo = ${signed(currentPoint.vo, 1)} V`,
    `io = ${signed(currentPoint.io, 2)} A`,
    `is = ${signed(currentPoint.is, 2)} A`
  ];

  const tabBtn = (tab: TabType, icon: React.ReactNode, text: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      aria-pressed={activeTab === tab}
      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
        activeTab === tab
          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}
      {text}
    </button>
  );

  const toggleBtn = (on: boolean, onClick: () => void, text: string, onCls: string) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`px-2 py-1 rounded border font-mono text-xs transition-colors ${on ? onCls : 'bg-slate-800/50 text-slate-500 border-slate-700/40 hover:text-slate-300'}`}
    >
      {text}
    </button>
  );

  return (
    <div
      ref={rootRef}
      className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${isFullscreen ? 'h-screen bg-slate-950' : 'h-full'}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800" role="tablist">
          {tabBtn('superimposed', <Layers className="w-3.5 h-3.5" />, 'Superimposed')}
          {tabBtn('channels', <Activity className="w-3.5 h-3.5" />, 'Multi-Channel Scope')}
          {tabBtn('harmonics', <BarChart3 className="w-3.5 h-3.5" />, 'Harmonics (FFT)')}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onToggleTwoCycles}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-mono text-xs transition-colors"
            title="Switch between one and two supply cycles"
          >
            {isTwoCycles ? '2 Cycles (720°)' : '1 Cycle (360°)'}
          </button>
          {toggleBtn(showGrid, () => setShowGrid(g => !g), '# Grid', 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30')}
          {toggleBtn(showVavg, () => setShowVavg(v => !v), 'V_dc (Avg)', 'bg-purple-950/60 text-purple-300 border-purple-500/30')}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded border border-slate-700/50 transition-colors"
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 lg:min-h-[380px] p-2 flex flex-col justify-center overflow-x-auto">
        {activeTab === 'superimposed' && (
          <svg
            viewBox={`0 0 ${VBW} ${VBH}`}
            className="w-full min-w-[620px] h-auto cursor-crosshair select-none touch-pan-y rounded-lg"
            role="img"
            aria-label="Voltage and current waveforms. Click or drag to move the cursor."
            {...scrub}
          >
            <PlotLayer
              points={points}
              span={span}
              maxV={maxV}
              maxI={maxI}
              showGrid={showGrid}
              showVavg={showVavg}
              vAvg={metrics.vAvg}
              gateEvents={gateEvents}
              is3={is3}
            />

            {/* cursor + probe */}
            <g pointerEvents="none">
              <line x1={cursorX} y1="28" x2={cursorX} y2="320" stroke="#8b5cf6" strokeWidth="1.3" strokeDasharray="3 3" />
              <circle cx={cursorX} cy={yV(currentPoint.vo)} r="3.8" fill={COLORS.vo} stroke="#0f172a" strokeWidth="1" />
              <circle cx={cursorX} cy={yV(currentPoint.vs)} r="3" fill={is3 ? COLORS.vA : COLORS.vs} stroke="#0f172a" strokeWidth="1" />
              <circle cx={cursorX} cy={yI(currentPoint.io)} r="3.8" fill={COLORS.io} stroke="#0f172a" strokeWidth="1" />
              <circle cx={cursorX} cy={yI(currentPoint.is)} r="3" fill={COLORS.is} stroke="#0f172a" strokeWidth="1" />
              <g transform={`translate(${boxX}, 34)`}>
                <rect width={boxW} height="72" rx="6" strokeWidth="1" className="fill-slate-900/90 stroke-slate-600" />
                {probe.map((t, k) => (
                  <text key={k} x="8" y={14 + k * 12.5} fontSize="9" fontFamily="monospace" fontWeight={k === 0 ? 'bold' : 'normal'} className={k === 0 ? 'fill-cyan-300' : 'fill-slate-200'}>
                    {t}
                  </text>
                ))}
              </g>
            </g>
          </svg>
        )}

        {activeTab === 'channels' && (
          <div className="flex flex-col gap-2 p-1 min-w-[520px]">
            {is3 ? (
              <Channel
                label="CH1: v_abc"
                colorClass="text-red-400 bg-red-950/60"
                stroke={[COLORS.vA, COLORS.vB, COLORS.vC]}
                keys={['vs', 'vsB', 'vsC']}
                points={points}
                span={span}
                scale={maxV}
                unit="V"
                readout={`${currentPoint.vs.toFixed(0)}/${(currentPoint.vsB ?? 0).toFixed(0)}/${(currentPoint.vsC ?? 0).toFixed(0)}`}
                currentAngle={currentAngle}
                onScrub={onScrub}
              />
            ) : (
              <Channel label="CH1: v_s" colorClass="text-sky-400 bg-sky-950/60" stroke={[COLORS.vs]} keys={['vs']} points={points} span={span} scale={maxV} unit="V" readout={`${currentPoint.vs.toFixed(1)} V`} currentAngle={currentAngle} onScrub={onScrub} />
            )}
            <Channel label="CH2: v_o" colorClass="text-emerald-400 bg-emerald-950/60" stroke={[COLORS.vo]} keys={['vo']} points={points} span={span} scale={maxV} unit="V" readout={`${currentPoint.vo.toFixed(1)} V`} currentAngle={currentAngle} onScrub={onScrub} />
            <Channel label="CH3: i_s" colorClass="text-indigo-400 bg-indigo-950/60" stroke={[COLORS.is]} keys={['is']} points={points} span={span} scale={maxI} unit="A" readout={`${currentPoint.is.toFixed(2)} A`} currentAngle={currentAngle} onScrub={onScrub} />
            <Channel label="CH4: i_o" colorClass="text-amber-400 bg-amber-950/60" stroke={[COLORS.io]} keys={['io']} points={points} span={span} scale={maxI} unit="A" readout={`${currentPoint.io.toFixed(2)} A`} currentAngle={currentAngle} onScrub={onScrub} />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>0°</span>
              <span>{span / 4}°</span>
              <span>{span / 2}°</span>
              <span>{(span * 3) / 4}°</span>
              <span>{span}°</span>
            </div>
          </div>
        )}

        {activeTab === 'harmonics' && (
          <div className="flex-1 flex flex-col p-3 bg-slate-950/60 rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Fourier harmonic spectrum (steady state)</h4>
                <p className="text-[11px] text-slate-400">
                  Dominant ripple: <span className="text-cyan-400 font-mono font-bold">{metrics.rippleFreq} Hz</span> ({metrics.pulseNumber}-pulse)
                </p>
              </div>
              <div className="flex gap-2 text-xs font-mono flex-wrap">
                <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">THD(i_s): <span className="text-amber-400 font-bold">{metrics.thdCurrent.toFixed(1)}%</span></div>
                <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">RF: <span className="text-purple-400 font-bold">{metrics.rippleFactor.toFixed(3)}</span></div>
                <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">PF: <span className="text-emerald-400 font-bold">{metrics.powerFactor.toFixed(3)}</span></div>
              </div>
            </div>

            <div className="flex-1 min-h-[220px] flex items-end gap-1 pt-8 pb-2 px-1 border-b border-slate-800">
              {harmonics.map(h => (
                <div key={h.harmonic} className="flex-1 min-w-0 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] font-mono px-2 py-1 rounded border border-slate-700 shadow-xl pointer-events-none whitespace-nowrap z-20">
                    <div className="text-slate-200">{h.order}</div>
                    <div className="text-emerald-400">v_o: {h.voltageMag.toFixed(1)} V</div>
                    <div className="text-amber-400">i_s: {h.currentMag.toFixed(2)} A</div>
                  </div>
                  <div className="w-full flex items-end justify-center gap-px h-40">
                    <div style={{ height: `${Math.max(1, h.voltagePercent)}%` }} className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-[height] duration-300" />
                    <div style={{ height: `${h.harmonic === 0 ? 0 : Math.max(1, h.currentPercent)}%` }} className="w-1/2 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-sm transition-[height] duration-300" />
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">{h.harmonic === 0 ? 'DC' : h.harmonic}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 pt-3 text-[11px] flex-wrap">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500" /><span className="text-slate-300">Output voltage v_o (scaled to its largest component)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500" /><span className="text-slate-300">Supply current i_s (% of largest harmonic)</span></div>
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-1">Harmonic order on the x-axis (multiples of the supply frequency). Hover a bar for exact values.</p>
          </div>
        )}
      </div>
    </div>
  );
};
