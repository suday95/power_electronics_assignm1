import React from 'react';
import { CircuitParams, PerformanceMetrics } from '../types';
import { controlMode, theoryInfo } from '../engine/simulationMath';
import { FlaskConical } from 'lucide-react';

interface Props {
  params: CircuitParams;
  metrics: PerformanceMetrics;
}

const Card: React.FC<{ label: string; value: string; unit?: string; sub: string; valueClass: string }> = ({ label, value, unit, sub, valueClass }) => (
  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
    <div className="text-[11px] text-slate-400 font-medium">{label}</div>
    <div className={`text-2xl font-bold font-mono mt-1 ${valueClass}`}>
      {value}
      {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
    </div>
    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sub}</div>
  </div>
);

export const topologyTitle = (p: CircuitParams): string => {
  const mode = controlMode(p);
  const ph = p.phase === '1phase' ? 'Single-Phase' : 'Three-Phase';
  if (p.rectifierType === 'halfwave') {
    return `${ph} Half-Wave ${mode === 'diode' ? 'Diode Rectifier' : mode === 'full' ? 'Controlled Rectifier (SCR)' : 'Mixed Rectifier'}`;
  }
  const kind = mode === 'diode' ? 'Diode Bridge Rectifier' : mode === 'full' ? 'Fully Controlled Bridge Converter' : mode === 'semi' ? 'Semi-Converter (Half-Controlled Bridge)' : 'Mixed Diode/Thyristor Bridge';
  return `${ph} ${kind}`;
};

export const MetricsStrip: React.FC<Props> = React.memo(({ params, metrics: m }) => {
  const theory = theoryInfo(params, m.continuous);
  const delta = theory.value !== null ? m.vAvg - theory.value : null;
  const pDc = m.vAvg * m.iAvg;
  const pAc = m.vRms * m.iRms;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card label="Avg DC Voltage" value={m.vAvg.toFixed(1)} unit="V" valueClass="text-emerald-400" sub={theory.value !== null ? `Theor: ${theory.value.toFixed(1)} V` : 'Theor: n/a (see below)'} />
        <Card label="Avg DC Current" value={m.iAvg.toFixed(2)} unit="A" valueClass="text-cyan-400" sub={`RMS: ${m.iRms.toFixed(2)} A · ${m.continuous ? 'CCM' : 'DCM'}`} />
        <Card label="Output Power" value={pDc.toFixed(1)} unit="W" valueClass="text-amber-400" sub={`P_ac: ${pAc.toFixed(1)} W`} />
        <Card label="Power Factor" value={m.powerFactor.toFixed(3)} valueClass="text-purple-400" sub={`DPF: ${m.dpf.toFixed(2)}`} />
        <Card label="Ripple Factor" value={m.rippleFactor.toFixed(3)} valueClass="text-pink-400" sub={`f_r: ${m.rippleFreq} Hz`} />
        <Card label="Source THD (I)" value={m.thdCurrent.toFixed(1)} unit="%" valueClass="text-orange-400" sub={`η: ${m.efficiency.toFixed(1)}%`} />
      </div>

      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="lg:w-1/3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <FlaskConical className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{topologyTitle(params)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Analytical DC voltage equation, checked against the simulated integral of v_o.</p>
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-amber-300 break-words">
          <span className="text-slate-500 mr-2 text-[10px] uppercase">Formula</span>
          {theory.formula}
        </div>
        <div className="text-xs font-mono flex flex-col gap-1 lg:items-end">
          <div className="text-slate-400">
            Calculated: <span className="text-emerald-300 font-bold">{theory.value !== null ? `${theory.value.toFixed(2)} V` : '—'}</span>
          </div>
          <div className="text-slate-400">
            Simulated: <span className="text-cyan-300 font-bold">{m.vAvg.toFixed(2)} V</span>
            {delta !== null && (
              <span className={`ml-2 px-1.5 py-0.5 rounded border ${Math.abs(delta) < Math.max(1, Math.abs(theory.value!) * 0.01) ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' : 'text-amber-400 border-amber-500/40 bg-amber-950/40'}`}>
                Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)} V
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
MetricsStrip.displayName = 'MetricsStrip';
