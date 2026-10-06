import { CircuitParams, HarmonicItem, PerformanceMetrics, WaveformPoint } from '../types';

export function solveWaveforms(params: CircuitParams, totalCycles: number = 1): {
  points: WaveformPoint[];
  metrics: PerformanceMetrics;
  harmonics: HarmonicItem[];
} {
  const { phase, rectifierType, deviceType, loadType, vRms: supplyVRms, freq, firingAngle, hasFwd, r, l, e } = params;
  const vm = supplyVRms * Math.sqrt(2);
  const omega = 2 * Math.PI * freq;
  const alphaRad = (firingAngle * Math.PI) / 180;
  const effectiveAlpha = deviceType === 'diode' ? 0 : alphaRad;
  const effectiveAlphaDeg = deviceType === 'diode' ? 0 : firingAngle;

  const stepsPerCycle = 360;
  const totalSteps = stepsPerCycle * totalCycles;
  const dt = 1 / (freq * stepsPerCycle);

  // Raw arrays for voltages
  const rawDeg: number[] = [];
  const rawRad: number[] = [];
  const rawVs: number[] = [];
  const rawVsB: number[] = [];
  const rawVsC: number[] = [];
  const rawVo: number[] = [];
  const rawActive: string[][] = [];
  const rawDesc: string[] = [];
  const rawGate: boolean[] = [];

  for (let i = 0; i < totalSteps; i++) {
    const deg = (i * 360) / stepsPerCycle;
    const cycleDeg = deg % 360;
    const cycleRad = (cycleDeg * Math.PI) / 180;
    const rad = (deg * Math.PI) / 180;

    rawDeg.push(deg);
    rawRad.push(rad);

    if (phase === '1phase') {
      const vsVal = vm * Math.sin(cycleRad);
      rawVs.push(vsVal);

      if (rectifierType === 'halfwave') {
        // 1-Phase Half-Wave
        let voVal = 0;
        let activeDevs: string[] = [];
        let desc = 'Blocking (OFF)';
        let gate = false;

        if (deviceType === 'diode') {
          if (cycleDeg >= 0 && cycleDeg < 180) {
            voVal = vsVal;
            activeDevs = ['D1'];
            desc = 'Diode D1 Conducting (+ Half)';
          } else {
            if (hasFwd && loadType !== 'R') {
              voVal = 0;
              activeDevs = ['D_FW'];
              desc = 'Freewheeling through D_FW';
            } else {
              voVal = 0;
              activeDevs = [];
              desc = 'Diode D1 Reverse Biased';
            }
          }
        } else {
          // Thyristor
          const fireDeg = effectiveAlphaDeg;
          gate = Math.abs(cycleDeg - fireDeg) < 3;
          if (loadType === 'R' || hasFwd) {
            if (cycleDeg >= fireDeg && cycleDeg < 180) {
              voVal = vsVal;
              activeDevs = ['T1'];
              desc = `Thyristor T1 Conducting (α = ${effectiveAlphaDeg}°)`;
            } else if (hasFwd && cycleDeg >= 180 && cycleDeg < 360 && loadType !== 'R') {
              voVal = 0;
              activeDevs = ['D_FW'];
              desc = 'Freewheeling through D_FW';
            } else {
              voVal = 0;
              activeDevs = [];
              desc = cycleDeg < fireDeg ? `Awaiting Gate Pulse (α = ${effectiveAlphaDeg}°)` : 'Blocking / Reverse Biased';
            }
          } else {
            // RL without FWD - conduction continues into negative half until extinction or 180 + alpha
            const extDeg = Math.min(360, 180 + Math.min(150, (l * omega / r) * 25));
            if (cycleDeg >= fireDeg && cycleDeg < extDeg) {
              voVal = vsVal;
              activeDevs = ['T1'];
              desc = vsVal >= 0 ? 'T1 Conducting Forward' : 'T1 Conducting Negative Loop (Inductive Pull)';
            } else {
              voVal = 0;
              activeDevs = [];
              desc = 'Blocking (Extinguished)';
            }
          }
        }
        rawVo.push(voVal);
        rawActive.push(activeDevs);
        rawDesc.push(desc);
        rawGate.push(gate);

      } else {
        // 1-Phase Full-Wave Bridge
        let voVal = 0;
        let activeDevs: string[] = [];
        let desc = 'Blocking';
        let gate = false;

        const isDiode = deviceType === 'diode';
        const alpha1 = isDiode ? 0 : effectiveAlphaDeg;
        const alpha2 = isDiode ? 180 : 180 + effectiveAlphaDeg;

        gate = Math.abs(cycleDeg - alpha1) < 3 || Math.abs(cycleDeg - alpha2) < 3;

        if (isDiode) {
          if (cycleDeg >= 0 && cycleDeg < 180) {
            voVal = vsVal;
            activeDevs = ['D1', 'D2'];
            desc = 'Bridge Pair D1 + D2 (Positive Half)';
          } else {
            voVal = -vsVal;
            activeDevs = ['D3', 'D4'];
            desc = 'Bridge Pair D3 + D4 (Negative Half)';
          }
        } else {
          // Fully Controlled Thyristor Bridge
          if (loadType === 'R') {
            if (cycleDeg >= alpha1 && cycleDeg < 180) {
              voVal = vsVal;
              activeDevs = ['T1', 'T2'];
              desc = `Bridge Pair T1 + T2 Active (α = ${alpha1}°)`;
            } else if (cycleDeg >= alpha2 && cycleDeg < 360) {
              voVal = -vsVal;
              activeDevs = ['T3', 'T4'];
              desc = `Bridge Pair T3 + T4 Active (α = ${alpha1}°)`;
            } else {
              voVal = 0;
              activeDevs = [];
              desc = 'Blocking (Awaiting Gate Pulse)';
            }
          } else if (hasFwd) {
            // RL with FWD clamps negative excursion to 0
            if (cycleDeg >= alpha1 && cycleDeg < 180) {
              voVal = vsVal;
              activeDevs = ['T1', 'T2'];
              desc = 'Bridge Pair T1 + T2 Active';
            } else if (cycleDeg >= 180 && cycleDeg < alpha2) {
              voVal = 0;
              activeDevs = ['D_FW'];
              desc = 'Freewheeling through D_FW';
            } else if (cycleDeg >= alpha2 && cycleDeg < 360) {
              voVal = -vsVal;
              activeDevs = ['T3', 'T4'];
              desc = 'Bridge Pair T3 + T4 Active';
            } else {
              voVal = 0;
              activeDevs = ['D_FW'];
              desc = 'Freewheeling through D_FW';
            }
          } else {
            // RL without FWD - Continuous Conduction mode
            if (cycleDeg >= alpha1 && cycleDeg < alpha2) {
              voVal = vsVal;
              activeDevs = ['T1', 'T2'];
              desc = vsVal >= 0 ? 'Pair T1 + T2 (Forward Power)' : 'Pair T1 + T2 (Inverting Inductive Loop)';
            } else {
              voVal = -vsVal;
              activeDevs = ['T3', 'T4'];
              desc = -vsVal >= 0 ? 'Pair T3 + T4 (Forward Power)' : 'Pair T3 + T4 (Inverting Inductive Loop)';
            }
          }
        }

        rawVo.push(voVal);
        rawActive.push(activeDevs);
        rawDesc.push(desc);
        rawGate.push(gate);
      }

    } else {
      // 3-Phase Rectifier
      const va = vm * Math.sin(cycleRad);
      const vb = vm * Math.sin(cycleRad - (2 * Math.PI) / 3);
      const vc = vm * Math.sin(cycleRad - (4 * Math.PI) / 3);
      rawVs.push(va);
      rawVsB.push(vb);
      rawVsC.push(vc);

      if (rectifierType === 'halfwave') {
        // 3-Phase Half-Wave (3-Pulse)
        // Natural commutation points: 30°, 150°, 270°
        const fireOffset = effectiveAlphaDeg;
        const pA_start = (30 + fireOffset) % 360;
        const pB_start = (150 + fireOffset) % 360;
        const pC_start = (270 + fireOffset) % 360;

        const gate = Math.abs(cycleDeg - pA_start) < 3 || Math.abs(cycleDeg - pB_start) < 3 || Math.abs(cycleDeg - pC_start) < 3;
        rawGate.push(gate);

        // Map angle relative to natural firing
        // Normalized angle starting at 30 + fireOffset
        let shiftedDeg = (cycleDeg - 30 - fireOffset + 720) % 360;
        let voVal = 0;
        let activeDevs: string[] = [];
        let desc = '';

        const devPrefix = deviceType === 'diode' ? 'D' : 'T';
        if (shiftedDeg >= 0 && shiftedDeg < 120) {
          voVal = va;
          activeDevs = [`${devPrefix}1`];
          desc = `Phase A Conducting via ${devPrefix}1`;
        } else if (shiftedDeg >= 120 && shiftedDeg < 240) {
          voVal = vb;
          activeDevs = [`${devPrefix}2`];
          desc = `Phase B Conducting via ${devPrefix}2`;
        } else {
          voVal = vc;
          activeDevs = [`${devPrefix}3`];
          desc = `Phase C Conducting via ${devPrefix}3`;
        }

        if (loadType === 'R' && voVal < 0) {
          voVal = 0;
          activeDevs = [];
          desc = 'Discontinuous Conduction (Vo clamped to 0)';
        }

        rawVo.push(voVal);
        rawActive.push(activeDevs);
        rawDesc.push(desc);

      } else {
        // 3-Phase Full-Wave Bridge (6-Pulse Graetz Bridge)
        // Line-to-line voltages:
        const vab = va - vb;
        const vac = va - vc;
        const vbc = vb - vc;
        const vba = vb - va;
        const vca = vc - va;
        const vcb = vc - vb;

        // Commutation intervals every 60 degrees.
        // Natural commutation starts at 60° for vab
        const fireOffset = effectiveAlphaDeg;
        const shiftedDeg = (cycleDeg - 60 - fireOffset + 720) % 360;

        const gate = (shiftedDeg % 60) < 3;
        rawGate.push(gate);

        let voVal = 0;
        let activeDevs: string[] = [];
        let desc = '';
        const pfx = deviceType === 'diode' ? 'D' : 'T';

        if (shiftedDeg >= 0 && shiftedDeg < 60) {
          voVal = vab;
          activeDevs = [`${pfx}1`, `${pfx}6`];
          desc = `Phase A-B via ${pfx}1 + ${pfx}6`;
        } else if (shiftedDeg >= 60 && shiftedDeg < 120) {
          voVal = vac;
          activeDevs = [`${pfx}1`, `${pfx}2`];
          desc = `Phase A-C via ${pfx}1 + ${pfx}2`;
        } else if (shiftedDeg >= 120 && shiftedDeg < 180) {
          voVal = vbc;
          activeDevs = [`${pfx}3`, `${pfx}2`];
          desc = `Phase B-C via ${pfx}3 + ${pfx}2`;
        } else if (shiftedDeg >= 180 && shiftedDeg < 240) {
          voVal = vba;
          activeDevs = [`${pfx}3`, `${pfx}4`];
          desc = `Phase B-A via ${pfx}3 + ${pfx}4`;
        } else if (shiftedDeg >= 240 && shiftedDeg < 300) {
          voVal = vca;
          activeDevs = [`${pfx}5`, `${pfx}4`];
          desc = `Phase C-A via ${pfx}5 + ${pfx}4`;
        } else {
          voVal = vcb;
          activeDevs = [`${pfx}5`, `${pfx}6`];
          desc = `Phase C-B via ${pfx}5 + ${pfx}6`;
        }

        if (loadType === 'R' && voVal < 0) {
          voVal = 0;
          activeDevs = [];
          desc = 'Blocking (Vo Clamped to 0)';
        }

        rawVo.push(voVal);
        rawActive.push(activeDevs);
        rawDesc.push(desc);
      }
    }
  }

  // Calculate load current i_o(t) using periodic steady-state ODE solver
  const rawIo: number[] = new Array(totalSteps).fill(0);
  const rawIs: number[] = new Array(totalSteps).fill(0);

  const L_H = Math.max(0.0001, (loadType === 'R' ? 0 : l) / 1000);
  const R_val = Math.max(0.5, r);
  const E_val = loadType === 'RLE' ? e : 0;

  if (loadType === 'R') {
    for (let i = 0; i < totalSteps; i++) {
      const ioVal = Math.max(0, (rawVo[i] - E_val) / R_val);
      rawIo[i] = ioVal;
    }
  } else {
    // Solve L * di/dt + R * i + E = vo
    // Let's run 4 cycles of Euler/RK4 integration to reach steady state
    let curI = 0;
    const subSteps = 5;
    const subDt = dt / subSteps;
    const warmupSteps = stepsPerCycle * 4;

    for (let step = 0; step < warmupSteps; step++) {
      const idx = step % stepsPerCycle;
      const v = rawVo[idx];
      for (let s = 0; s < subSteps; s++) {
        const di = ((v - E_val - R_val * curI) / L_H) * subDt;
        curI = Math.max(0, curI + di);
      }
    }

    // Now populate actual values
    for (let step = 0; step < totalSteps; step++) {
      const idx = step;
      const v = rawVo[idx];
      for (let s = 0; s < subSteps; s++) {
        const di = ((v - E_val - R_val * curI) / L_H) * subDt;
        curI = Math.max(0, curI + di);
      }
      rawIo[step] = curI;
    }
  }

  // Calculate input current i_s(t)
  for (let i = 0; i < totalSteps; i++) {
    const ioVal = rawIo[i];
    const devs = rawActive[i];

    if (phase === '1phase') {
      if (rectifierType === 'halfwave') {
        if (devs.includes('D1') || devs.includes('T1')) {
          rawIs[i] = ioVal;
        } else {
          rawIs[i] = 0;
        }
      } else {
        // Full Wave Bridge
        if (devs.includes('D1') || devs.includes('T1')) {
          rawIs[i] = ioVal;
        } else if (devs.includes('D3') || devs.includes('T3')) {
          rawIs[i] = -ioVal;
        } else {
          rawIs[i] = 0;
        }
      }
    } else {
      // 3-Phase Phase A current
      if (rectifierType === 'halfwave') {
        rawIs[i] = (devs.includes('D1') || devs.includes('T1')) ? ioVal : 0;
      } else {
        // 6-Pulse Bridge Phase A
        if (devs.includes('D1') || devs.includes('T1')) {
          rawIs[i] = ioVal;
        } else if (devs.includes('D4') || devs.includes('T4')) {
          rawIs[i] = -ioVal;
        } else {
          rawIs[i] = 0;
        }
      }
    }
  }

  // Assemble WaveformPoints
  const points: WaveformPoint[] = [];
  for (let i = 0; i < totalSteps; i++) {
    points.push({
      deg: rawDeg[i],
      rad: rawRad[i],
      vs: rawVs[i],
      vsB: rawVsB[i],
      vsC: rawVsC[i],
      vo: rawVo[i],
      is: rawIs[i],
      io: rawIo[i],
      gatePulses: rawGate[i],
      activeDevices: rawActive[i],
      loopDescription: rawDesc[i]
    });
  }

  // Calculate metrics over first cycle
  const n = stepsPerCycle;
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let sumIsSq = 0;
  let sumPac = 0;

  for (let i = 0; i < n; i++) {
    const vo = rawVo[i];
    const io = rawIo[i];
    const vs = rawVs[i];
    const is = rawIs[i];

    sumVo += vo;
    sumVoSq += vo * vo;
    sumIo += io;
    sumIoSq += io * io;
    sumIsSq += is * is;
    sumPac += vs * is;
  }

  const vAvg = sumVo / n;
  const vRms = Math.sqrt(sumVoSq / n);
  const iAvg = sumIo / n;
  const iRms = Math.sqrt(sumIoSq / n);
  const isRms = Math.sqrt(sumIsSq / n);

  const formFactor = vAvg > 0.001 ? vRms / vAvg : 0;
  const rippleFactor = formFactor >= 1 ? Math.sqrt(Math.max(0, formFactor * formFactor - 1)) : 0;
  const pDc = vAvg * iAvg;
  const pAc = (sumPac / n) > 0 ? (sumPac / n) : (vRms * iRms);
  const efficiency = pAc > 0.001 ? Math.min(100, Math.max(0, (pDc / pAc) * 100)) : 0;

  // Discrete Fourier Transform for Harmonics & THD
  const harmonics: HarmonicItem[] = [];
  let isFundSq = 0;
  let isHarmonicsSq = 0;

  // Compute up to 12th harmonic
  for (let h = 0; h <= 12; h++) {
    let aVo = 0;
    let bVo = 0;
    let aIs = 0;
    let bIs = 0;

    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI * i * h) / n;
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      aVo += rawVo[i] * c;
      bVo += rawVo[i] * s;
      aIs += rawIs[i] * c;
      bIs += rawIs[i] * s;
    }

    const factor = h === 0 ? 1 / n : 2 / n;
    const vMag = Math.sqrt((aVo * factor) ** 2 + (bVo * factor) ** 2);
    const iMag = Math.sqrt((aIs * factor) ** 2 + (bIs * factor) ** 2);

    if (h === 1) {
      isFundSq = (iMag / Math.SQRT2) ** 2;
    } else if (h > 1) {
      isHarmonicsSq += (iMag / Math.SQRT2) ** 2;
    }

    harmonics.push({
      harmonic: h,
      order: h === 0 ? 'DC (0)' : `${h}th (${h * freq} Hz)`,
      frequency: h * freq,
      voltageMag: vMag,
      voltagePercent: 0, // calculated below relative to fundamental or DC
      currentMag: iMag,
      currentPercent: 0
    });
  }

  // Calculate percentages
  const vRef = Math.max(1, harmonics[0].voltageMag);
  const iRef = Math.max(0.1, harmonics[1]?.currentMag || harmonics[0].currentMag);
  harmonics.forEach(h => {
    h.voltagePercent = Math.min(100, (h.voltageMag / vRef) * 100);
    h.currentPercent = Math.min(100, (h.currentMag / iRef) * 100);
  });

  const thdCurrent = isFundSq > 0.0001 ? (Math.sqrt(isHarmonicsSq) / Math.sqrt(isFundSq)) * 100 : 0;
  const powerFactor = (vRms * isRms) > 0.001 ? Math.min(1, Math.max(0, (sumPac / n) / (vRms * isRms))) : 0.9;

  let pulseNumber = 2;
  if (phase === '1phase') {
    pulseNumber = rectifierType === 'halfwave' ? 1 : 2;
  } else {
    pulseNumber = rectifierType === 'halfwave' ? 3 : 6;
  }

  const rippleFreq = freq * pulseNumber;

  const metrics: PerformanceMetrics = {
    vm,
    vAvg,
    vRms,
    iAvg,
    iRms,
    rippleFactor,
    formFactor,
    efficiency,
    thdCurrent,
    powerFactor,
    rippleFreq,
    pulseNumber
  };

  return { points, metrics, harmonics };
}
