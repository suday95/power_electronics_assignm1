import React from 'react';
import { CircuitParams, PerformanceMetrics } from '../types';
import { X, Calculator, Check, ArrowRight, Zap, Info } from 'lucide-react';

interface WaveformAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: CircuitParams;
  metrics: PerformanceMetrics;
}

export const WaveformAnalysisModal: React.FC<WaveformAnalysisModalProps> = ({
  isOpen,
  onClose,
  params,
  metrics
}) => {
  if (!isOpen) return null;

  const { phase, rectifierType, deviceType, loadType, hasFwd, firingAngle, vRms, freq } = params;

  // Formula string generator based on active topology
  const getFormulaDetails = () => {
    if (phase === '1phase') {
      if (rectifierType === 'halfwave') {
        if (deviceType === 'diode') {
          return {
            title: 'Single-Phase Half-Wave Diode Rectifier',
            vAvgFormula: 'V_dc = Vm / π ≈ 0.318 · Vm',
            vRmsFormula: 'V_rms = Vm / 2 = 0.500 · Vm',
            desc: 'Conduction occurs strictly from 0 to π radians. Output ripple frequency is fundamental supply frequency (50/60 Hz).'
          };
        } else {
          return {
            title: 'Single-Phase Half-Wave Controlled Rectifier (SCR)',
            vAvgFormula: 'V_dc = (Vm / 2π) · (1 + cos(α))',
            vRmsFormula: 'V_rms = (Vm / 2) · √[1 - α/π + sin(2α)/(2π)]',
            desc: `SCR triggers at firing angle α = ${firingAngle}°. Conduction angle γ = 180° - α.`
          };
        }
      } else {
        // Full wave bridge
        if (deviceType === 'diode') {
          return {
            title: 'Single-Phase Full-Wave Diode Bridge Rectifier',
            vAvgFormula: 'V_dc = (2·Vm / π) ≈ 0.637 · Vm',
            vRmsFormula: 'V_rms = Vm / √2 ≈ 0.707 · Vm',
            desc: '2 diodes conduct during positive half-cycle (D1, D2), and 2 during negative half-cycle (D3, D4). Ripple frequency is 2f (100/120 Hz).'
          };
        } else {
          if (loadType === 'R' || hasFwd) {
            return {
              title: 'Single-Phase Controlled Converter (with FWD / R Load)',
              vAvgFormula: 'V_dc = (Vm / π) · (1 + cos(α))',
              vRmsFormula: 'V_rms = Vm · √[ (π - α + sin(2α)/2) / (2π) ]',
              desc: 'Negative voltage excursion is prevented by the freewheeling diode or resistive cutoff. Single-quadrant operation.'
            };
          } else {
            return {
              title: 'Single-Phase Fully-Controlled Converter (Continuous Conduction)',
              vAvgFormula: 'V_dc = (2·Vm / π) · cos(α)',
              vRmsFormula: 'V_rms = Vm / √2',
              desc: 'With inductive load and without FWD, voltage swings negative from π to π+α. For α > 90°, average voltage is negative (inversion mode).'
            };
          }
        }
      }
    } else {
      // 3-Phase
      if (rectifierType === 'halfwave') {
        return {
          title: 'Three-Phase Half-Wave Rectifier (3-Pulse)',
          vAvgFormula: deviceType === 'diode'
            ? 'V_dc = (3√3·Vm / 2π) ≈ 0.827 · Vm'
            : 'V_dc = (3√3·Vm / 2π) · cos(α)',
          vRmsFormula: 'V_rms = Vm · √[ 1/2 + (3√3 / 8π) · cos(2α) ]',
          desc: 'Commutation handover occurs every 120° among the 3 phases. Output ripple frequency is 3f (150/180 Hz).'
        };
      } else {
        return {
          title: 'Three-Phase Full-Wave Bridge Rectifier (6-Pulse Graetz Bridge)',
          vAvgFormula: deviceType === 'diode'
            ? 'V_dc = (3 / π) · V_LL(m) = (3√3·Vm / π) ≈ 1.35 · V_LL(rms)'
            : 'V_dc = (3 / π) · V_LL(m) · cos(α) = 1.35 · V_LL(rms) · cos(α)',
          vRmsFormula: 'V_rms = V_LL(m) · √[ 1/2 + (3√3 / 4π) · cos(2α) ]',
          desc: 'Industrial workhorse 6-pulse converter. 6 commutation intervals per cycle. Lowest ripple factor (~4.2%), ripple frequency 6f (300/360 Hz).'
        };
      }
    }
  };

  const info = getFormulaDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Waveform Analysis & Analytical Derivations</h2>
              <p className="text-xs text-slate-400">{info.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">DC Average V_dc</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {metrics.vAvg.toFixed(1)} <span className="text-xs text-slate-500">V</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Avg load voltage</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Output RMS V_rms</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {metrics.vRms.toFixed(1)} <span className="text-xs text-slate-500">V</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">True RMS voltage</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Ripple Factor (RF)</div>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {metrics.rippleFactor.toFixed(3)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">AC component / DC</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Efficiency (η)</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {metrics.efficiency.toFixed(1)} <span className="text-xs text-slate-500">%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">P_dc / P_ac ratio</div>
            </div>
          </div>

          {/* Theoretical Formulas Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Governing Closed-Form Analytical Formulas
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Average Output Voltage:</span>
                <span className="text-cyan-300 font-bold">{info.vAvgFormula}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">RMS Output Voltage:</span>
                <span className="text-emerald-300 font-bold">{info.vRmsFormula}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Form Factor (FF):</span>
                <span className="text-purple-300 font-bold">FF = V_rms / V_dc = {metrics.formFactor.toFixed(3)}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Ripple Factor (RF):</span>
                <span className="text-amber-300 font-bold">RF = √(FF² - 1) = {metrics.rippleFactor.toFixed(3)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">{info.desc}</p>
          </div>

          {/* Performance Comparison Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Parameter</th>
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Calculated Value</th>
                  <th className="p-2.5">Ideal Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="p-2.5 text-slate-300">Peak Supply Voltage</td>
                  <td className="p-2.5 text-slate-400">V_m</td>
                  <td className="p-2.5 text-cyan-400 font-bold">{metrics.vm.toFixed(1)} V</td>
                  <td className="p-2.5 text-slate-500">√2 · V_rms</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300">DC Load Current</td>
                  <td className="p-2.5 text-slate-400">I_dc</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{metrics.iAvg.toFixed(2)} A</td>
                  <td className="p-2.5 text-slate-500">(V_dc - E) / R</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300">RMS Load Current</td>
                  <td className="p-2.5 text-slate-400">I_rms</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{metrics.iRms.toFixed(2)} A</td>
                  <td className="p-2.5 text-slate-500">True Root-Mean-Square</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300">Input Current THD</td>
                  <td className="p-2.5 text-slate-400">THD_i</td>
                  <td className="p-2.5 text-amber-400 font-bold">{metrics.thdCurrent.toFixed(1)} %</td>
                  <td className="p-2.5 text-slate-500">&lt; 5% (with filter)</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300">Ripple Frequency</td>
                  <td className="p-2.5 text-slate-400">f_ripple</td>
                  <td className="p-2.5 text-purple-400 font-bold">{metrics.rippleFreq} Hz</td>
                  <td className="p-2.5 text-slate-500">{metrics.pulseNumber} × {freq} Hz</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
