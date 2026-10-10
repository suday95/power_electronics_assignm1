// Run with: npm run check:engine
// Compares the time-domain simulation against closed-form results and basic physical invariants.
import { CircuitParams } from '../types';
import { solveWaveforms } from './simulationMath';

const base: CircuitParams = {
  phase: '1phase', rectifierType: 'fullwave', deviceType: 'thyristor', loadType: 'RL',
  vRms: 230, freq: 50, firingAngle: 0, hasFwd: false, r: 20, l: 150, e: 0
};

let failures = 0;
let checked = 0;
const check = (name: string, got: number, want: number, tolPct = 0.6) => {
  checked++;
  const err = Math.abs(got - want) / Math.max(1, Math.abs(want)) * 100;
  if (err > tolPct) {
    failures++;
    console.error(`FAIL ${name}: simulated ${got.toFixed(3)} vs theory ${want.toFixed(3)} (${err.toFixed(2)}%)`);
  }
};

// 1) Every configuration where a closed form exists must match the simulation.
for (const phase of ['1phase', '3phase'] as const)
  for (const rectifierType of ['fullwave', 'halfwave'] as const)
    for (const deviceType of ['diode', 'thyristor'] as const)
      for (const loadType of ['R', 'RL', 'RLE'] as const)
        for (const hasFwd of [false, true])
          for (const alpha of deviceType === 'diode' ? [0] : [0, 30, 45, 60, 90, 120, 150, 180]) {
            const p: CircuitParams = {
              ...base, phase, rectifierType, deviceType, loadType, hasFwd, firingAngle: alpha,
              vRms: phase === '3phase' ? 400 : 230, e: loadType === 'RLE' ? 20 : 0
            };
            const { metrics: m } = solveWaveforms(p);
            if (m.theoryVdc !== null) {
              check(`${phase}/${rectifierType}/${deviceType}/${loadType}/fwd=${hasFwd}/a=${alpha} Vdc`, m.vAvg, m.theoryVdc);
            }
            // Power balance: with ideal switches P_dc = V_avg*I_avg is bounded by source apparent power.
            if (m.iAvg > 0 && m.powerFactor < -1e-6) { failures++; console.error('negative PF', p); }
          }

// 2) Semi-converter (T1,T3 controlled; D2,D4 diodes).
for (const alpha of [0, 45, 90, 135]) {
  const { metrics: m } = solveWaveforms({ ...base, deviceOverrides: { 2: 'diode', 4: 'diode' }, firingAngle: alpha });
  check(`1ph semi a=${alpha}`, m.vAvg, (230 * Math.SQRT2 / Math.PI) * (1 + Math.cos(alpha * Math.PI / 180)));
}

for (const alpha of [0, 60, 120]) {
  const { metrics: m } = solveWaveforms({ ...base, phase: '3phase', vRms: 400, firingAngle: alpha, deviceOverrides: { 2: 'diode', 4: 'diode', 6: 'diode' } });
  check(`3ph semi a=${alpha}`, m.vAvg, (3 * 400 * Math.SQRT2 / (2 * Math.PI)) * (1 + Math.cos(alpha * Math.PI / 180)));
}

// 3) Known textbook numbers.
const d1 = solveWaveforms({ ...base, deviceType: 'diode', loadType: 'R', rectifierType: 'halfwave' }).metrics;
check('1ph half-wave diode Vdc = Vm/pi', d1.vAvg, 230 * Math.SQRT2 / Math.PI);
check('1ph half-wave diode Vrms = Vm/2', d1.vRms, 230 * Math.SQRT2 / 2);
const d3 = solveWaveforms({ ...base, phase: '3phase', vRms: 400, deviceType: 'diode' }).metrics;
check('3ph bridge diode Vdc = 1.35 VLL', d3.vAvg, 1.3505 * 400, 0.3);
check('3ph bridge diode ripple factor 4.2%', d3.rippleFactor, 0.042, 3);
check('3ph bridge diode ripple freq', d3.rippleFreq, 300, 0);

// Supply-side quantities.
const fwR = solveWaveforms({ ...base, deviceType: 'diode', loadType: 'R' }).metrics;
check('bridge diode R: PF = 1', fwR.powerFactor, 1, 0.5);
check('bridge diode R: THD = 0', fwR.thdCurrent, 0, 0.5);
check('half-wave diode R: PF = 1/sqrt2', d1.powerFactor, Math.SQRT1_2, 0.5);
check('half-wave diode R: THD = 100%', d1.thdCurrent, 100, 0.5);
const big = solveWaveforms({ ...base, phase: '3phase', vRms: 400, deviceType: 'diode', l: 200, r: 5 }).metrics;
check('3ph bridge, smooth load: PF = 3/pi', big.powerFactor, 3 / Math.PI, 1);
check('3ph bridge, smooth load: THD = 31%', big.thdCurrent, 31.08, 1.5);

// 4) Periodic steady state: the recorded 2nd cycle equals the 1st.
const two = solveWaveforms(base, 2).points;
const n = two.length / 2;
for (const k of [0, 100, 500, 900, 1300]) check(`periodicity @${k}`, two[n + k].vo, two[k].vo, 0.01);

// 5) Load current never negative, and RLE blocking voltage equals E.
const rle = solveWaveforms({ ...base, loadType: 'RLE', e: 150, firingAngle: 30, l: 5 }).points;
if (rle.some(p => p.io < -1e-9)) { failures++; console.error('negative load current'); }
const blocking = rle.filter(p => p.activeDevices.length === 0);
if (blocking.length && blocking.some(p => Math.abs(p.vo - 150) > 1e-6)) { failures++; console.error('RLE blocking vo != E'); }

console.log(`${checked} numeric checks, ${failures} failure(s)`);
if (failures) process.exit(1);
