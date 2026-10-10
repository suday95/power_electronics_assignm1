import React from 'react';
import { CircuitParams } from '../types';
import { Modal } from './Modal';
import { ArrowRight, Sparkles } from 'lucide-react';

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

const base: CircuitParams = {
  phase: '1phase',
  rectifierType: 'fullwave',
  deviceType: 'thyristor',
  loadType: 'RL',
  vRms: 230,
  freq: 50,
  firingAngle: 45,
  hasFwd: false,
  r: 20,
  l: 100,
  e: 0
};

export const PRESETS: PresetItem[] = [
  {
    id: '1ph-diode-r',
    name: '1Φ Diode Full-Bridge (Resistive)',
    category: 'Single-Phase Diode',
    description: 'Standard 4-diode Graetz bridge with a pure R load (R = 20 Ω). V_dc = 2V_m/π ≈ 207 V.',
    params: { ...base, deviceType: 'diode', loadType: 'R', firingAngle: 0 }
  },
  {
    id: '1ph-scr-rl-45',
    name: '1Φ Controlled Bridge (RL load, α = 45°)',
    category: 'Controlled Converters',
    description: 'Continuous conduction: v_o swings negative between 180° and 225° while the inductor keeps the current flowing. V_dc = (2V_m/π)·cos α.',
    params: { ...base }
  },
  {
    id: '1ph-scr-fwd',
    name: '1Φ Controlled Bridge + Freewheeling Diode (α = 60°)',
    category: 'Controlled Converters',
    description: 'The FWD clamps v_o to 0 V instead of letting it go negative, raising V_dc to (V_m/π)(1 + cos α).',
    params: { ...base, firingAngle: 60, hasFwd: true, l: 60 }
  },
  {
    id: '1ph-semi',
    name: '1Φ Semi-Converter (T1, T3 + D2, D4, α = 45°)',
    category: 'Controlled Converters',
    description: 'Half-controlled bridge: the bridge itself freewheels (T + D on the same leg), so v_o never goes negative.',
    params: { ...base, l: 45, deviceOverrides: { 2: 'diode', 4: 'diode' } }
  },
  {
    id: '3ph-diode-bridge',
    name: '3Φ 6-Pulse Diode Bridge (400 V L-L)',
    category: 'Three-Phase',
    description: 'Industrial 6-pulse rectifier: V_dc = 1.35·V_LL ≈ 540 V with only ≈ 4% ripple at 300 Hz.',
    params: { ...base, phase: '3phase', deviceType: 'diode', vRms: 400, firingAngle: 0, r: 15, l: 40 }
  },
  {
    id: '3ph-scr-bridge-30',
    name: '3Φ Controlled Converter (α = 30°)',
    category: 'Three-Phase',
    description: 'Phase-controlled 6-pulse Graetz converter, V_dc = 1.35·V_LL·cos α ≈ 468 V.',
    params: { ...base, phase: '3phase', vRms: 400, firingAngle: 30, r: 15, l: 50 }
  },
  {
    id: '3ph-halfwave',
    name: '3Φ Half-Wave Diode Rectifier (3-pulse)',
    category: 'Three-Phase',
    description: 'Three diodes to a star point. Each conducts 120°; ripple frequency is 3f = 150 Hz.',
    params: { ...base, phase: '3phase', rectifierType: 'halfwave', deviceType: 'diode', vRms: 400, firingAngle: 0, r: 15, l: 40 }
  },
  {
    id: '1ph-halfwave-diode',
    name: '1Φ Half-Wave Diode Rectifier',
    category: 'Half-Wave',
    description: 'A single diode conducting during the positive half-cycle only: V_dc = V_m/π (31.8% of V_m).',
    params: { ...base, rectifierType: 'halfwave', deviceType: 'diode', loadType: 'R', firingAngle: 0, r: 25 }
  },
  {
    id: '1ph-rle-battery',
    name: 'Battery Charger (RLE load, E = 48 V)',
    category: 'Special Loads',
    description: 'Discontinuous conduction: the thyristors only conduct while v_s > E, and v_o sits at E while the bridge blocks.',
    params: { ...base, loadType: 'RLE', vRms: 110, firingAngle: 30, hasFwd: true, r: 10, l: 20, e: 48 }
  }
];

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, onApplyPreset }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Lab Presets & Experiments"
    subtitle="Load common power electronics benchmark circuits"
    icon={<Sparkles className="w-5 h-5" />}
    widthClass="max-w-2xl"
  >
    <div className="space-y-3">
      {PRESETS.map(preset => (
        <button
          key={preset.id}
          onClick={() => {
            onApplyPreset(preset.params);
            onClose();
          }}
          className="w-full text-left p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 group"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">{preset.name}</span>
              <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">{preset.category}</span>
            </div>
            <p className="text-xs text-slate-400">{preset.description}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/60 transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      ))}
    </div>
  </Modal>
);
