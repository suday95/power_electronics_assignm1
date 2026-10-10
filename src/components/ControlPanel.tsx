import React from 'react';
import { CircuitParams, LoadType } from '../types';
import { applyQuickSetup, changeTopology, controlMode, hasThyristor, QuickSetup } from '../engine/simulationMath';
import { Layers, ShieldCheck, Sliders, Zap } from 'lucide-react';

interface ControlPanelProps {
  params: CircuitParams;
  onChangeParams: (updater: (prev: CircuitParams) => CircuitParams) => void;
}

const seg = (active: boolean, accent = 'bg-cyan-500') =>
  `py-1.5 text-xs font-bold rounded-md transition-all ${active ? `${accent} text-slate-950 shadow-md` : 'text-slate-400 hover:text-slate-200'}`;

const Card: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl">
    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-200">
      {icon}
      <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  accent: string;
  valueClass: string;
  onChange: (v: number) => void;
}> = ({ label, value, unit, min, max, step, accent, valueClass, onChange }) => (
  <div>
    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
      <span>{label}</span>
      <span className={`font-mono font-bold ${valueClass}`}>{value} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={e => onChange(parseFloat(e.target.value))}
      className={`w-full cursor-pointer ${accent}`}
    />
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = React.memo(({ params, onChangeParams }) => {
  const thyristors = hasThyristor(params);
  const mode = controlMode(params);
  const halfWave = params.rectifierType === 'halfwave';
  const set = (patch: Partial<CircuitParams>) => onChangeParams(p => ({ ...p, ...patch }));
  const topology = (patch: Partial<CircuitParams>) => onChangeParams(p => changeTopology(p, patch));
  const quick = (q: QuickSetup) => onChangeParams(p => applyQuickSetup(p, q));
  const fwdUseless = params.loadType === 'R';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-4">
      <Card icon={<Layers className="w-4 h-4 text-cyan-400" />} title="Converter Topology">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            <button onClick={() => topology({ phase: '1phase' })} className={seg(params.phase === '1phase')}>Single-Phase (1Φ)</button>
            <button onClick={() => topology({ phase: '3phase' })} className={seg(params.phase === '3phase')}>Three-Phase (3Φ)</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            <button onClick={() => topology({ rectifierType: 'fullwave' })} className={seg(params.rectifierType === 'fullwave')}>Full-Bridge</button>
            <button onClick={() => topology({ rectifierType: 'halfwave' })} className={seg(params.rectifierType === 'halfwave')}>Half-Wave</button>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Quick setup</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['diode', 'All Diodes', 'bg-cyan-500'],
                ['full', 'All Thyristors', 'bg-amber-500'],
                ['semi', 'Semi-Conv', 'bg-purple-500']
              ] as [QuickSetup, string, string][]).map(([q, text, accent]) => (
                <button
                  key={q}
                  disabled={q === 'semi' && halfWave}
                  onClick={() => quick(q)}
                  title={q === 'semi' ? (halfWave ? 'Needs a full-bridge topology' : 'Top devices thyristors, bottom devices diodes') : undefined}
                  className={`px-1 ${seg(mode === (q === 'full' ? 'full' : q), accent)} border border-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {text}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Or click individual switches in the schematic.</p>
          </div>
        </div>
      </Card>

      <Card icon={<Zap className="w-4 h-4 text-amber-400" />} title="Firing Angle α & FWD">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="alpha" className="text-[11px] text-slate-300 font-medium">
              Firing angle (α)
              {!thyristors && <span className="ml-1.5 text-[10px] text-slate-500 italic">(no thyristors – fixed at 0°)</span>}
            </label>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              {thyristors ? params.firingAngle : 0}°
            </span>
          </div>
          <input
            id="alpha"
            type="range"
            min="0"
            max="180"
            step="5"
            disabled={!thyristors}
            value={thyristors ? params.firingAngle : 0}
            onChange={e => set({ firingAngle: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          />
          <div className="grid grid-cols-5 gap-1 mt-2">
            {[0, 15, 30, 45, 60, 90, 120, 150, 180].map(deg => (
              <button
                key={deg}
                disabled={!thyristors}
                onClick={() => set({ firingAngle: deg })}
                className={`py-0.5 text-[10px] font-mono rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  thyristors && params.firingAngle === deg
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">Freewheeling Diode (FWD)</div>
              <div className="text-[10px] text-slate-400">
                {fwdUseless ? 'No effect with a purely resistive load' : 'Prevents negative output voltage on inductive loads'}
              </div>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={params.hasFwd}
            aria-label="Freewheeling diode"
            onClick={() => set({ hasFwd: !params.hasFwd })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${params.hasFwd ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${params.hasFwd ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </Card>

      <Card icon={<Sliders className="w-4 h-4 text-emerald-400" />} title="Load Configuration">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 mb-3">
          {(['R', 'RL', 'RLE'] as LoadType[]).map(lt => (
            <button key={lt} onClick={() => set({ loadType: lt })} className={seg(params.loadType === lt, 'bg-emerald-500')}>
              {lt} Load
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <Slider label="R (resistance)" value={params.r} unit="Ω" min={5} max={100} step={5} accent="accent-cyan-400" valueClass="text-cyan-400" onChange={r => set({ r })} />
          {params.loadType !== 'R' && (
            <Slider label="L (inductance)" value={params.l} unit="mH" min={5} max={200} step={5} accent="accent-purple-400" valueClass="text-purple-400" onChange={l => set({ l })} />
          )}
          {params.loadType === 'RLE' && (
            <Slider label="E (back-EMF)" value={params.e} unit="V" min={0} max={200} step={5} accent="accent-amber-400" valueClass="text-amber-400" onChange={e => set({ e })} />
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <label className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400">{params.phase === '3phase' ? 'V_rms (L-L)' : 'V_rms'}</span>
              <select
                value={params.vRms}
                onChange={e => set({ vRms: parseInt(e.target.value, 10) })}
                className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer"
              >
                {[110, 230, 400].map(v => (
                  <option key={v} value={v} className="bg-slate-900">{v} V</option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400">Freq</span>
              <select
                value={params.freq}
                onChange={e => set({ freq: parseInt(e.target.value, 10) })}
                className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer"
              >
                {[50, 60].map(f => (
                  <option key={f} value={f} className="bg-slate-900">{f} Hz</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
});
ControlPanel.displayName = 'ControlPanel';
