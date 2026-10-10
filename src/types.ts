export type PhaseType = '1phase' | '3phase';
export type RectifierType = 'fullwave' | 'halfwave';
export type DeviceType = 'diode' | 'thyristor';
export type LoadType = 'R' | 'RL' | 'RLE';

export interface CircuitParams {
  phase: PhaseType;
  rectifierType: RectifierType;
  deviceType: DeviceType;
  deviceOverrides?: Record<number, DeviceType>; // per-device type (keyed by device number) overriding deviceType
  loadType: LoadType;
  vRms: number;        // Supply RMS voltage (V): phase voltage for 1Φ, line-to-line for 3Φ
  freq: number;        // Frequency (Hz), e.g. 50Hz
  firingAngle: number; // Alpha (deg), 0 - 180°
  hasFwd: boolean;     // Freewheeling Diode
  r: number;           // Load resistance (Ohms)
  l: number;           // Load inductance (mH)
  e: number;           // Load DC Back-EMF (V)
}

export interface WaveformPoint {
  deg: number;         // 0 - 360 (or 720)
  rad: number;         // radians
  vs: number;          // Supply voltage (Phase A for 3-phase, or v_s for 1-phase)
  vsB?: number;        // Phase B for 3-phase
  vsC?: number;        // Phase C for 3-phase
  vo: number;          // Output rectified voltage
  is: number;          // Input supply current (phase A for 3-phase)
  io: number;          // Output load current
  gatePulses: boolean; // True when a firing pulse is active
  gateDevices: string[];   // Devices receiving a gate pulse at this instant
  activeDevices: string[]; // e.g. ['T1', 'T2'] or ['D1'] or ['D_FW']
  loopDescription: string;
}

export interface GateEvent {
  deg: number;         // firing instant within one cycle (0 - 360)
  devices: string[];
}

export interface PerformanceMetrics {
  vm: number;          // Peak phase voltage
  vAvg: number;        // Average DC output voltage
  vRms: number;        // RMS output voltage
  iAvg: number;        // Average load current
  iRms: number;        // RMS load current
  rippleFactor: number;// RF = sqrt((Vrms/Vavg)^2 - 1)
  formFactor: number;  // FF = Vrms / Vavg
  efficiency: number;  // Rectification efficiency eta = Pdc / Pac (%)
  thdCurrent: number;  // Supply current THD (%)
  powerFactor: number; // True input power factor
  dpf: number;         // Displacement power factor cos(phi1)
  isRms: number;       // RMS supply (line) current
  rippleFreq: number;  // Dominant ripple frequency (Hz)
  pulseNumber: number; // 1, 2, 3, or 6 pulse
  continuous: boolean; // Load current never reaches zero
  theoryVdc: number | null; // Ideal closed-form V_dc, null when no closed form applies
}

export interface HarmonicItem {
  harmonic: number;
  order: string;
  frequency: number;
  voltageMag: number;
  voltagePercent: number;
  currentMag: number;
  currentPercent: number;
}

export interface SimulationResult {
  points: WaveformPoint[];
  metrics: PerformanceMetrics;
  harmonics: HarmonicItem[];
  gateEvents: GateEvent[];
  stepDeg: number;
}
