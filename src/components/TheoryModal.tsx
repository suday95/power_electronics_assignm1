import React from 'react';
import { X, BookOpen, Zap, Layers, Activity, HelpCircle } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Power Electronics Converter Theory & Principles</h2>
              <p className="text-xs text-slate-400">Single-phase and Three-phase AC-to-DC Rectification Guide</p>
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
          {/* Section 1: 1-Phase Rectifiers */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              1. Single-Phase Rectifier Topologies
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs leading-relaxed">
              <p>
                <strong className="text-slate-100">Half-Wave Rectifier:</strong> Conducts current only during positive half-cycles of the AC supply. With pure resistive load, conduction terminates at π. With inductive RL loads, the stored energy in the inductor forces current to continue flowing past π until extinction angle β, dragging the output voltage negative unless a freewheeling diode (FWD) is used.
              </p>
              <p>
                <strong className="text-slate-100">Full-Wave Bridge Rectifier (Graetz Bridge):</strong> Uses four switches arranged in a bridge. D1/T1 and D2/T2 conduct during the positive half-cycle, while D3/T3 and D4/T4 conduct during the negative half-cycle. Output voltage is rectified in both halves, doubling ripple frequency to 2f (100 Hz for 50 Hz supply).
              </p>
            </div>
          </div>

          {/* Section 2: Diodes vs Thyristors (SCR) */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              2. Diode (Uncontrolled) vs Thyristor (SCR Controlled)
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs leading-relaxed">
              <p>
                <strong className="text-slate-100">Uncontrolled Diode Bridge:</strong> Turns ON naturally as soon as forward bias is established (vs &gt; 0). Firing angle is fixed at α = 0°. Average output voltage is V_dc = (2·Vm / π) ≈ 0.637 · Vm.
              </p>
              <p>
                <strong className="text-slate-100">Controlled Thyristor Converter (Phase Control):</strong> Requires both forward bias and a gate trigger pulse to turn ON. By delaying the gate pulse by firing angle α, the average output voltage can be smoothly regulated from V_dc(max) down to 0 (or into negative voltage inversion mode when connected to an inductive load with active back-EMF).
              </p>
            </div>
          </div>

          {/* Section 3: Three-Phase Rectifiers */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              3. Three-Phase Converters (3-Pulse & 6-Pulse)
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs leading-relaxed">
              <p>
                <strong className="text-slate-100">3-Phase Half-Wave (3-Pulse):</strong> Handover occurs at natural commutation points (30°, 150°, 270°). Ripple frequency is 3f (150 Hz).
              </p>
              <p>
                <strong className="text-slate-100">3-Phase Full-Wave Bridge (6-Pulse):</strong> The industrial standard for high-power DC motor drives, HVDC, and electrolyzers. Two devices conduct at any instant (one from the top rail connected to the highest phase, one from the bottom rail connected to the lowest phase). 6 commutation handovers per cycle result in very low ripple (~4.2%) and high DC voltage:
                <span className="block font-mono text-cyan-300 mt-1">V_dc = (3√3·Vm / π) · cos(α) ≈ 1.35 · V_LL(rms) · cos(α)</span>
              </p>
            </div>
          </div>

          {/* Section 4: Freewheeling Diode (FWD) */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              4. Freewheeling Diode (FWD) Functionality
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs leading-relaxed">
              <p>
                When supplying inductive loads ($RL$ or $RLE$), the inductor opposes instantaneous current changes. When the source voltage reverses, the collapsing magnetic field creates a back-EMF that forward-biases the freewheeling diode (FWD) connected across the load terminals.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Clamps load voltage to zero, eliminating negative output voltage excursions.</li>
                <li>Increases average DC output voltage and improves input power factor.</li>
                <li>Provides a smooth closed freewheeling loop for load current decay.</li>
                <li>Prevents unwanted reactive power feedback to the AC grid.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
