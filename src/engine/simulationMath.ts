import {
  CircuitParams,
  DeviceType,
  GateEvent,
  HarmonicItem,
  PerformanceMetrics,
  SimulationResult,
  WaveformPoint
} from '../types';

/**
 * Time-domain simulator for ideal diode / thyristor rectifiers (instantaneous commutation).
 *
 * The converter is modelled as a "top" device group (common cathode: the highest anode conducts)
 * and a "bottom" device group (common anode: the lowest cathode conducts) feeding one load branch.
 * A state machine tracks which devices conduct, whether the freewheeling diode carries the
 * current, and the exact load current i(t) (exponential integrator for L di/dt = vo - E - R i).
 * The simulation is iterated until the periodic steady state is reached, so continuous (CCM)
 * and discontinuous (DCM) conduction both come out right. Every device can be a diode or a
 * thyristor on its own, which also gives the half-controlled (semi-) converters.
 */

export const STEP_DEG = 0.25;
const STEPS_PER_CYCLE = 360 / STEP_DEG;
const MAX_WARMUP_CYCLES = 120;
const GATE_PULSE_DEG = 6;
const MAX_HARMONIC = 25;
const EPS = 1e-9;
const PHASE_NAMES = ['A', 'B', 'C'];

export const deviceTypeOf = (params: CircuitParams, n: number): DeviceType =>
  params.deviceOverrides?.[n] ?? params.deviceType;

/** Number of switching devices in the topology (1, 3, 4 or 6). */
export const deviceCount = (params: CircuitParams): number =>
  params.phase === '1phase' ? (params.rectifierType === 'halfwave' ? 1 : 4) : params.rectifierType === 'halfwave' ? 3 : 6;

export const deviceNumbers = (params: CircuitParams): number[] =>
  Array.from({ length: deviceCount(params) }, (_, k) => k + 1);

export const hasThyristor = (params: CircuitParams): boolean =>
  deviceNumbers(params).some(n => deviceTypeOf(params, n) === 'thyristor');

interface Device {
  n: number;
  id: string;
  isThyristor: boolean;
  group: 'top' | 'bot';
  node: number;  // index into the node-voltage array
  fire: number;  // gate pulse angle within the cycle (deg)
  win: number;   // how long the gate stays armed (deg)
}

function buildDevices(params: CircuitParams): { devices: Device[]; hasBottom: boolean } {
  const { phase, rectifierType } = params;
  const alpha = params.firingAngle;
  const dev = (n: number, group: 'top' | 'bot', node: number, fire: number, win: number): Device => {
    const isThyristor = deviceTypeOf(params, n) === 'thyristor';
    return {
      n,
      id: `${isThyristor ? 'T' : 'D'}${n}`,
      isThyristor,
      group,
      node,
      fire: (((fire + (isThyristor ? alpha : 0)) % 360) + 360) % 360,
      win: isThyristor ? win : 360
    };
  };

  if (phase === '1phase') {
    // node 0 = line (a), node 1 = neutral (n)
    if (rectifierType === 'halfwave') return { devices: [dev(1, 'top', 0, 0, 180)], hasBottom: false };
    return {
      devices: [
        dev(1, 'top', 0, 0, 180),
        dev(3, 'top', 1, 180, 180),
        dev(2, 'bot', 1, 0, 180),
        dev(4, 'bot', 0, 180, 180)
      ],
      hasBottom: true
    };
  }
  // node 0,1,2 = phases A,B,C. Natural firing points are 30° after the phase zero crossing.
  if (rectifierType === 'halfwave') {
    return {
      devices: [dev(1, 'top', 0, 30, 120), dev(2, 'top', 1, 150, 120), dev(3, 'top', 2, 270, 120)],
      hasBottom: false
    };
  }
  return {
    devices: [
      dev(1, 'top', 0, 30, 120),
      dev(3, 'top', 1, 150, 120),
      dev(5, 'top', 2, 270, 120),
      dev(2, 'bot', 2, 90, 120),
      dev(4, 'bot', 0, 210, 120),
      dev(6, 'bot', 1, 330, 120)
    ],
    hasBottom: true
  };
}

/** Peak phase voltage. 3Φ supply voltage is specified line-to-line. */
export const phasePeak = (params: CircuitParams): number =>
  params.phase === '3phase' ? (params.vRms * Math.SQRT2) / Math.sqrt(3) : params.vRms * Math.SQRT2;

export type ControlMode = 'diode' | 'full' | 'semi' | 'mixed';

export function controlMode(params: CircuitParams): ControlMode {
  const nums = deviceNumbers(params);
  const thy = nums.filter(n => deviceTypeOf(params, n) === 'thyristor');
  if (thy.length === 0) return 'diode';
  if (thy.length === nums.length) return 'full';
  if (nums.length >= 4) {
    const odd = nums.filter(n => n % 2 === 1);
    if (thy.length === odd.length && thy.every(n => n % 2 === 1)) return 'semi';
    if (thy.length === odd.length && thy.every(n => n % 2 === 0)) return 'semi';
  }
  return 'mixed';
}

export interface TheoryInfo {
  value: number | null; // ideal V_dc in volts, null when no closed form applies
  formula: string;      // V_dc expression that applies to the current configuration
  vrms: string;         // matching V_rms expression ('' when not available)
}

const NO_FORM = 'No closed form (discontinuous conduction / back-EMF / mixed bridge) – V_dc = (1/T)∫ v_o dt from the simulation';

/** Ideal closed-form output voltage for the current configuration. */
export function theoryInfo(params: CircuitParams, continuous: boolean): TheoryInfo {
  const { phase, rectifierType, loadType, hasFwd, e } = params;
  const mode = controlMode(params);
  const none: TheoryInfo = { value: null, formula: NO_FORM, vrms: '' };
  if (mode === 'mixed') return none;
  const vm = phasePeak(params);
  const a = mode === 'diode' ? 0 : (params.firingAngle * Math.PI) / 180;
  const inductive = loadType !== 'R';
  const clamp = loadType === 'R' || (hasFwd && inductive);
  const emfFree = loadType !== 'RLE' || e === 0;
  if (!emfFree && !continuous) return none;
  const cosA = Math.cos(a);

  if (phase === '1phase') {
    if (rectifierType === 'halfwave') {
      if (!clamp) return { ...none, formula: 'V_dc = (V_m / 2π)·(cos α − cos β), β = extinction angle (no closed form for β)' };
      return {
        value: (vm / (2 * Math.PI)) * (1 + cosA),
        formula: 'V_dc = (V_m / 2π)·(1 + cos α)',
        vrms: 'V_rms = (V_m / 2)·√[1 − α/π + sin 2α / 2π]'
      };
    }
    if (clamp || mode === 'semi') {
      return {
        value: (vm / Math.PI) * (1 + cosA),
        formula: 'V_dc = (V_m / π)·(1 + cos α)',
        vrms: 'V_rms = V_m·√[(π − α + sin 2α / 2) / 2π]'
      };
    }
    return continuous
      ? { value: ((2 * vm) / Math.PI) * cosA, formula: 'V_dc = (2·V_m / π)·cos α   (continuous conduction)', vrms: 'V_rms = V_m / √2' }
      : none;
  }
  if (rectifierType === 'halfwave') {
    const k = (3 * vm) / (2 * Math.PI);
    if (clamp && a > Math.PI / 6) {
      return {
        value: a + Math.PI / 6 >= Math.PI ? 0 : k * (1 + Math.cos(a + Math.PI / 6)),
        formula: 'V_dc = (3·V_m / 2π)·[1 + cos(α + 30°)]   (α > 30°)',
        vrms: ''
      };
    }
    if (clamp || continuous) {
      return {
        value: k * Math.sqrt(3) * cosA,
        formula: 'V_dc = (3√3·V_m / 2π)·cos α',
        vrms: a <= Math.PI / 6 ? 'V_rms = V_m·√[1/2 + (3√3 / 8π)·cos 2α]' : ''
      };
    }
    return none;
  }
  const vll = Math.sqrt(3) * vm;
  if (mode === 'semi') {
    return continuous || loadType === 'R'
      ? { value: ((3 * vll) / (2 * Math.PI)) * (1 + cosA), formula: 'V_dc = (3·V_LL,m / 2π)·(1 + cos α)', vrms: '' }
      : none;
  }
  const k = (3 * vll) / Math.PI;
  if (clamp && a > Math.PI / 3) {
    return {
      value: a + Math.PI / 3 >= Math.PI ? 0 : k * (1 + Math.cos(a + Math.PI / 3)),
      formula: 'V_dc = (3·V_LL,m / π)·[1 + cos(α + 60°)]   (α > 60°)',
      vrms: ''
    };
  }
  if (clamp || continuous) {
    return {
      value: k * cosA,
      formula: 'V_dc = (3·V_LL,m / π)·cos α',
      vrms: a <= Math.PI / 3 ? 'V_rms = V_LL,m·√[1/2 + (3√3 / 4π)·cos 2α]' : ''
    };
  }
  return none;
}

export const theoreticalVdc = (params: CircuitParams, continuous: boolean): number | null =>
  theoryInfo(params, continuous).value;

export function solveWaveforms(params: CircuitParams, totalCycles: number = 1): SimulationResult {
  const { phase, rectifierType, loadType, freq, hasFwd } = params;
  const vm = phasePeak(params);

  const { devices, hasBottom } = buildDevices(params);
  const tops = devices.filter(d => d.group === 'top');
  const bots = devices.filter(d => d.group === 'bot');
  const anyThyristor = devices.some(d => d.isThyristor);

  const R = Math.max(0.1, params.r);
  const resistive = loadType === 'R';
  const L = Math.max(1e-6, params.l / 1000);
  const E = loadType === 'RLE' ? params.e : 0;
  const fwdActive = hasFwd && !resistive;
  const dt = 1 / freq / STEPS_PER_CYCLE;
  const decay = Math.exp((-R * dt) / L);

  const v = new Float64Array(3);
  const setNodes = (deg: number) => {
    const th = (deg * Math.PI) / 180;
    v[0] = vm * Math.sin(th);
    if (phase === '3phase') {
      v[1] = vm * Math.sin(th - (2 * Math.PI) / 3);
      v[2] = vm * Math.sin(th - (4 * Math.PI) / 3);
    } else {
      v[1] = 0;
    }
  };

  const armed = (d: Device, deg: number) => d.win >= 360 || (((deg - d.fire) % 360) + 360) % 360 < d.win;

  // ---- state machine -------------------------------------------------
  let top: Device | null = null;
  let bot: Device | null = null;
  let on = false;
  let i = 0;

  const turnOff = () => {
    on = false;
    top = null;
    bot = null;
  };

  // Resolves commutation / turn-on for the interval centred at `degMid`.
  const decide = (degMid: number) => {
    setNodes(degMid);
    if (on) {
      let bestT = top!;
      for (const d of tops) if (armed(d, degMid) && v[d.node] > v[bestT.node] + EPS) bestT = d;
      top = bestT;
      if (hasBottom) {
        let bestB = bot!;
        for (const d of bots) if (armed(d, degMid) && v[d.node] < v[bestB.node] - EPS) bestB = d;
        bot = bestB;
      }
    } else {
      let t: Device | null = null;
      for (const d of tops) if (armed(d, degMid) && (!t || v[d.node] > v[t.node])) t = d;
      let b: Device | null = null;
      if (hasBottom) for (const d of bots) if (armed(d, degMid) && (!b || v[d.node] < v[b.node])) b = d;
      if (t && (!hasBottom || b)) {
        const vc = v[t.node] - (b ? v[b.node] : 0);
        const threshold = i > 0 ? 0 : E; // freewheeling current (i>0) pins the load at 0 V
        if (vc > threshold + EPS) {
          top = t;
          bot = b;
          on = true;
        }
      }
    }
    if (on) {
      const vo = v[top!.node] - (bot ? v[bot.node] : 0);
      // Output would go negative: the freewheeling diode takes over (or an R load stops conducting).
      if ((vo < -EPS && (resistive || fwdActive)) || (resistive && vo <= EPS)) turnOff();
    }
  };

  // State that governed the most recent interval (before any end-of-step extinction).
  const gov: { on: boolean; top: Device | null; bot: Device | null } = { on: false, top: null, bot: null };

  const voltageOut = (deg: number, iNow: number): number => {
    if (gov.on) {
      setNodes(deg);
      return v[gov.top!.node] - (gov.bot ? v[gov.bot.node] : 0);
    }
    return iNow > 0 ? 0 : E; // freewheeling diode, or open load terminals sitting at E (0 for R / RL)
  };

  // Advances one step starting at `deg`. Mid-interval values go to `mid` for the metrics.
  const mid = { vo: 0, io: 0 };
  const step = (deg: number) => {
    const degMid = deg + STEP_DEG / 2;
    decide(degMid);
    gov.on = on;
    gov.top = top;
    gov.bot = bot;
    const voMid = voltageOut(degMid, i);
    let iNew: number;
    if (resistive) {
      iNew = on ? voMid / R : 0;
      mid.io = iNew;
    } else {
      iNew = i * decay + ((voMid - E) / R) * (1 - decay);
      if (!on && i <= 0) iNew = 0;
      if (iNew <= 1e-9) {
        iNew = 0;
        turnOff();
      }
      mid.io = (i + iNew) / 2;
    }
    mid.vo = voMid;
    return iNew;
  };

  // ---- warm up to periodic steady state ------------------------------
  const stateKey = () => `${on ? 1 : 0}${top?.id ?? ''}${bot?.id ?? ''}`;
  let prevI = -1;
  let prevKey = '';
  for (let c = 0; c < MAX_WARMUP_CYCLES; c++) {
    for (let n = 0; n < STEPS_PER_CYCLE; n++) i = step(n * STEP_DEG);
    const key = stateKey();
    if (Math.abs(i - prevI) < 1e-7 * Math.max(1, i) && key === prevKey) break;
    prevI = i;
    prevKey = key;
  }

  // ---- record the steady state ---------------------------------------
  const total = STEPS_PER_CYCLE * totalCycles;
  const points: WaveformPoint[] = new Array(total);
  const voM = new Float64Array(STEPS_PER_CYCLE);
  const ioM = new Float64Array(STEPS_PER_CYCLE);
  const isM = new Float64Array(STEPS_PER_CYCLE);
  const vsM = new Float64Array(STEPS_PER_CYCLE);
  let iMin = Infinity;

  const gateEvents: GateEvent[] = [];
  if (anyThyristor) {
    const byAngle = new Map<number, string[]>();
    for (const d of devices) if (d.isThyristor) byAngle.set(d.fire, [...(byAngle.get(d.fire) ?? []), d.id]);
    [...byAngle.entries()].sort((x, y) => x[0] - y[0]).forEach(([deg, ids]) => gateEvents.push({ deg, devices: ids }));
  }

  const describe = (vo: number, iStart: number): string => {
    const { top, bot } = gov;
    if (gov.on) {
      const pair = bot ? `${top!.id} + ${bot.id}` : top!.id;
      if (bot && top!.node === bot.node) return `Freewheeling via ${pair} (v_o = 0)`;
      if (phase === '3phase') {
        const to = bot ? PHASE_NAMES[bot.node] : 'N';
        return `Phase ${PHASE_NAMES[top!.node]}${bot ? '–' + to : ' → neutral'} via ${pair}`;
      }
      const base = bot ? `Pair ${pair} conducting` : `${pair} conducting`;
      return vo < -EPS ? `${base} (negative v_o, inductive hold-on)` : base;
    }
    if (iStart > 0) return 'Freewheeling through D_FW (v_o = 0)';
    if (loadType === 'RLE') return `All devices OFF – load held at E = ${params.e} V`;
    return anyThyristor ? 'All devices OFF – awaiting gate pulse' : 'All devices OFF – blocking';
  };

  for (let n = 0; n < total; n++) {
    const cycleDeg = (n % STEPS_PER_CYCLE) * STEP_DEG;
    const k = n % STEPS_PER_CYCLE;
    const iStart = i;
    const iNew = step(cycleDeg);

    // Sample at the interval start with the state that governs the interval.
    const vo = voltageOut(cycleDeg, iStart);
    const io = resistive ? (gov.on ? vo / R : 0) : iStart;
    setNodes(cycleDeg);
    const vs = v[0];
    const vB = v[1];
    const vC = v[2];
    const sign = gov.on ? (gov.top!.node === 0 ? 1 : 0) - (gov.bot && gov.bot.node === 0 ? 1 : 0) : 0;
    const isVal = sign * io;
    const active: string[] = gov.on ? (gov.bot ? [gov.top!.id, gov.bot.id] : [gov.top!.id]) : iStart > 0 ? ['D_FW'] : [];

    const gateDevices: string[] = [];
    for (const g of gateEvents) {
      const dd = cycleDeg - g.deg;
      if (dd >= 0 && dd < GATE_PULSE_DEG) gateDevices.push(...g.devices);
    }

    points[n] = {
      deg: n * STEP_DEG,
      rad: (n * STEP_DEG * Math.PI) / 180,
      vs,
      vsB: phase === '3phase' ? vB : undefined,
      vsC: phase === '3phase' ? vC : undefined,
      vo,
      is: isVal,
      io,
      gatePulses: gateDevices.length > 0,
      gateDevices,
      activeDevices: active,
      loopDescription: describe(vo, iStart)
    };

    if (n < STEPS_PER_CYCLE) {
      // Mid-interval values: accurate integrals for the metrics and Fourier analysis.
      setNodes(cycleDeg + STEP_DEG / 2);
      voM[k] = mid.vo;
      ioM[k] = mid.io;
      vsM[k] = v[0];
      isM[k] = sign * mid.io;
      iMin = Math.min(iMin, iStart, iNew);
    }
    i = iNew;
  }

  // ---- metrics -------------------------------------------------------
  const nS = STEPS_PER_CYCLE;
  let sVo = 0, sVo2 = 0, sIo = 0, sIo2 = 0, sIs2 = 0, sVs2 = 0, sP = 0;
  for (let k = 0; k < nS; k++) {
    sVo += voM[k];
    sVo2 += voM[k] * voM[k];
    sIo += ioM[k];
    sIo2 += ioM[k] * ioM[k];
    sIs2 += isM[k] * isM[k];
    sVs2 += vsM[k] * vsM[k];
    sP += vsM[k] * isM[k];
  }
  const vAvg = sVo / nS;
  const vRmsOut = Math.sqrt(sVo2 / nS);
  const iAvg = sIo / nS;
  const iRms = Math.sqrt(sIo2 / nS);
  const isRms = Math.sqrt(sIs2 / nS);
  const vsRms = Math.sqrt(sVs2 / nS);

  const formFactor = vAvg > 1e-3 ? vRmsOut / vAvg : 0;
  const rippleFactor = formFactor >= 1 ? Math.sqrt(formFactor * formFactor - 1) : 0;
  const pAc = vRmsOut * iRms;
  const efficiency = pAc > 1e-6 ? Math.min(100, Math.max(0, ((vAvg * iAvg) / pAc) * 100)) : 0;

  // ---- Fourier analysis (peak magnitudes) ----------------------------
  const harmonics: HarmonicItem[] = [];
  let i1 = 0;
  let dpf = 0;
  for (let h = 0; h <= MAX_HARMONIC; h++) {
    let vc = 0, vsn = 0, ic = 0, isn = 0;
    for (let k = 0; k < nS; k++) {
      const th = ((k + 0.5) * STEP_DEG * Math.PI * h) / 180;
      const c = Math.cos(th);
      const s = Math.sin(th);
      vc += voM[k] * c;
      vsn += voM[k] * s;
      ic += isM[k] * c;
      isn += isM[k] * s;
    }
    const f = h === 0 ? 1 / nS : 2 / nS;
    const iMag = Math.hypot(ic * f, isn * f);
    if (h === 1) {
      i1 = iMag;
      dpf = iMag > 1e-9 ? (isn * f) / iMag : 0; // vs = Vm·sin(θ): cos φ1 = sin-coefficient of i_s1 / I1
    }
    harmonics.push({
      harmonic: h,
      order: h === 0 ? 'DC (0)' : `${h}th (${h * freq} Hz)`,
      frequency: h * freq,
      voltageMag: Math.hypot(vc * f, vsn * f),
      voltagePercent: 0,
      currentMag: iMag,
      currentPercent: 0
    });
  }
  const vRef = Math.max(1e-6, ...harmonics.map(h => h.voltageMag));
  const iRef = Math.max(1e-6, ...harmonics.slice(1).map(h => h.currentMag));
  harmonics.forEach(h => {
    h.voltagePercent = (h.voltageMag / vRef) * 100;
    h.currentPercent = (h.currentMag / iRef) * 100;
  });

  const i1Rms = i1 / Math.SQRT2;
  const thdCurrent = i1Rms > 1e-6 ? (Math.sqrt(Math.max(0, isRms * isRms - i1Rms * i1Rms)) / i1Rms) * 100 : 0;
  const powerFactor = vsRms * isRms > 1e-6 ? Math.min(1, Math.max(-1, sP / nS / (vsRms * isRms))) : 0;

  const pulseNumber = phase === '1phase' ? (rectifierType === 'halfwave' ? 1 : 2) : rectifierType === 'halfwave' ? 3 : 6;
  const continuous = resistive ? false : iMin > 1e-6;

  const metrics: PerformanceMetrics = {
    vm,
    vAvg,
    vRms: vRmsOut,
    iAvg,
    iRms,
    rippleFactor,
    formFactor,
    efficiency,
    thdCurrent,
    powerFactor,
    dpf,
    isRms,
    rippleFreq: freq * pulseNumber,
    pulseNumber,
    continuous,
    theoryVdc: theoreticalVdc(params, continuous)
  };

  return { points, metrics, harmonics, gateEvents, stepDeg: STEP_DEG };
}

export type QuickSetup = 'diode' | 'full' | 'semi';

/** Applies "All Diodes" / "All Thyristors" / "Semi-converter" device assignment. */
export function applyQuickSetup(params: CircuitParams, setup: QuickSetup): CircuitParams {
  if (setup === 'diode') return { ...params, deviceType: 'diode', deviceOverrides: {} };
  if (setup === 'full') return { ...params, deviceType: 'thyristor', deviceOverrides: {} };
  const bottom: Record<number, DeviceType> = {};
  deviceNumbers(params).forEach(n => {
    if (n % 2 === 0) bottom[n] = 'diode';
  });
  return { ...params, deviceType: 'thyristor', deviceOverrides: bottom };
}

/** Topology change resets per-device choices to a uniform diode / thyristor bridge. */
export function changeTopology(params: CircuitParams, patch: Partial<CircuitParams>): CircuitParams {
  const mode = controlMode(params);
  return { ...params, ...patch, deviceType: mode === 'diode' ? 'diode' : 'thyristor', deviceOverrides: {} };
}

/** Toggles one device between diode and thyristor. */
export function toggleDevice(params: CircuitParams, n: number): CircuitParams {
  const next: DeviceType = deviceTypeOf(params, n) === 'diode' ? 'thyristor' : 'diode';
  return { ...params, deviceOverrides: { ...params.deviceOverrides, [n]: next } };
}
