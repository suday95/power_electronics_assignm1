import React from 'react';
import { CircuitParams } from '../types';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (params: CircuitParams) => void;
}

interface PresetItem {
  id: string;
  name: string;
  category: string;
  description: string;
  params: CircuitParams;
}

const PRESETS: PresetItem[] = [
  {
    id: '1ph-diode-r',
    name: '1Φ Diode Full-Bridge (Resistive)',
    category: 'Single-Phase Diode',
    description: 'Standard 4-diode Graetz bridge with pure R load (R = 20 Ω). Classic baseline.',
    params: {
      phase: '1phase',
      rectifierType: 'fullwave',
      deviceType: 'diode',
      loadType: 'R',
      vRms: 230,
      freq: 50,
      firingAngle: 0,
      hasFwd: false,
      r: 20,
      l: 45,
      e: 0
    }
  },
  {
    id: '1ph-scr-rl-45',
    name: '1Φ Controlled Bridge (RL Load, α=45°)',
    category: 'Controlled Converters',
    description: 'Continuous conduction mode showing negative voltage swings due to inductive kickback.',
    params: {
      phase: '1phase',
      rectifierType: 'fullwave',
      deviceType: 'thyristor',
      loadType: 'RL',
      vRms: 230,
      freq: 50,
      firingAngle: 45,
      hasFwd: false,
      r: 20,
      l: 45,
      e: 0
    }
  },
  {
    id: '1ph-scr-fwd',
    name: '1Φ Controlled Bridge + Freewheeling Diode',
    category: 'Controlled Converters',
    description: 'FWD clamps output voltage to 0V during negative cycle, preventing inversion.',
    params: {
      phase: '1phase',
      rectifierType: 'fullwave',
      deviceType: 'thyristor',
      loadType: 'RL',
      vRms: 230,
      freq: 50,
      firingAngle: 60,
      hasFwd: true,
      r: 20,
      l: 60,
      e: 0
    }
  },
  {
    id: '3ph-diode-bridge',
    name: '3Φ 6-Pulse Diode Bridge (Industrial DC)',
    category: 'Three-Phase',
    description: 'Standard heavy industrial converter (6 pulses per cycle, very low 4% ripple).',
    params: {
      phase: '3phase',
      rectifierType: 'fullwave',
      deviceType: 'diode',
      loadType: 'RL',
      vRms: 400,
      freq: 50,
      firingAngle: 0,
      hasFwd: false,
      r: 15,
      l: 40,
      e: 0
    }
  },
  {
    id: '3ph-scr-bridge-30',
    name: '3Φ Controlled Converter (α=30°)',
    category: 'Three-Phase',
    description: 'Phase-controlled 6-pulse Graetz converter with variable DC output voltage.',
    params: {
      phase: '3phase',
      rectifierType: 'fullwave',
      deviceType: 'thyristor',
      loadType: 'RL',
      vRms: 400,
      freq: 50,
      firingAngle: 30,
      hasFwd: false,
      r: 15,
      l: 50,
      e: 0
    }
  },
  {
    id: '1ph-halfwave-diode',
    name: '1Φ Half-Wave Diode Rectifier',
    category: 'Half-Wave',
    description: 'Single diode conducting only during positive half-cycle (31.8% average output).',
    params: {
      phase: '1phase',
      rectifierType: 'halfwave',
      deviceType: 'diode',
      loadType: 'R',
      vRms: 230,
      freq: 50,
      firingAngle: 0,
      hasFwd: false,
      r: 25,
      l: 30,
      e: 0
    }
  },
  {
    id: '1ph-rle-battery',
    name: 'Battery Charger (RLE Load with Back-EMF)',
    category: 'Special Loads',
    description: 'Rectifier charging a battery bank (Back-EMF E = 48V, R = 10 Ω, L = 20 mH).',
    params: {
      phase: '1phase',
      rectifierType: 'fullwave',
      deviceType: 'thyristor',
      loadType: 'RLE',
      vRms: 110,
      freq: 50,
      firingAngle: 30,
      hasFwd: true,
      r: 10,
      l: 20,
      e: 48
    }
  }
];

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Lab Presets & Experiments</h2>
              <p className="text-xs text-slate-400">Load common power electronics benchmark circuits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {PRESETS.map(preset => (
            <div
              key={preset.id}
              onClick={() => {
                onApplyPreset(preset.params);
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {preset.name}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {preset.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{preset.description}</p>
              </div>

              <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/60 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
