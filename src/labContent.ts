import { CircuitParams } from './types';

export interface Experiment {
  id: string;
  title: string;
  summary: string;
  preset: CircuitParams;
  aim: string;
  apparatus: string[];
  procedure: string[];
  formulas: { name: string; expr: string; note?: string }[];
}

const base: CircuitParams = {
  phase: '1phase',
  rectifierType: 'halfwave',
  deviceType: 'diode',
  loadType: 'R',
  vRms: 230,
  freq: 50,
  firingAngle: 0,
  hasFwd: false,
  r: 50,
  l: 45,
  e: 0
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'exp1',
    title: 'Exp 1: Single-Phase Half-Wave Diode Rectifier',
    summary: 'R and R-L load characteristics, conduction angle, freewheeling diode',
    preset: base,
    aim: 'Observe v_s, v_o and i_o of a single-phase half-wave uncontrolled rectifier with R and RL loads, and determine V_dc, V_rms, ripple factor and efficiency.',
    apparatus: ['Single-phase AC supply (230 V, 50 Hz)', 'Power diode', 'Rheostat (5 Ω – 100 Ω)', 'Variable inductor (5 mH – 200 mH)', 'Oscilloscope and true-RMS multimeter (here: the simulator)'],
    procedure: [
      'Load the preset (1Φ half-wave, diode, R = 50 Ω). Check that the diode conducts for exactly 180° (0 to π).',
      'Press "Record reading" in the Observation Table to log V_dc, V_rms and the ripple factor.',
      'Switch the load to RL (L = 45 mH). Note that v_o goes negative between π and the extinction angle β because the inductor keeps the current flowing.',
      'Compare V_dc with the R-load value: the negative area lowers the average.',
      'Fit the freewheeling diode. v_o is now clamped to 0 V while the current freewheels; record again.'
    ],
    formulas: [
      { name: 'Average output voltage (R load)', expr: 'V_dc = V_m / π ≈ 0.318·V_m' },
      { name: 'RMS output voltage', expr: 'V_rms = V_m / 2' },
      { name: 'Form factor / ripple factor', expr: 'FF = π/2 = 1.57,  RF = √(FF² − 1) = 1.21' },
      { name: 'Rectification efficiency', expr: 'η = V_dc² / V_rms² = 4/π² = 40.5 %' }
    ]
  },
  {
    id: 'exp2',
    title: 'Exp 2: Single-Phase Full-Wave Bridge Diode Rectifier',
    summary: 'Graetz bridge, two-pulse output, effect of load inductance on the supply current',
    preset: { ...base, rectifierType: 'fullwave' },
    aim: 'Study the four-diode bridge, compare its output with the half-wave circuit, and observe how an inductive load changes the supply current waveform.',
    apparatus: ['Single-phase AC supply (230 V, 50 Hz)', 'Four power diodes (bridge)', 'Rheostat', 'Variable inductor', 'Oscilloscope (here: the simulator)'],
    procedure: [
      'Load the preset (full-bridge, diodes, R = 50 Ω). Identify the conducting pairs: D1 + D2 on the positive half, D3 + D4 on the negative half.',
      'Record V_dc, V_rms and RF; compare with the half-wave values.',
      'Switch to RL and increase L from 5 mH to 200 mH. Watch i_o become smoother and i_s approach a square wave.',
      'Open the Harmonics tab and note the supply-current THD and the 2f ripple in v_o.'
    ],
    formulas: [
      { name: 'Average output voltage', expr: 'V_dc = 2·V_m / π ≈ 0.637·V_m' },
      { name: 'RMS output voltage', expr: 'V_rms = V_m / √2' },
      { name: 'Form factor / ripple factor', expr: 'FF = π / (2√2) = 1.11,  RF = 0.483' },
      { name: 'Ripple frequency', expr: 'f_r = 2f = 100 Hz' }
    ]
  },
  {
    id: 'exp3',
    title: 'Exp 3: Single-Phase Half-Wave Controlled Rectifier (SCR)',
    summary: 'Firing angle control and phase-controlled rectification',
    preset: { ...base, deviceType: 'thyristor', firingAngle: 60 },
    aim: 'Control the output of a half-wave rectifier by delaying the gate pulse and verify V_dc = (V_m / 2π)(1 + cos α).',
    apparatus: ['Single-phase AC supply', 'Thyristor with gate-pulse generator', 'Rheostat', 'Variable inductor', 'Oscilloscope (here: the simulator)'],
    procedure: [
      'Load the preset (thyristor, R load, α = 60°). Check the gate pulse at 60° on the Gate row of the scope.',
      'Step α through 0°, 30°, 60°, 90°, 120°, 150° and record V_dc each time. Compare with the Calculated value in the formula panel.',
      'Switch to RL load without FWD: the thyristor keeps conducting past 180° and v_o goes negative.',
      'Add the FWD and repeat: the output is clamped to 0 V and V_dc rises.'
    ],
    formulas: [
      { name: 'Average output voltage (R load or FWD)', expr: 'V_dc = (V_m / 2π)·(1 + cos α)' },
      { name: 'RMS output voltage', expr: 'V_rms = (V_m / 2)·√[1 − α/π + sin 2α / 2π]' },
      { name: 'Conduction angle (R load)', expr: 'γ = π − α' }
    ]
  },
  {
    id: 'exp4',
    title: 'Exp 4: Single-Phase Fully Controlled Bridge Converter',
    summary: 'Continuous and discontinuous conduction, effect of α, FWD and semi-converter',
    preset: { ...base, rectifierType: 'fullwave', deviceType: 'thyristor', loadType: 'RL', firingAngle: 45, l: 100, r: 20 },
    aim: 'Study a fully controlled thyristor bridge with an RL load: continuous versus discontinuous conduction, and compare it with the freewheeling-diode and semi-converter versions.',
    apparatus: ['Single-phase AC supply', 'Four thyristors with gate drive', 'Rheostat and inductor', 'Freewheeling diode', 'Oscilloscope (here: the simulator)'],
    procedure: [
      'Load the preset (T1–T4, RL load, L = 100 mH, α = 45°). The current is continuous and v_o swings negative from 180° to 225°.',
      'Record V_dc and compare with (2V_m/π)·cos α.',
      'Raise α towards 90° and beyond. For α > 90° the ideal V_dc is negative, but a passive RL load cannot return energy, so the current becomes discontinuous (DCM) and the simulator shows V_dc near zero.',
      'Fit the FWD at α = 60°. The negative part of v_o disappears and V_dc follows (V_m/π)(1 + cos α).',
      'Press "Semi-Conv" in Quick Setup (T1, T3 + D2, D4) and notice that v_o stays non-negative without any FWD.'
    ],
    formulas: [
      { name: 'Continuous conduction', expr: 'V_dc = (2·V_m / π)·cos α' },
      { name: 'With FWD, semi-converter or R load', expr: 'V_dc = (V_m / π)·(1 + cos α)' },
      { name: 'Continuous conduction, RMS', expr: 'V_rms = V_m / √2' }
    ]
  },
  {
    id: 'exp5',
    title: 'Exp 5: Three-Phase Half-Wave Rectifier (3-Pulse)',
    summary: 'Phase commutation and 3-pulse ripple',
    preset: { ...base, phase: '3phase', rectifierType: 'halfwave', vRms: 400, r: 15, l: 40 },
    aim: 'Observe the commutation of three diodes (or thyristors) connected to a common cathode and a star neutral, and measure the 3-pulse output.',
    apparatus: ['Three-phase supply (400 V line-to-line, 50 Hz)', 'Three diodes / thyristors', 'Load with neutral return', 'Oscilloscope (here: the simulator)'],
    procedure: [
      'Load the preset (3Φ half-wave, diodes, R = 15 Ω). Identify the natural commutation instants at 30°, 150° and 270°.',
      'Record V_dc, V_rms and RF. Note the ripple frequency 3f = 150 Hz.',
      'Switch to All Thyristors and increase α from 0° to 30° (still continuous), then beyond 30° with an R load, where the output starts to touch zero.',
      'Add the FWD for α > 30° with an RL load and observe the v_o clamp.'
    ],
    formulas: [
      { name: 'Average output voltage (α ≤ 30° or CCM)', expr: 'V_dc = (3√3·V_m / 2π)·cos α ≈ 0.827·V_m·cos α' },
      { name: 'R load / FWD, α > 30°', expr: 'V_dc = (3·V_m / 2π)·[1 + cos(α + 30°)]' },
      { name: 'Ripple', expr: 'f_r = 3f = 150 Hz, RF (diode) ≈ 0.183' }
    ]
  },
  {
    id: 'exp6',
    title: 'Exp 6: Three-Phase Six-Pulse Fully Controlled Bridge',
    summary: 'Industrial Graetz bridge, 300 Hz ripple, firing angle control',
    preset: { ...base, phase: '3phase', rectifierType: 'fullwave', deviceType: 'thyristor', loadType: 'RL', vRms: 400, firingAngle: 30, r: 15, l: 50 },
    aim: 'Study the six-pulse thyristor bridge used in DC drives and HVDC, and verify V_dc = 1.35·V_LL·cos α.',
    apparatus: ['Three-phase supply (400 V L-L, 50 Hz)', 'Six thyristors with gate drive', 'RL load (motor armature equivalent)', 'Oscilloscope (here: the simulator)'],
    procedure: [
      'Load the preset (T1–T6, RL load, α = 30°). Identify the conducting pair in each 60° interval and the gate-pulse sequence T1 … T6.',
      'Record V_dc for α = 0°, 30°, 60°, 90°. Compare with the Calculated value.',
      'Use "All Diodes" and confirm V_dc = 1.35·V_LL ≈ 540 V with ≈ 4.2% ripple at 300 Hz.',
      'Open the Harmonics tab: the supply current contains the 5th, 7th, 11th and 13th harmonics (6k ± 1).'
    ],
    formulas: [
      { name: 'Average output voltage', expr: 'V_dc = (3·V_LL,m / π)·cos α = 1.35·V_LL(rms)·cos α' },
      { name: 'RMS output voltage', expr: 'V_rms = V_LL,m·√[1/2 + (3√3 / 4π)·cos 2α]' },
      { name: 'Ripple', expr: 'f_r = 6f = 300 Hz, RF (diode) = 0.042' }
    ]
  }
];

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    q: 'What is the average output voltage of a single-phase half-wave diode rectifier with a resistive load?',
    options: ['V_m / π', 'V_m / 2', '2·V_m / π', 'V_m / √2'],
    answer: 0,
    why: 'V_dc = (1/2π)∫₀^π V_m sin θ dθ = V_m / π ≈ 0.318·V_m.'
  },
  {
    q: 'What is the ripple frequency of a single-phase full-wave bridge on a 50 Hz supply?',
    options: ['50 Hz', '100 Hz', '150 Hz', '300 Hz'],
    answer: 1,
    why: 'Both half-cycles are rectified, so the output has two pulses per supply cycle: 2f.'
  },
  {
    q: 'Which condition turns a thyristor ON?',
    options: ['Forward bias only', 'Gate pulse only', 'Forward bias and a gate pulse', 'Reverse bias and a gate pulse'],
    answer: 2,
    why: 'A thyristor must be forward biased and receive a gate trigger; it then latches until its current falls to zero.'
  },
  {
    q: 'What is the purpose of the freewheeling diode across an inductive load?',
    options: ['To raise the supply voltage', 'To carry the load current when v_o would go negative', 'To block the gate pulse', 'To reduce the inductance'],
    answer: 1,
    why: 'It provides a path for the inductor current, clamps v_o to 0 V and keeps negative voltage off the load.'
  },
  {
    q: 'For a fully controlled single-phase bridge in continuous conduction, what is V_dc at α = 60°?',
    options: ['0.637·V_m', '0.318·V_m', '0.477·V_m', '0'],
    answer: 1,
    why: 'V_dc = (2V_m/π)·cos 60° = 0.318·V_m. (0.477·V_m is the R-load / FWD value (V_m/π)(1 + cos α).)'
  },
  {
    q: 'What is the ripple factor of a single-phase half-wave rectifier with R load?',
    options: ['0.483', '1.21', '0.042', '0.183'],
    answer: 1,
    why: 'FF = π/2 = 1.57, so RF = √(FF² − 1) = 1.21.'
  },
  {
    q: 'What is the ideal V_dc of a three-phase six-pulse diode bridge in terms of the line-to-line RMS voltage?',
    options: ['0.827·V_LL', '1.17·V_LL', '1.35·V_LL', '1.73·V_LL'],
    answer: 2,
    why: 'V_dc = 3·V_LL,m / π = 3√2/π · V_LL ≈ 1.35·V_LL.'
  },
  {
    q: 'What is the dominant ripple frequency of a six-pulse bridge on a 50 Hz supply?',
    options: ['150 Hz', '300 Hz', '100 Hz', '600 Hz'],
    answer: 1,
    why: 'Six commutations per cycle give a ripple of 6f = 300 Hz.'
  },
  {
    q: 'In a fully controlled converter with continuous conduction, what happens to V_dc when α exceeds 90°?',
    options: ['It stays positive', 'It becomes zero', 'It becomes negative (inversion)', 'It doubles'],
    answer: 2,
    why: 'V_dc = V_dc0·cos α is negative for α > 90°; power can flow back to the supply if the load can source energy.'
  },
  {
    q: 'At which angle does phase A take over conduction in a three-phase half-wave rectifier (α = 0)?',
    options: ['0°', '30°', '60°', '90°'],
    answer: 1,
    why: 'The natural commutation point is 30° after the phase voltage zero crossing, where v_a first exceeds v_c.'
  },
  {
    q: 'Why is the output of a single-phase semi-converter never negative?',
    options: ['It always has a large capacitor', 'A thyristor and a diode on the same leg freewheel the load current', 'The diodes are never forward biased', 'The thyristors are always off'],
    answer: 1,
    why: 'When v_s reverses, the bridge short-circuits the load through one thyristor and one diode, so v_o = 0 instead of negative.'
  },
  {
    q: 'What is the rectification efficiency of a single-phase half-wave rectifier with R load?',
    options: ['81.1 %', '40.5 %', '63.7 %', '100 %'],
    answer: 1,
    why: 'η = V_dc² / V_rms² = (V_m/π)² / (V_m/2)² = 4/π² = 40.5 %.'
  },
  {
    q: 'In an RLE load (battery charger), when can a diode bridge conduct?',
    options: ['At all times', 'Only while |v_s| exceeds the back-EMF E', 'Only at the zero crossing', 'Only when L = 0'],
    answer: 1,
    why: 'With E in the load, current can only flow when the rectified source voltage is larger than E, giving discontinuous conduction for small L.'
  },
  {
    q: 'How many devices conduct at any instant in a three-phase full bridge?',
    options: ['One', 'Two (one top, one bottom)', 'Three', 'Six'],
    answer: 1,
    why: 'One device of the top group (highest phase) and one of the bottom group (lowest phase) carry the load current.'
  }
];
