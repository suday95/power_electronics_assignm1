import React from 'react';
import { Modal } from './Modal';
import { Activity, BookOpen, HelpCircle, Layers, Zap } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Section: React.FC<{ title: string; color: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, color, icon, children }) => (
  <div className="space-y-2">
    <h3 className={`text-sm font-bold flex items-center gap-2 ${color}`}>
      {icon}
      {title}
    </h3>
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs leading-relaxed text-slate-300">{children}</div>
  </div>
);

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Power Electronics Converter Theory & Principles"
    subtitle="Single-phase and three-phase AC-to-DC rectification guide"
    icon={<BookOpen className="w-5 h-5" />}
    footer={
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors">
        Understood
      </button>
    }
  >
    <div className="space-y-6 text-sm">
      <Section title="1. Single-phase rectifier topologies" color="text-cyan-400" icon={<Zap className="w-4 h-4" />}>
        <p>
          <strong className="text-slate-100">Half-wave:</strong> one device conducts during the positive half-cycle. With an R load conduction ends at π. With an RL load the inductor keeps the current flowing past π until the extinction angle β, which drags v_o negative unless a freewheeling diode (FWD) is fitted.
        </p>
        <p>
          <strong className="text-slate-100">Full-wave bridge (Graetz):</strong> T1/T2 conduct while v_s &gt; 0 and T3/T4 while v_s &lt; 0. The ripple frequency doubles to 2f (100 Hz on a 50 Hz supply).
        </p>
        <p>
          <strong className="text-slate-100">Semi-converter:</strong> two thyristors (T1, T3) and two diodes (D2, D4). When the output would go negative, a thyristor and the diode on the same leg conduct together and the load current freewheels through the bridge, so v_o never goes negative.
        </p>
      </Section>

      <Section title="2. Diode (uncontrolled) vs thyristor (controlled)" color="text-amber-400" icon={<Layers className="w-4 h-4" />}>
        <p>
          <strong className="text-slate-100">Diode:</strong> turns on as soon as it is forward biased, so the firing angle is effectively α = 0°. A single-phase bridge gives V_dc = 2V_m/π ≈ 0.637·V_m.
        </p>
        <p>
          <strong className="text-slate-100">Thyristor:</strong> needs forward bias <em>and</em> a gate pulse. Delaying the pulse by α regulates the average output: V_dc = (2V_m/π)·cos α for continuous conduction, which becomes negative for α &gt; 90° (inversion) when the load can return energy.
        </p>
        <p>
          <strong className="text-slate-100">Commutation:</strong> this simulator uses ideal switches (no source inductance), so current transfers between devices instantly, and a device turns off when its current reaches zero.
        </p>
      </Section>

      <Section title="3. Three-phase converters (3-pulse and 6-pulse)" color="text-purple-400" icon={<Activity className="w-4 h-4" />}>
        <p>
          <strong className="text-slate-100">Half-wave (3-pulse):</strong> the phase with the highest voltage conducts. Natural handover points are 30°, 150° and 270°. Ripple frequency is 3f; V_dc = 3√3·V_m/(2π)·cos α.
        </p>
        <p>
          <strong className="text-slate-100">Full bridge (6-pulse):</strong> one device from the top group (highest phase) and one from the bottom group (lowest phase) conduct. There are six 60° intervals per cycle, ripple at 6f (≈ 4.2% for diodes), and
          <span className="block font-mono text-cyan-300 mt-1">V_dc = (3·V_LL,m / π)·cos α = 1.35·V_LL(rms)·cos α</span>
          The supply voltage is specified line-to-line in this simulator.
        </p>
      </Section>

      <Section title="4. Freewheeling diode (FWD)" color="text-emerald-400" icon={<HelpCircle className="w-4 h-4" />}>
        <p>
          With an inductive load, when the rectifier output would go negative the load current commutates to the FWD connected across the load.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li>Clamps v_o at 0 V, removing negative excursions.</li>
          <li>Raises the average output voltage, e.g. V_dc = (V_m/π)(1 + cos α) for a single-phase bridge.</li>
          <li>Takes the load current off the supply during freewheeling, improving the input power factor.</li>
          <li>Has no effect with a purely resistive load (no stored energy) or with a diode bridge (v_o is never negative).</li>
        </ul>
      </Section>
    </div>
  </Modal>
);
