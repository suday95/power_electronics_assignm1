export type PhaseType = '1phase' | '3phase';
export type RectifierType = 'fullwave' | 'halfwave';
export type DeviceType = 'diode' | 'thyristor';
export type LoadType = 'R' | 'RL' | 'RLE';

export interface CircuitParams {
  phase: PhaseType;
  rectifierType: RectifierType;
  deviceType: DeviceType;
  loadType: LoadType;
  vRms: number;        // Supply RMS voltage (V), e.g. 230V
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
  is: number;          // Input supply current
  io: number;          // Output load current
  gatePulses: boolean; // True when firing pulse is active
  activeDevices: string[]; // e.g. ['T1', 'T2'] or ['D1'] or ['D_FW']
  loopDescription: string;
}

export interface PerformanceMetrics {
  vm: number;          // Peak supply voltage
  vAvg: number;        // Average DC output voltage
  vRms: number;        // RMS output voltage
  iAvg: number;        // Average load current
  iRms: number;        // RMS load current
  rippleFactor: number;// RF = sqrt((Vrms/Vavg)^2 - 1)
  formFactor: number;  // FF = Vrms / Vavg
  efficiency: number;  // Rectification efficiency eta (%)
  thdCurrent: number;  // Supply current THD (%)
  powerFactor: number; // Approximate input displacement/power factor
  rippleFreq: number;  // Dominant ripple frequency (Hz)
  pulseNumber: number; // 1, 2, 3, or 6 pulse
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
