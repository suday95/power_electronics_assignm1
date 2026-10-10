import React from 'react';
import { CircuitParams, PerformanceMetrics } from '../types';
import { theoryInfo } from '../engine/simulationMath';
import { topologyTitle } from './MetricsStrip';
import { Modal } from './Modal';
import { Calculator, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  params: CircuitParams;
  metrics: PerformanceMetrics;
}

const Tile: React.FC<{ label: string; value: string; unit?: string; sub: string; cls: string }> = ({ label, value, unit, sub, cls }) => (
  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
    <div className="text-[11px] text-slate-400 uppercase font-semibold">{label}</div>
    <div className={`text-xl font-bold font-mono mt-1 ${cls}`}>
      {value} {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </div>
    <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
  </div>
);

export const WaveformAnalysisModal: React.FC<Props> = ({ isOpen, onClose, params, metrics: m }) => {
  const theory = theoryInfo(params, m.continuous);
  const mode = params.loadType === 'R' ? 'Resistive (no storage)' : m.continuous ? 'Continuous (CCM)' : 'Discontinuous (DCM)';

  const rows: [string, string, string, string][] = [
    ['Peak phase voltage', 'V_m', `${m.vm.toFixed(1)} V`, '√2 · V_phase(rms)'],
    ['DC load current', 'I_dc', `${m.iAvg.toFixed(2)} A`, '(V_dc − E) / R'],
    ['RMS load current', 'I_rms', `${m.iRms.toFixed(2)} A`, 'true RMS of i_o'],
    ['RMS supply current', 'I_s,rms', `${m.isRms.toFixed(2)} A`, 'line current'],
    ['Input current THD', 'THD_i', `${m.thdCurrent.toFixed(1)} %`, '√(I_s² − I_s1²) / I_s1'],
    ['Power factor / displacement PF', 'PF / DPF', `${m.powerFactor.toFixed(3)} / ${m.dpf.toFixed(3)}`, 'P / (V_s·I_s) , cos φ₁'],
    ['Rectification efficiency', 'η', `${m.efficiency.toFixed(1)} %`, 'V_dc·I_dc / (V_rms·I_rms)'],
    ['Ripple frequency', 'f_ripple', `${m.rippleFreq} Hz`, `${m.pulseNumber} × ${params.freq} Hz`],
    ['Load current mode', '—', mode, params.loadType === 'R' ? '' : 'CCM if i_o never reaches 0']
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Waveform Analysis & Analytical Derivations"
      subtitle={topologyTitle(params)}
      icon={<Calculator className="w-5 h-5" />}
      footer={
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors">
          Close Analysis
        </button>
      }
    >
      <div className="space-y-6 text-sm text-slate-300">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Tile label="DC average V_dc" value={m.vAvg.toFixed(1)} unit="V" sub="mean of v_o over one cycle" cls="text-cyan-400" />
          <Tile label="Output RMS V_rms" value={m.vRms.toFixed(1)} unit="V" sub="true RMS of v_o" cls="text-emerald-400" />
          <Tile label="Ripple factor RF" value={m.rippleFactor.toFixed(3)} sub="√(FF² − 1)" cls="text-purple-400" />
          <Tile label="Efficiency η" value={m.efficiency.toFixed(1)} unit="%" sub="P_dc / P_ac" cls="text-amber-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Governing analytical formulas
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 mb-1">Average output voltage</div>
              <div className="text-cyan-300 font-bold break-words">{theory.formula}</div>
              <div className="text-slate-400 mt-1">
                Calculated: <b className="text-emerald-300">{theory.value !== null ? `${theory.value.toFixed(2)} V` : 'n/a'}</b>
                {' · '}Simulated: <b className="text-cyan-300">{m.vAvg.toFixed(2)} V</b>
              </div>
            </div>
            {theory.vrms && (
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-slate-400 mb-1">RMS output voltage (ideal)</div>
                <div className="text-emerald-300 font-bold break-words">{theory.vrms}</div>
                <div className="text-slate-400 mt-1">Simulated: <b className="text-cyan-300">{m.vRms.toFixed(2)} V</b></div>
              </div>
            )}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-wrap justify-between gap-2">
              <span className="text-slate-400">Form factor</span>
              <span className="text-purple-300 font-bold">FF = V_rms / V_dc = {m.formFactor.toFixed(3)}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-wrap justify-between gap-2">
              <span className="text-slate-400">Ripple factor</span>
              <span className="text-amber-300 font-bold">RF = √(FF² − 1) = {m.rippleFactor.toFixed(3)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {params.phase === '3phase' ? 'V_LL,m = √3·V_m is the peak line-to-line voltage; supply voltage is specified line-to-line. ' : ''}
            Ideal devices with instantaneous commutation (no source inductance) are assumed.
          </p>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Parameter</th>
                <th className="p-2.5">Symbol</th>
                <th className="p-2.5">Value</th>
                <th className="p-2.5">Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rows.map(([name, sym, val, def]) => (
                <tr key={name}>
                  <td className="p-2.5 text-slate-300">{name}</td>
                  <td className="p-2.5 text-slate-400">{sym}</td>
                  <td className="p-2.5 text-cyan-400 font-bold">{val}</td>
                  <td className="p-2.5 text-slate-500">{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
